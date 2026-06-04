import type { MindMapNode } from "@/types/lesson"
import { getMindMapNodeLayout } from "@/lib/mind-map-node"

const LEVEL_GAP_X = 220
const SIBLING_GAP_Y = 72
const ROOT_X = 120
const ROOT_Y = 80

type TreeNode = {
  node: MindMapNode
  children: TreeNode[]
}

function buildTree(nodes: MindMapNode[]): TreeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, { node: n, children: [] as TreeNode[] }]))
  const roots: TreeNode[] = []
  for (const n of nodes) {
    const entry = byId.get(n.id)!
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId)!.children.push(entry)
    } else {
      roots.push(entry)
    }
  }
  return roots
}

function layoutSubtree(tree: TreeNode, depth: number, yStart: number): { nodes: MindMapNode[]; nextY: number } {
  const layout = getMindMapNodeLayout(tree.node)
  const x = ROOT_X + depth * LEVEL_GAP_X
  let y = yStart

  if (tree.children.length === 0) {
    return {
      nodes: [{ ...tree.node, x, y }],
      nextY: y + layout.totalH + SIBLING_GAP_Y,
    }
  }

  const childResults: MindMapNode[][] = []
  let cursorY = yStart
  for (const child of tree.children) {
    const res = layoutSubtree(child, depth + 1, cursorY)
    childResults.push(res.nodes)
    cursorY = res.nextY
  }

  const firstChildY = childResults[0]?.[0]?.y ?? y
  const lastChild = childResults[childResults.length - 1]
  const lastChildLayout = lastChild
    ? getMindMapNodeLayout(lastChild[lastChild.length - 1])
    : null
  const lastChildY = lastChild ? lastChild[lastChild.length - 1].y + (lastChildLayout?.totalH ?? 0) : y
  const centerY = (firstChildY + lastChildY) / 2 - layout.totalH / 2

  const placed: MindMapNode[] = [{ ...tree.node, x, y: Math.max(yStart, centerY) }]
  for (const group of childResults) {
    placed.push(...group)
  }

  return { nodes: placed, nextY: cursorY }
}

/** ترتيب هرمي أفقي للعقد حسب parentId */
export function autoLayoutMindMapNodes(nodes: MindMapNode[]): MindMapNode[] {
  if (nodes.length === 0) return []
  const roots = buildTree(nodes)
  const out: MindMapNode[] = []
  let y = ROOT_Y
  for (const root of roots) {
    const res = layoutSubtree(root, 0, y)
    out.push(...res.nodes)
    y = res.nextY
  }
  return out
}
