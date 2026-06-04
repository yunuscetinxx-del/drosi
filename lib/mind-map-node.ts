import type { MindMapNode, MindMapNodeRole } from "@/types/lesson"

export const MIND_MAP_NODE_COLORS = [
  { bg: "#3b82f6", border: "#2563eb", glow: "#3b82f640" },
  { bg: "#8b5cf6", border: "#7c3aed", glow: "#8b5cf640" },
  { bg: "#10b981", border: "#059669", glow: "#10b98140" },
  { bg: "#f59e0b", border: "#d97706", glow: "#f59e0b40" },
  { bg: "#ef4444", border: "#dc2626", glow: "#ef444440" },
  { bg: "#06b6d4", border: "#0891b2", glow: "#06b6d440" },
  { bg: "#ec4899", border: "#db2777", glow: "#ec489940" },
  { bg: "#84cc16", border: "#65a30d", glow: "#84cc1640" },
] as const

export function resolveNodeRole(node: MindMapNode): MindMapNodeRole {
  if (node.role === "main" || node.role === "branch") return node.role
  return node.parentId ? "branch" : "main"
}

export function getMindMapColorSet(colorHex: string) {
  return MIND_MAP_NODE_COLORS.find((c) => c.bg === colorHex) ?? MIND_MAP_NODE_COLORS[0]
}

export type MindMapNodeLayout = {
  role: MindMapNodeRole
  bodyW: number
  bodyH: number
  bodyR: number
  noteH: number
  totalH: number
  isPill: boolean
}

const NOTE_GAP = 6
const NOTE_PAD_Y = 6
const NOTE_LINE_H = 15

export function getMindMapNodeLayout(node: MindMapNode): MindMapNodeLayout {
  const role = resolveNodeRole(node)
  const note = node.note?.trim() ?? ""
  let bodyW: number
  let bodyH: number
  let bodyR: number
  let isPill: boolean

  if (role === "main") {
    bodyW = 168
    bodyH = 52
    bodyR = 26
    isPill = true
  } else {
    bodyW = 124
    bodyH = 38
    bodyR = 6
    isPill = false
  }

  let noteH = 0
  if (note) {
    const charsPerLine = Math.max(12, Math.floor(bodyW / 7))
    const lines = Math.min(4, Math.max(1, Math.ceil(note.length / charsPerLine)))
    noteH = NOTE_GAP + NOTE_PAD_Y * 2 + lines * NOTE_LINE_H
  }

  return {
    role,
    bodyW,
    bodyH,
    bodyR,
    noteH,
    totalH: bodyH + noteH,
    isPill,
  }
}

export function getMindMapNodeAnchor(node: MindMapNode) {
  const layout = getMindMapNodeLayout(node)
  return {
    cx: node.x + layout.bodyW / 2,
    cy: node.y + layout.bodyH / 2,
    layout,
  }
}

export function defaultRoleForNewNode(parentId: string | null): MindMapNodeRole {
  return parentId ? "branch" : "main"
}
