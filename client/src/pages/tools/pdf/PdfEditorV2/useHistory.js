import { useCallback, useRef, useState } from 'react'

/**
 * Generic command-pattern undo/redo stack. Callers push a command with
 * `undo`/`redo` closures that mutate whatever external state they own
 * (see useAnnotations.js) — this hook only tracks ordering, it holds no
 * domain state itself, so it stays reusable for non-annotation actions too.
 */
export function useHistory() {
  const undoStack = useRef([])
  const redoStack = useRef([])
  // Stacks live in refs (not state) so push/undo/redo never lag a render
  // behind; this counter just forces canUndo/canRedo to re-render.
  const [, setVersion] = useState(0)
  const bump = () => setVersion((n) => n + 1)

  const record = useCallback((command) => {
    undoStack.current.push(command)
    redoStack.current = []
    bump()
  }, [])

  const undo = useCallback(() => {
    const command = undoStack.current.pop()
    if (!command) return
    command.undo()
    redoStack.current.push(command)
    bump()
  }, [])

  const redo = useCallback(() => {
    const command = redoStack.current.pop()
    if (!command) return
    command.redo()
    undoStack.current.push(command)
    bump()
  }, [])

  const clear = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
    bump()
  }, [])

  return {
    record,
    undo,
    redo,
    clear,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  }
}
