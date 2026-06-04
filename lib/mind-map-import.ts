import type { MindMapNode } from "@/types/lesson"
import { MIND_MAP_NODE_COLORS } from "@/lib/mind-map-node"

const CENTER_X = 700
const CENTER_Y = 400
const BRANCH_RADIUS = 200

const newId = () => Math.random().toString(36).substring(2, 11)

function branchPosition(index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2
  return {
    x: CENTER_X + Math.cos(angle) * BRANCH_RADIUS,
    y: CENTER_Y + Math.sin(angle) * (BRANCH_RADIUS * 0.65),
  }
}

/** عقدة مركزية + فروع من قائمة نصوص */
export function buildMindMapNodesFromTexts(
  centerText: string,
  branches: string[]
): MindMapNode[] {
  const trimmed = branches.map((s) => s.trim()).filter(Boolean)
  if (!centerText.trim() && trimmed.length === 0) return []

  const centerId = newId()
  const nodes: MindMapNode[] = [
    {
      id: centerId,
      text: centerText.trim() || "—",
      x: CENTER_X - 84,
      y: CENTER_Y - 26,
      parentId: null,
      color: MIND_MAP_NODE_COLORS[0].bg,
      role: "main",
      note: "",
      linkedMapId: null,
    },
  ]

  trimmed.forEach((text, i) => {
    const pos = branchPosition(i, trimmed.length)
    nodes.push({
      id: newId(),
      text,
      x: pos.x - 62,
      y: pos.y - 19,
      parentId: centerId,
      color: MIND_MAP_NODE_COLORS[(i + 1) % MIND_MAP_NODE_COLORS.length].bg,
      role: "branch",
      note: "",
      linkedMapId: null,
    })
  })

  return nodes
}

export function buildMindMapNodesFromKeyPoints(
  lessonTitle: string,
  keyPoints: string[]
): MindMapNode[] {
  return buildMindMapNodesFromTexts(lessonTitle, keyPoints)
}

/** يقسّم الملخص إلى جمل/فقرات قصيرة كفروع */
export function buildMindMapNodesFromSummary(
  lessonTitle: string,
  summary: string
): MindMapNode[] {
  const parts = summary
    .split(/[\n.!?؟。]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
    .slice(0, 12)
  return buildMindMapNodesFromTexts(lessonTitle, parts)
}
