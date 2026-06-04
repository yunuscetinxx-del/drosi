import type { MindMap, MindMapNode } from "@/types/lesson"
import { createEmptyMindMap } from "@/lib/mind-maps-utils"

const newId = () => Math.random().toString(36).substring(2, 11)

export function duplicateMindMap(map: MindMap, titleSuffix = " (نسخة)"): MindMap {
  const now = new Date()
  const nodeIdMap = new Map<string, string>()
  for (const n of map.nodes) nodeIdMap.set(n.id, newId())

  const nodes = map.nodes.map((n) => ({
    ...n,
    id: nodeIdMap.get(n.id)!,
    parentId: n.parentId && nodeIdMap.has(n.parentId) ? nodeIdMap.get(n.parentId)! : null,
    linkedMapId: null,
    x: n.x + 40,
    y: n.y + 40,
  }))

  return {
    ...createEmptyMindMap((map.title || "") + titleSuffix, map.folderId ?? null),
    nodes,
    saved: true,
    createdAt: now,
    updatedAt: now,
  }
}

/** نسخ عقدة وجميع أحفادها */
export function duplicateMindMapSubtree(
  nodes: MindMapNode[],
  rootId: string,
  offsetX = 48,
  offsetY = 48
): MindMapNode[] {
  const root = nodes.find((n) => n.id === rootId)
  if (!root) return nodes

  const collectDescendants = (id: string, acc: Set<string>) => {
    acc.add(id)
    for (const n of nodes) {
      if (n.parentId === id) collectDescendants(n.id, acc)
    }
  }

  const subtreeIds = new Set<string>()
  collectDescendants(rootId, subtreeIds)

  const idMap = new Map<string, string>()
  for (const id of subtreeIds) idMap.set(id, newId())

  const clones = nodes
    .filter((n) => subtreeIds.has(n.id))
    .map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      parentId:
        n.id === rootId
          ? n.parentId
          : n.parentId && idMap.has(n.parentId)
            ? idMap.get(n.parentId)!
            : null,
      x: n.x + offsetX,
      y: n.y + offsetY,
      linkedMapId: null,
      linkedImageId: null,
      linkedWordPageId: null,
      linkedKeyPointIndex: null,
    }))

  return [...nodes, ...clones]
}
