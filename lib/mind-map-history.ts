import type { MindMapNode } from "@/types/lesson"

const MAX_HISTORY = 50

export type MindMapHistoryState = {
  past: MindMapNode[][]
  present: MindMapNode[]
  future: MindMapNode[][]
}

function cloneNodes(nodes: MindMapNode[]): MindMapNode[] {
  return nodes.map((n) => ({ ...n }))
}

export function createMindMapHistory(nodes: MindMapNode[]): MindMapHistoryState {
  return { past: [], present: cloneNodes(nodes), future: [] }
}

export function pushMindMapHistory(
  state: MindMapHistoryState,
  nodes: MindMapNode[]
): MindMapHistoryState {
  const next = cloneNodes(nodes)
  if (JSON.stringify(next) === JSON.stringify(state.present)) {
    return state
  }
  const past = [...state.past, state.present].slice(-MAX_HISTORY)
  return { past, present: next, future: [] }
}

export function undoMindMapHistory(
  state: MindMapHistoryState
): MindMapHistoryState | null {
  if (state.past.length === 0) return null
  const previous = state.past[state.past.length - 1]
  const past = state.past.slice(0, -1)
  const future = [state.present, ...state.future].slice(0, MAX_HISTORY)
  return { past, present: cloneNodes(previous), future }
}

export function redoMindMapHistory(
  state: MindMapHistoryState
): MindMapHistoryState | null {
  if (state.future.length === 0) return null
  const next = state.future[0]
  const future = state.future.slice(1)
  const past = [...state.past, state.present].slice(-MAX_HISTORY)
  return { past, present: cloneNodes(next), future }
}

export function canUndoMindMap(state: MindMapHistoryState): boolean {
  return state.past.length > 0
}

export function canRedoMindMap(state: MindMapHistoryState): boolean {
  return state.future.length > 0
}
