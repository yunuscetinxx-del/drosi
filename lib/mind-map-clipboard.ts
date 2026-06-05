import type { MindMapNode } from "@/types/lesson"

const CLIPBOARD_TYPE = "durusi-mindmap-nodes"

export type MindMapClipboardEntry = {
  sourceId: string
  text: string
  x: number
  y: number
  parentId: string | null
  color: string
  role?: MindMapNode["role"]
  note?: string
}

export type MindMapClipboard = {
  nodes: MindMapClipboardEntry[]
  copiedAt: number
}

let clipboard: MindMapClipboard | null = null

const newId = () => Math.random().toString(36).substring(2, 11)

function collectDescendants(nodes: MindMapNode[], rootId: string, acc: Set<string>) {
  acc.add(rootId)
  for (const n of nodes) {
    if (n.parentId === rootId && !acc.has(n.id)) {
      collectDescendants(nodes, n.id, acc)
    }
  }
}

/** نسخ العقد المحددة مع جميع فروعها الفرعية */
export function copyMindMapSelection(
  nodes: MindMapNode[],
  selectedIds: Set<string> | Iterable<string>
): number {
  const roots = [...selectedIds]
  if (roots.length === 0) return 0

  const expanded = new Set<string>()
  for (const id of roots) {
    if (nodes.some((n) => n.id === id)) collectDescendants(nodes, id, expanded)
  }
  if (expanded.size === 0) return 0

  const entries: MindMapClipboardEntry[] = nodes
    .filter((n) => expanded.has(n.id))
    .map((n) => ({
      sourceId: n.id,
      text: n.text,
      x: n.x,
      y: n.y,
      parentId: n.parentId,
      color: n.color,
      role: n.role,
      note: n.note,
    }))

  clipboard = { nodes: entries, copiedAt: Date.now() }
  return entries.length
}

export function getMindMapClipboardCount(): number {
  return clipboard?.nodes.length ?? 0
}

export function hasMindMapClipboard(): boolean {
  return getMindMapClipboardCount() > 0
}

export function serializeMindMapClipboard(): string {
  if (!clipboard) return ""
  return JSON.stringify({ type: CLIPBOARD_TYPE, clipboard })
}

export function tryParseMindMapClipboard(text: string): boolean {
  try {
    const data = JSON.parse(text) as { type?: string; clipboard?: MindMapClipboard }
    if (data.type !== CLIPBOARD_TYPE || !data.clipboard?.nodes?.length) return false
    clipboard = data.clipboard
    return true
  } catch {
    return false
  }
}

/** لصق العقد في خريطة (جديدة أو نفس الخريطة) مع معرّفات جديدة */
export function pasteMindMapClipboard(
  _existingNodes: MindMapNode[],
  opts?: { offsetX?: number; offsetY?: number; anchorX?: number; anchorY?: number }
): MindMapNode[] {
  if (!clipboard?.nodes.length) return []

  const offsetX = opts?.offsetX ?? 48
  const offsetY = opts?.offsetY ?? 48
  const sourceIds = new Set(clipboard.nodes.map((n) => n.sourceId))
  const idMap = new Map<string, string>()
  for (const n of clipboard.nodes) idMap.set(n.sourceId, newId())

  const minX = Math.min(...clipboard.nodes.map((n) => n.x))
  const minY = Math.min(...clipboard.nodes.map((n) => n.y))
  const anchorX = opts?.anchorX ?? minX + offsetX
  const anchorY = opts?.anchorY ?? minY + offsetY

  return clipboard.nodes.map((entry) => {
    const parentInClip =
      entry.parentId && sourceIds.has(entry.parentId)
        ? idMap.get(entry.parentId)!
        : null

    return {
      id: idMap.get(entry.sourceId)!,
      text: entry.text,
      x: entry.x - minX + anchorX,
      y: entry.y - minY + anchorY,
      parentId: parentInClip,
      color: entry.color,
      role: entry.role,
      note: entry.note ?? "",
      linkedMapId: null,
      linkedImageId: null,
      linkedWordPageId: null,
      linkedKeyPointIndex: null,
    }
  })
}
