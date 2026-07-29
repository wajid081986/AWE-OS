import { useCallback, useState } from 'react'
import { useHistory } from './useHistory'

let uidCounter = 0
const nextId = () => `ann_${Date.now().toString(36)}_${(uidCounter++).toString(36)}`

/**
 * Owns annotation state as plain data (never DOM nodes) plus selection and
 * undo/redo. AnnotationLayer.jsx renders this state; it never mutates it
 * directly — every change goes through the actions returned here so it's
 * always captured in history.
 */
export function useAnnotations() {
  const [annotations, setAnnotations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const history = useHistory()

  const addAnnotation = useCallback((partial) => {
    const annotation = { id: nextId(), ...partial }
    setAnnotations((prev) => [...prev, annotation])
    setSelectedId(annotation.id)
    history.record({
      undo: () => setAnnotations((prev) => prev.filter((a) => a.id !== annotation.id)),
      redo: () => setAnnotations((prev) => [...prev, annotation]),
    })
    return annotation.id
  }, [history])

  const updateAnnotation = useCallback((id, changes) => {
    let before = null
    setAnnotations((prev) => prev.map((a) => {
      if (a.id !== id) return a
      before = a
      return { ...a, ...changes }
    }))
    if (!before) return
    const after = { ...before, ...changes }
    history.record({
      undo: () => setAnnotations((prev) => prev.map((a) => (a.id === id ? before : a))),
      redo: () => setAnnotations((prev) => prev.map((a) => (a.id === id ? after : a))),
    })
  }, [history])

  const deleteAnnotation = useCallback((id) => {
    let removed = null
    let removedIndex = -1
    setAnnotations((prev) => {
      removedIndex = prev.findIndex((a) => a.id === id)
      removed = prev[removedIndex] ?? null
      return removedIndex === -1 ? prev : prev.filter((a) => a.id !== id)
    })
    if (!removed) return
    setSelectedId((current) => (current === id ? null : current))
    history.record({
      undo: () => setAnnotations((prev) => {
        const next = prev.slice()
        next.splice(removedIndex, 0, removed)
        return next
      }),
      redo: () => setAnnotations((prev) => prev.filter((a) => a.id !== id)),
    })
  }, [history])

  const deleteSelected = useCallback(() => {
    if (selectedId) deleteAnnotation(selectedId)
  }, [selectedId, deleteAnnotation])

  const selectAnnotation = useCallback((id) => setSelectedId(id), [])
  const clearSelection = useCallback(() => setSelectedId(null), [])

  const getPageAnnotations = useCallback(
    (page) => annotations.filter((a) => a.page === page),
    [annotations],
  )

  const reset = useCallback(() => {
    setAnnotations([])
    setSelectedId(null)
    history.clear()
  }, [history])

  const selected = annotations.find((a) => a.id === selectedId) ?? null

  return {
    annotations,
    getPageAnnotations,
    selected,
    selectedId,
    selectAnnotation,
    clearSelection,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    deleteSelected,
    reset,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
}
