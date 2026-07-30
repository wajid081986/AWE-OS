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

  // Same as addAnnotation, but for multiple annotations created together as
  // one user action (e.g. "cover existing text with a whiteout + drop a
  // pre-filled text box on top") — recorded as a single history entry so one
  // Ctrl+Z undoes the whole action, not just the last piece of it.
  const addAnnotations = useCallback((partials) => {
    const newAnnotations = partials.map((p) => ({ id: nextId(), ...p }))
    const ids = newAnnotations.map((a) => a.id)
    setAnnotations((prev) => [...prev, ...newAnnotations])
    if (ids.length) setSelectedId(ids[ids.length - 1])
    history.record({
      undo: () => setAnnotations((prev) => prev.filter((a) => !ids.includes(a.id))),
      redo: () => setAnnotations((prev) => [...prev, ...newAnnotations]),
    })
    return ids
  }, [history])

  // Reads `annotations` (already-committed state, closed over below) directly
  // rather than mutating an outer variable from inside the setAnnotations
  // updater and reading it back immediately after — that pattern doesn't
  // reliably observe the updater's result before the next line runs (timing
  // depends on React's batching, which isn't something to rely on), and it
  // silently dropped the history record when it didn't: annotations were
  // still deleted, but became un-undoable, with the next Ctrl+Z instead
  // reverting a since-unrelated earlier command. Reproduced and confirmed
  // via docs/batches/batch-35-plan.md's QA pass.
  const updateAnnotation = useCallback((id, changes) => {
    const before = annotations.find((a) => a.id === id)
    if (!before) return
    const after = { ...before, ...changes }
    setAnnotations((prev) => prev.map((a) => (a.id === id ? after : a)))
    history.record({
      undo: () => setAnnotations((prev) => prev.map((a) => (a.id === id ? before : a))),
      redo: () => setAnnotations((prev) => prev.map((a) => (a.id === id ? after : a))),
    })
  }, [annotations, history])

  const deleteAnnotation = useCallback((id) => {
    const removedIndex = annotations.findIndex((a) => a.id === id)
    if (removedIndex === -1) return
    const removed = annotations[removedIndex]
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
    setSelectedId((current) => (current === id ? null : current))
    history.record({
      undo: () => setAnnotations((prev) => {
        const next = prev.slice()
        next.splice(removedIndex, 0, removed)
        return next
      }),
      redo: () => setAnnotations((prev) => prev.filter((a) => a.id !== id)),
    })
  }, [annotations, history])

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
    addAnnotations,
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
