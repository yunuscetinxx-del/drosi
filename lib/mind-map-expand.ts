import type { MindMapNode } from "@/types/lesson"
import { MIND_MAP_NODE_COLORS } from "@/lib/mind-map-node"
import { defaultRoleForNewNode } from "@/lib/mind-map-node"

const newId = () => Math.random().toString(36).substring(2, 11)

/** عقد فرعية حول عقدة موجودة */
export function buildBranchNodesForParent(
  parent: MindMapNode,
  branchTexts: string[]
): MindMapNode[] {
  const trimmed = branchTexts.map((s) => s.trim()).filter(Boolean)
  if (trimmed.length === 0) return []

  return trimmed.map((text, i) => {
    const angle = (i / trimmed.length) * Math.PI * 2
    const dist = 160
    return {
      id: newId(),
      text,
      x: parent.x + Math.cos(angle) * dist,
      y: parent.y + Math.sin(angle) * dist * 0.7,
      parentId: parent.id,
      color: MIND_MAP_NODE_COLORS[(i + 2) % MIND_MAP_NODE_COLORS.length].bg,
      role: defaultRoleForNewNode(parent.id),
      note: "",
      linkedMapId: null,
    }
  })
}
