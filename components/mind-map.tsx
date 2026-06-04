"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  MindMapNode,
  type LessonImage,
  type MindMap,
  type MindMapFolder,
  type WordPage,
} from "@/types/lesson"
import { downloadSvgAsPng } from "@/lib/mind-map-export"
import type { LessonTab } from "@/lib/app-navigation"
import {
  MIND_MAP_NODE_COLORS,
  defaultRoleForNewNode,
  getMindMapColorSet,
  getMindMapNodeAnchor,
  getMindMapNodeLayout,
} from "@/lib/mind-map-node"
import { MindMapNodeMenu, type MindMapContextMenuState } from "@/components/mind-map-node-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ZoomIn, ZoomOut, Maximize2, Hand, MousePointer2, GripVertical, BoxSelect } from "lucide-react"
import { useTranslations } from "@/components/locale-provider"

interface MindMapProps {
  nodes: MindMapNode[]
  allMaps?: MindMap[]
  folders?: MindMapFolder[]
  currentMapId?: string
  lessonTitle?: string
  lessonSubject?: string
  images?: LessonImage[]
  wordPages?: WordPage[]
  keyPoints?: string[]
  nodeSearchQuery?: string
  expandingNodeId?: string | null
  onNavigateToMap?: (mapId: string) => void
  onOpenLessonTab?: (tab: LessonTab) => void
  onExpandNodeAi?: (nodeId: string) => void | Promise<void>
  onDuplicateSubtree?: (nodeId: string) => void
  registerExportPng?: (fn: () => void) => void
  onAddNode: (node: Omit<MindMapNode, "id">) => void
  onUpdateNode: (nodeId: string, updates: Partial<MindMapNode>) => void
  onUpdateNodes?: (updates: Array<{ nodeId: string; patch: Partial<MindMapNode> }>) => void
  onDeleteNode: (nodeId: string) => void
  readonly?: boolean
}

/** مساحة الإحداثيات عند التكبير 1× (أكبر من 900×520 لاستغلال الشاشات العريضة) */
const MAP_BASE_W = 1400
const MAP_BASE_H = Math.round((520 * MAP_BASE_W) / 900)

const TOOLBAR_POS_KEY = "durusi_mindmap_toolbar_pos"

type ConnectingState = { fromId: string } | null
type CanvasTool = "pan" | "select"

function readStoredToolbarPos(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 12, y: 12 }
  try {
    const raw = localStorage.getItem(TOOLBAR_POS_KEY)
    if (!raw) return { x: 12, y: 12 }
    const p = JSON.parse(raw) as { x?: number; y?: number }
    if (typeof p.x === "number" && typeof p.y === "number") return { x: p.x, y: p.y }
  } catch {
    /* ignore */
  }
  return { x: 12, y: 12 }
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (el.isContentEditable) return true
  if (el.closest("[data-radix-popper-content-wrapper]")) return true
  return false
}

type WorldRect = { x: number; y: number; w: number; h: number }
type MarqueeState = { x1: number; y1: number; x2: number; y2: number }

const MARQUEE_MIN_DRAG_PX = 4

function normalizeWorldRect(x1: number, y1: number, x2: number, y2: number): WorldRect {
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  return { x, y, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

function rectsIntersect(a: WorldRect, b: WorldRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function getNodeWorldBounds(node: MindMapNode): WorldRect {
  const layout = getMindMapNodeLayout(node)
  return { x: node.x, y: node.y, w: layout.bodyW, h: layout.totalH }
}

function nodesInMarqueeRect(nodes: MindMapNode[], marquee: MarqueeState): string[] {
  const rect = normalizeWorldRect(marquee.x1, marquee.y1, marquee.x2, marquee.y2)
  return nodes.filter((node) => rectsIntersect(rect, getNodeWorldBounds(node))).map((n) => n.id)
}

function marqueeDraggedEnough(
  marquee: MarqueeState,
  svg: SVGSVGElement,
  viewBox: { w: number; h: number }
): boolean {
  const rect = svg.getBoundingClientRect()
  const dx = (Math.abs(marquee.x2 - marquee.x1) / viewBox.w) * rect.width
  const dy = (Math.abs(marquee.y2 - marquee.y1) / viewBox.h) * rect.height
  return Math.hypot(dx, dy) >= MARQUEE_MIN_DRAG_PX
}

export function MindMap({
  nodes,
  allMaps = [],
  folders = [],
  currentMapId = "",
  lessonTitle = "",
  images = [],
  wordPages = [],
  keyPoints = [],
  nodeSearchQuery = "",
  expandingNodeId = null,
  onNavigateToMap,
  onOpenLessonTab,
  onExpandNodeAi,
  onDuplicateSubtree,
  registerExportPng,
  onAddNode,
  onUpdateNode,
  onUpdateNodes,
  onDeleteNode,
  readonly = false,
}: MindMapProps) {
  const { t } = useTranslations()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapSurfaceRef = useRef<HTMLDivElement>(null)
  const toolbarChromeRef = useRef<HTMLDivElement>(null)
  const [toolbarPos, setToolbarPos] = useState(readStoredToolbarPos)
  const [draggingToolbar, setDraggingToolbar] = useState(false)
  const toolbarDragCtx = useRef<{
    startClientX: number
    startClientY: number
    originX: number
    originY: number
  } | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [draggingOffset, setDraggingOffset] = useState({ x: 0, y: 0 })
  const draggingOffsetRef = useRef(draggingOffset)
  useEffect(() => {
    draggingOffsetRef.current = draggingOffset
  }, [draggingOffset])

  const [panning, setPanning] = useState(false)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: MAP_BASE_W, h: MAP_BASE_H })
  const [zoom, setZoom] = useState(1)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [newNodeText, setNewNodeText] = useState("")
  const [connecting, setConnecting] = useState<ConnectingState>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  /** يد = تحريك اللوحة فقط؛ تحديد = سحب العقد لتغيير موضعها */
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("select")
  /** ضغط مستمر على المسافة = وضع يد مؤقت حتى الرفع، ثم العودة للتحديد */
  const [spaceHeld, setSpaceHeld] = useState(false)
  const spaceHeldRef = useRef(false)
  const pointerInsideMapRef = useRef(false)

  const viewBoxRef = useRef(viewBox)
  const panStartRef = useRef({ x: 0, y: 0 })
  const panningRef = useRef(false)
  const panMoveRafRef = useRef<number | null>(null)
  const pendingPanClientRef = useRef<{ x: number; y: number } | null>(null)

  const dragMoveRafRef = useRef<number | null>(null)
  const pendingDragClientRef = useRef<{ x: number; y: number } | null>(null)
  const draggingRef = useRef<string | null>(null)
  const dragGroupStartsRef = useRef<Record<string, { x: number; y: number }> | null>(null)
  const marqueeActiveRef = useRef(false)
  const marqueeAdditiveRef = useRef(false)
  const marqueeBaseSelectionRef = useRef<Set<string>>(new Set())
  const cancelMarqueeRef = useRef<() => void>(() => {})

  useEffect(() => {
    viewBoxRef.current = viewBox
  }, [viewBox])

  useEffect(() => {
    panningRef.current = panning
  }, [panning])

  useEffect(() => {
    draggingRef.current = dragging
    if (!dragging) {
      setActiveDragIds([])
      dragGroupStartsRef.current = null
    }
  }, [dragging])

  useEffect(() => {
    return () => {
      if (panMoveRafRef.current != null) cancelAnimationFrame(panMoveRafRef.current)
      if (dragMoveRafRef.current != null) cancelAnimationFrame(dragMoveRafRef.current)
    }
  }, [])

  const cancelGestureRafs = useCallback(() => {
    if (panMoveRafRef.current != null) {
      cancelAnimationFrame(panMoveRafRef.current)
      panMoveRafRef.current = null
    }
    pendingPanClientRef.current = null
    if (dragMoveRafRef.current != null) {
      cancelAnimationFrame(dragMoveRafRef.current)
      dragMoveRafRef.current = null
    }
    pendingDragClientRef.current = null
  }, [])

  const applyCanvasTool = useCallback(
    (tool: CanvasTool) => {
      cancelGestureRafs()
      cancelMarqueeRef.current()
      draggingRef.current = null
      setDragging(null)
      setPanning(false)
      setCanvasTool(tool)
    },
    [cancelGestureRafs]
  )

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(() => new Set())
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  const [activeDragIds, setActiveDragIds] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<MindMapContextMenuState>(null)
  const clipboardRef = useRef<Omit<MindMapNode, "id"> | null>(null)

  const primarySelectedId =
    selectedNodeIds.size === 1 ? [...selectedNodeIds][0] ?? null : null

  const cancelMarquee = useCallback(() => {
    marqueeActiveRef.current = false
    setMarquee(null)
  }, [])

  cancelMarqueeRef.current = cancelMarquee

  const applyMarqueeSelection = useCallback(
    (nextMarquee: MarqueeState, additive: boolean) => {
      const hitIds = nodesInMarqueeRect(nodes, nextMarquee)
      if (additive) {
        setSelectedNodeIds(new Set([...marqueeBaseSelectionRef.current, ...hitIds]))
      } else {
        setSelectedNodeIds(new Set(hitIds))
      }
    },
    [nodes]
  )

  const finalizeMarquee = useCallback(
    (additive: boolean) => {
      const current = marquee
      const svg = svgRef.current
      if (!current || !svg) {
        cancelMarquee()
        return
      }

      if (!marqueeDraggedEnough(current, svg, viewBoxRef.current)) {
        if (!additive) setSelectedNodeIds(new Set())
        cancelMarquee()
        return
      }

      applyMarqueeSelection(current, additive)
      cancelMarquee()
    },
    [marquee, cancelMarquee, applyMarqueeSelection]
  )

  useEffect(() => {
    if (!marquee || !marqueeActiveRef.current) return
    applyMarqueeSelection(marquee, marqueeAdditiveRef.current)
  }, [marquee, applyMarqueeSelection])

  useEffect(() => {
    setSelectedNodeIds((prev) => {
      const next = new Set([...prev].filter((id) => nodes.some((n) => n.id === id)))
      return next.size === prev.size ? prev : next
    })
  }, [nodes])

  /** ضغط مستمر على Ctrl/⌘ = وضع تحديد متعدد بدون سحب */
  const [multiSelectHeld, setMultiSelectHeld] = useState(false)
  const multiSelectHeldRef = useRef(false)

  const isMultiSelectModifier = useCallback(
    (e?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) =>
      Boolean(e?.ctrlKey || e?.metaKey || e?.shiftKey || multiSelectHeldRef.current),
    []
  )

  const effectiveCanvasTool: CanvasTool = spaceHeld ? "pan" : canvasTool

  useEffect(() => {
    const mindMapUiActive = () => {
      const root = containerRef.current
      if (!root) return false
      if (pointerInsideMapRef.current) return true
      const ae = document.activeElement
      return ae instanceof Node && root.contains(ae)
    }

    const releaseSpacePan = () => {
      if (!spaceHeldRef.current) return
      spaceHeldRef.current = false
      setSpaceHeld(false)
      applyCanvasTool("select")
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      if (e.repeat) return
      if (isTypingTarget(e.target)) return
      if (!mindMapUiActive()) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      if (spaceHeldRef.current) return
      cancelGestureRafs()
      spaceHeldRef.current = true
      setSpaceHeld(true)
      draggingRef.current = null
      setDragging(null)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      releaseSpacePan()
    }

    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("keyup", onKeyUp, true)
    window.addEventListener("blur", releaseSpacePan)
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("keyup", onKeyUp, true)
      window.removeEventListener("blur", releaseSpacePan)
    }
  }, [applyCanvasTool, cancelGestureRafs])

  useEffect(() => {
    const mindMapUiActive = () => {
      const root = containerRef.current
      if (!root) return false
      if (pointerInsideMapRef.current) return true
      const ae = document.activeElement
      return ae instanceof Node && root.contains(ae)
    }

    const isMultiSelectKey = (e: KeyboardEvent) =>
      e.code === "ControlLeft" ||
      e.code === "ControlRight" ||
      e.code === "MetaLeft" ||
      e.code === "MetaRight"

    const releaseMultiSelect = () => {
      if (!multiSelectHeldRef.current) return
      multiSelectHeldRef.current = false
      setMultiSelectHeld(false)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isMultiSelectKey(e)) return
      if (e.repeat) return
      if (isTypingTarget(e.target)) return
      if (!mindMapUiActive()) return
      multiSelectHeldRef.current = true
      setMultiSelectHeld(true)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isMultiSelectKey(e)) return
      releaseMultiSelect()
    }

    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("keyup", onKeyUp, true)
    window.addEventListener("blur", releaseMultiSelect)
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("keyup", onKeyUp, true)
      window.removeEventListener("blur", releaseMultiSelect)
    }
  }, [])

  useEffect(() => {
    if (!draggingToolbar) return
    const clamp = (x: number, y: number) => {
      const surface = mapSurfaceRef.current
      const bar = toolbarChromeRef.current
      if (!surface || !bar) return { x, y }
      const pad = 6
      const w = bar.offsetWidth
      const h = bar.offsetHeight
      const maxX = Math.max(pad, surface.clientWidth - w - pad)
      const maxY = Math.max(pad, surface.clientHeight - h - pad)
      return {
        x: Math.min(Math.max(pad, x), maxX),
        y: Math.min(Math.max(pad, y), maxY),
      }
    }
    const onMove = (e: PointerEvent) => {
      const d = toolbarDragCtx.current
      if (!d) return
      const nx = d.originX + (e.clientX - d.startClientX)
      const ny = d.originY + (e.clientY - d.startClientY)
      setToolbarPos(clamp(nx, ny))
    }
    const onUp = () => {
      toolbarDragCtx.current = null
      setDraggingToolbar(false)
      setToolbarPos((p) => {
        const c = clamp(p.x, p.y)
        try {
          localStorage.setItem(TOOLBAR_POS_KEY, JSON.stringify(c))
        } catch {
          /* ignore */
        }
        return c
      })
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [draggingToolbar])

  const handleToolbarGripPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      toolbarDragCtx.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        originX: toolbarPos.x,
        originY: toolbarPos.y,
      }
      setDraggingToolbar(true)
    },
    [toolbarPos]
  )

  // Zoom helpers
  const handleZoomIn = () => {
    setZoom((z) => {
      const nz = Math.min(z * 1.25, 3)
      setViewBox((vb) => ({ ...vb, w: MAP_BASE_W / nz, h: MAP_BASE_H / nz }))
      return nz
    })
  }
  const handleZoomOut = () => {
    setZoom((z) => {
      const nz = Math.max(z / 1.25, 0.3)
      setViewBox((vb) => ({ ...vb, w: MAP_BASE_W / nz, h: MAP_BASE_H / nz }))
      return nz
    })
  }
  const handleReset = () => {
    setZoom(1)
    setViewBox({ x: 0, y: 0, w: MAP_BASE_W, h: MAP_BASE_H })
  }

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      setZoom((z) => {
        const nz = Math.max(0.3, Math.min(3, z * factor))
        setViewBox((vb) => {
          const svg = svgRef.current
          if (!svg) return vb
          const rect = svg.getBoundingClientRect()
          const mx = ((e.clientX - rect.left) / rect.width) * vb.w + vb.x
          const my = ((e.clientY - rect.top) / rect.height) * vb.h + vb.y
          const nw = MAP_BASE_W / nz
          const nh = MAP_BASE_H / nz
          return {
            x: mx - (mx - vb.x) * (nw / vb.w),
            y: my - (my - vb.y) * (nh / vb.h),
            w: nw,
            h: nh,
          }
        })
        return nz
      })
    },
    []
  )

  const svgToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      return {
        x: ((clientX - rect.left) / rect.width) * viewBox.w + viewBox.x,
        y: ((clientY - rect.top) / rect.height) * viewBox.h + viewBox.y,
      }
    },
    [viewBox]
  )

  const svgToWorldFromRef = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const vb = viewBoxRef.current
    return {
      x: ((clientX - rect.left) / rect.width) * vb.w + vb.x,
      y: ((clientY - rect.top) / rect.height) * vb.h + vb.y,
    }
  }, [])

  const flushPanMove = useCallback(() => {
    panMoveRafRef.current = null
    const pt = pendingPanClientRef.current
    if (!pt) return
    pendingPanClientRef.current = null
    const svg = svgRef.current
    if (!svg) return
    const cw = Math.max(svg.clientWidth, 1)
    const ch = Math.max(svg.clientHeight, 1)
    const v = viewBoxRef.current
    const dx = ((pt.x - panStartRef.current.x) / cw) * v.w
    const dy = ((pt.y - panStartRef.current.y) / ch) * v.h
    panStartRef.current = { x: pt.x, y: pt.y }
    const nv = { ...v, x: v.x - dx, y: v.y - dy }
    viewBoxRef.current = nv
    setViewBox(nv)
  }, [])

  const handleMouseUpRef = useRef<() => void>(() => {})

  const applyNodeUpdates = useCallback(
    (updates: Array<{ nodeId: string; patch: Partial<MindMapNode> }>) => {
      if (updates.length === 0) return
      if (onUpdateNodes) {
        onUpdateNodes(updates)
        return
      }
      for (const { nodeId, patch } of updates) {
        onUpdateNode(nodeId, patch)
      }
    },
    [onUpdateNode, onUpdateNodes]
  )

  const computeDragUpdates = useCallback(
    (dragId: string, worldX: number, worldY: number, offset: { x: number; y: number }) => {
      const primaryNewX = worldX - offset.x
      const primaryNewY = worldY - offset.y
      const starts = dragGroupStartsRef.current
      if (starts && Object.keys(starts).length > 1) {
        const primaryStart = starts[dragId]
        if (!primaryStart) return null
        const dx = primaryNewX - primaryStart.x
        const dy = primaryNewY - primaryStart.y
        return Object.entries(starts).map(([id, start]) => ({
          nodeId: id,
          patch: { x: start.x + dx, y: start.y + dy },
        }))
      }
      return [{ nodeId: dragId, patch: { x: primaryNewX, y: primaryNewY } }]
    },
    []
  )

  const flushDragMove = useCallback(() => {
    dragMoveRafRef.current = null
    const pt = pendingDragClientRef.current
    const dragId = draggingRef.current
    if (!pt || !dragId) return
    pendingDragClientRef.current = null
    const world = svgToWorldFromRef(pt.x, pt.y)
    const off = draggingOffsetRef.current
    const updates = computeDragUpdates(dragId, world.x, world.y, off)
    if (updates) applyNodeUpdates(updates)
  }, [applyNodeUpdates, computeDragUpdates, svgToWorldFromRef])

  // Node drag: always from the node body (even in «يد» mode); canvas pan only from empty background
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      if (readonly) return
      if (connecting) return
      if (editingNode === nodeId) return

      const mod = isMultiSelectModifier(e)
      if (mod) {
        setSelectedNodeIds((prev) => {
          const next = new Set(prev)
          if (next.has(nodeId)) next.delete(nodeId)
          else next.add(nodeId)
          return next
        })
        return
      }

      let nextSelected: Set<string>
      if (selectedNodeIds.has(nodeId)) {
        nextSelected = new Set(selectedNodeIds)
      } else {
        nextSelected = new Set([nodeId])
      }
      setSelectedNodeIds(nextSelected)

      const dragIds = nextSelected.has(nodeId) ? [...nextSelected] : [nodeId]
      const starts: Record<string, { x: number; y: number }> = {}
      for (const id of dragIds) {
        const n = nodes.find((x) => x.id === id)
        if (n) starts[id] = { x: n.x, y: n.y }
      }
      dragGroupStartsRef.current = starts
      setActiveDragIds(dragIds)

      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return
      const world = svgToWorld(e.clientX, e.clientY)
      const offset = { x: world.x - node.x, y: world.y - node.y }
      draggingOffsetRef.current = offset
      draggingRef.current = nodeId
      setDraggingOffset(offset)
      setDragging(nodeId)
    },
    [nodes, readonly, connecting, svgToWorld, editingNode, selectedNodeIds, isMultiSelectModifier]
  )

  // Canvas pan or marquee select on empty background
  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (draggingRef.current) return
      if (connecting) {
        setConnecting(null)
        return
      }
      if (effectiveCanvasTool === "select" && !readonly) {
        const additive = isMultiSelectModifier(e)
        marqueeAdditiveRef.current = additive
        if (additive) {
          marqueeBaseSelectionRef.current = new Set(selectedNodeIds)
        }
        const world = svgToWorld(e.clientX, e.clientY)
        marqueeActiveRef.current = true
        setMarquee({ x1: world.x, y1: world.y, x2: world.x, y2: world.y })
        return
      }
      panStartRef.current = { x: e.clientX, y: e.clientY }
      setPanning(true)
    },
    [connecting, readonly, effectiveCanvasTool, isMultiSelectModifier, selectedNodeIds, svgToWorld]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (marqueeActiveRef.current) {
        const world = svgToWorld(e.clientX, e.clientY)
        setMarquee((prev) => (prev ? { ...prev, x2: world.x, y2: world.y } : null))
        return
      }
      if (draggingRef.current) {
        pendingDragClientRef.current = { x: e.clientX, y: e.clientY }
        if (dragMoveRafRef.current == null) {
          dragMoveRafRef.current = requestAnimationFrame(flushDragMove)
        }
        return
      }
      if (panning) {
        pendingPanClientRef.current = { x: e.clientX, y: e.clientY }
        if (panMoveRafRef.current == null) {
          panMoveRafRef.current = requestAnimationFrame(flushPanMove)
        }
      }
    },
    [panning, flushDragMove, flushPanMove, svgToWorld]
  )

  const handleMouseUp = useCallback(() => {
    if (marqueeActiveRef.current) {
      finalizeMarquee(marqueeAdditiveRef.current)
      setPanning(false)
      return
    }

    if (panMoveRafRef.current != null) {
      cancelAnimationFrame(panMoveRafRef.current)
      panMoveRafRef.current = null
    }
    if (pendingPanClientRef.current && panningRef.current) {
      const pt = pendingPanClientRef.current
      pendingPanClientRef.current = null
      const svg = svgRef.current
      if (svg) {
        const cw = Math.max(svg.clientWidth, 1)
        const ch = Math.max(svg.clientHeight, 1)
        const v = viewBoxRef.current
        const dx = ((pt.x - panStartRef.current.x) / cw) * v.w
        const dy = ((pt.y - panStartRef.current.y) / ch) * v.h
        const nv = { ...v, x: v.x - dx, y: v.y - dy }
        viewBoxRef.current = nv
        setViewBox(nv)
      }
    } else {
      pendingPanClientRef.current = null
    }

    if (dragMoveRafRef.current != null) {
      cancelAnimationFrame(dragMoveRafRef.current)
      dragMoveRafRef.current = null
    }
    if (pendingDragClientRef.current && draggingRef.current) {
      const pt = pendingDragClientRef.current
      pendingDragClientRef.current = null
      const id = draggingRef.current
      const world = svgToWorldFromRef(pt.x, pt.y)
      const off = draggingOffsetRef.current
      const updates = computeDragUpdates(id, world.x, world.y, off)
      if (updates) applyNodeUpdates(updates)
    } else {
      pendingDragClientRef.current = null
    }

    dragGroupStartsRef.current = null
    draggingRef.current = null
    setActiveDragIds([])
    setDragging(null)
    setPanning(false)
  }, [applyNodeUpdates, computeDragUpdates, svgToWorldFromRef, finalizeMarquee])

  handleMouseUpRef.current = handleMouseUp

  useEffect(() => {
    if (!marquee) return
    const onWindowMove = (ev: MouseEvent) => {
      if (!marqueeActiveRef.current) return
      const world = svgToWorldFromRef(ev.clientX, ev.clientY)
      setMarquee((prev) => (prev ? { ...prev, x2: world.x, y2: world.y } : null))
    }
    const onWindowUp = () => {
      handleMouseUpRef.current()
    }
    window.addEventListener("mousemove", onWindowMove)
    window.addEventListener("mouseup", onWindowUp)
    return () => {
      window.removeEventListener("mousemove", onWindowMove)
      window.removeEventListener("mouseup", onWindowUp)
    }
  }, [marquee, svgToWorldFromRef])

  useEffect(() => {
    if (!dragging) return
    const onWindowMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return
      pendingDragClientRef.current = { x: ev.clientX, y: ev.clientY }
      if (dragMoveRafRef.current == null) {
        dragMoveRafRef.current = requestAnimationFrame(flushDragMove)
      }
    }
    const onWindowUp = () => {
      handleMouseUpRef.current()
    }
    window.addEventListener("mousemove", onWindowMove)
    window.addEventListener("mouseup", onWindowUp)
    return () => {
      window.removeEventListener("mousemove", onWindowMove)
      window.removeEventListener("mouseup", onWindowUp)
    }
  }, [dragging, flushDragMove])

  const handleConnectClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      const self = nodes.find((x) => x.id === nodeId)
      if (e.shiftKey && self?.parentId) {
        onUpdateNode(nodeId, { parentId: null })
        setConnecting(null)
        return
      }
      if (!connecting) {
        setConnecting({ fromId: nodeId })
        return
      }
      if (connecting.fromId === nodeId) {
        setConnecting(null)
        return
      }
      // set parentId on the target node
      onUpdateNode(nodeId, { parentId: connecting.fromId })
      setConnecting(null)
    },
    [connecting, onUpdateNode, nodes]
  )

  const handleUnlinkParent = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      const n = nodes.find((x) => x.id === nodeId)
      if (!n?.parentId) return
      onUpdateNode(nodeId, { parentId: null })
      setConnecting(null)
    },
    [nodes, onUpdateNode]
  )

  const handleAddNode = useCallback(() => {
    const text = newNodeText.trim() || t("mindMap.newNode")
    const color = MIND_MAP_NODE_COLORS[Math.floor(Math.random() * MIND_MAP_NODE_COLORS.length)]
    const parentId = null
    onAddNode({
      text,
      x: viewBox.x + viewBox.w / 2 + (Math.random() - 0.5) * 200,
      y: viewBox.y + viewBox.h / 2 + (Math.random() - 0.5) * 150,
      parentId,
      color: color.bg,
      role: defaultRoleForNewNode(parentId),
      note: "",
    })
    setNewNodeText("")
  }, [newNodeText, viewBox, onAddNode, t])

  const handleAddChildNode = useCallback(
    (parentId: string) => {
      const parent = nodes.find((n) => n.id === parentId)
      if (!parent) return
      const color = MIND_MAP_NODE_COLORS[Math.floor(Math.random() * MIND_MAP_NODE_COLORS.length)]
      const angle = Math.random() * Math.PI * 2
      const dist = 150 + Math.random() * 50
      onAddNode({
        text: t("mindMap.newNode"),
        x: parent.x + Math.cos(angle) * dist,
        y: parent.y + Math.sin(angle) * dist,
        parentId,
        color: color.bg,
        role: "branch",
        note: "",
      })
    },
    [nodes, onAddNode, t]
  )

  const handleAddSiblingNode = useCallback(
    (nodeId: string) => {
      const ref = nodes.find((n) => n.id === nodeId)
      if (!ref) return
      const color = MIND_MAP_NODE_COLORS[Math.floor(Math.random() * MIND_MAP_NODE_COLORS.length)]
      onAddNode({
        text: t("mindMap.newNode"),
        x: ref.x + 140,
        y: ref.y + (Math.random() - 0.5) * 80,
        parentId: ref.parentId,
        color: color.bg,
        role: defaultRoleForNewNode(ref.parentId),
        note: "",
      })
    },
    [nodes, onAddNode, t]
  )

  const handleAddNodeAt = useCallback(
    (worldX: number, worldY: number, role: "main" | "branch") => {
      const color = MIND_MAP_NODE_COLORS[Math.floor(Math.random() * MIND_MAP_NODE_COLORS.length)]
      const bodyW = role === "main" ? 168 : 124
      const bodyH = role === "main" ? 52 : 38
      onAddNode({
        text: role === "main" ? t("mindMap.newMainSection") : t("mindMap.newNode"),
        x: worldX - bodyW / 2,
        y: worldY - bodyH / 2,
        parentId: null,
        color: color.bg,
        role,
        note: "",
      })
    },
    [onAddNode, t]
  )

  const handleExportPng = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    const name = (lessonTitle || "mind-map").replace(/[^\w\u0600-\u06FF-]+/g, "_").slice(0, 40)
    void downloadSvgAsPng(svg, `${name}.png`, viewBox)
  }, [lessonTitle, viewBox])

  useEffect(() => {
    registerExportPng?.(handleExportPng)
    return () => registerExportPng?.(() => {})
  }, [registerExportPng, handleExportPng])

  const searchLower = nodeSearchQuery.trim().toLowerCase()
  const searchMatchIds = useMemo(() => {
    if (!searchLower) return new Set<string>()
    return new Set(
      nodes
        .filter(
          (n) =>
            n.text.toLowerCase().includes(searchLower) ||
            (n.note ?? "").toLowerCase().includes(searchLower)
        )
        .map((n) => n.id)
    )
  }, [nodes, searchLower])

  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (readonly) return
      setSelectedNodeIds(new Set([nodeId]))
      setContextMenu({ nodeId, clientX: e.clientX, clientY: e.clientY })
    },
    [readonly]
  )

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (readonly) return
      const world = svgToWorld(e.clientX, e.clientY)
      setContextMenu({
        clientX: e.clientX,
        clientY: e.clientY,
        worldX: world.x,
        worldY: world.y,
      })
    },
    [readonly, svgToWorld]
  )

  // Bezier edge path (نقاط الربط = مركز جسم العقدة)
  const edgePath = (fromX: number, fromY: number, toX: number, toY: number) => {
    const dx = toX - fromX
    const mx = fromX + dx * 0.5
    return `M ${fromX} ${fromY} C ${mx} ${fromY}, ${mx} ${toY}, ${toX} ${toY}`
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readonly) return
      if (isTypingTarget(e.target)) return
      if (e.code === "Space") return

      const mod = e.ctrlKey || e.metaKey

      if (mod && e.code === "KeyA") {
        if (nodes.length === 0) return
        setSelectedNodeIds(new Set(nodes.map((n) => n.id)))
        e.preventDefault()
        return
      }

      if (mod && e.code === "KeyC") {
        if (!primarySelectedId) return
        const n = nodes.find((x) => x.id === primarySelectedId)
        if (!n) return
        clipboardRef.current = {
          text: n.text,
          x: n.x,
          y: n.y,
          parentId: n.parentId,
          color: n.color,
          role: n.role,
          note: n.note,
          linkedMapId: n.linkedMapId ?? null,
        }
        e.preventDefault()
        void navigator.clipboard
          .writeText(JSON.stringify({ type: "durusi-mindmap-node", node: clipboardRef.current }))
          .catch(() => {})
        return
      }

      if (mod && e.code === "KeyV") {
        const clip = clipboardRef.current
        if (!clip) return
        onAddNode({
          text: clip.text,
          x: clip.x + 28,
          y: clip.y + 28,
          parentId: null,
          color: clip.color,
          role: clip.role ?? defaultRoleForNewNode(null),
          note: clip.note ?? "",
          linkedMapId: null,
        })
        e.preventDefault()
        return
      }

      if (mod || e.altKey) return

      const t = e.target as HTMLElement
      if (t.tagName === "BUTTON") return

      if (e.code === "KeyV") {
        applyCanvasTool("select")
        e.preventDefault()
        return
      }
      if (e.code === "KeyD") {
        applyCanvasTool("pan")
        e.preventDefault()
        return
      }

      if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedNodeIds.size === 0) return
        for (const id of selectedNodeIds) onDeleteNode(id)
        setSelectedNodeIds(new Set())
        setEditingNode(null)
        e.preventDefault()
        return
      }

      if (e.code === "F2" && primarySelectedId) {
        setEditingNode(primarySelectedId)
        e.preventDefault()
        return
      }

      if (e.code === "Enter" && primarySelectedId) {
        handleAddSiblingNode(primarySelectedId)
        e.preventDefault()
        return
      }

      if (e.code === "Tab" && primarySelectedId) {
        e.preventDefault()
        handleAddChildNode(primarySelectedId)
        return
      }
    },
    [
      readonly,
      primarySelectedId,
      nodes,
      onAddNode,
      onDeleteNode,
      applyCanvasTool,
      selectedNodeIds,
      handleAddSiblingNode,
      handleAddChildNode,
    ]
  )

  const handleSelectAllNodes = useCallback(() => {
    if (readonly || nodes.length === 0) return
    setSelectedNodeIds(new Set(nodes.map((n) => n.id)))
  }, [readonly, nodes])

  return (
    <div
      ref={containerRef}
      tabIndex={readonly ? undefined : -1}
      className="flex h-full min-h-0 flex-col gap-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onPointerEnter={() => {
        pointerInsideMapRef.current = true
      }}
      onPointerLeave={() => {
        pointerInsideMapRef.current = false
      }}
      onPointerDownCapture={
        readonly
          ? undefined
          : (ev) => {
              if (isTypingTarget(ev.target)) return
              ;(ev.currentTarget as HTMLElement).focus({ preventScroll: true })
            }
      }
      onKeyDown={readonly ? undefined : handleKeyDown}
    >
      <div
        ref={mapSurfaceRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain rounded-xl border border-border"
        style={{ background: "var(--card)" }}
      >
        {/* Grid background like N8N */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.15 }}
        >
          <defs>
            <pattern id="grid-small" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.8" fill="currentColor" className="text-border" />
            </pattern>
            <pattern id="grid-large" width="96" height="96" patternUnits="userSpaceOnUse">
              <circle cx="48" cy="48" r="1.5" fill="currentColor" className="text-muted-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-small)" />
          <rect width="100%" height="100%" fill="url(#grid-large)" />
        </svg>

        {/* شريط أدوات عائم قابل للسحب (مقبض يسار) */}
        <div
          ref={toolbarChromeRef}
          role="toolbar"
          aria-label={t("mindMap.toolbarLabel")}
          className={`pointer-events-auto absolute z-20 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-md backdrop-blur-sm ${
            draggingToolbar ? "cursor-grabbing" : ""
          }`}
          style={{ left: toolbarPos.x, top: toolbarPos.y }}
        >
          <button
            type="button"
            className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label={t("mindMap.dragToolbar")}
            title={t("mindMap.dragToolbarHint")}
            onPointerDown={handleToolbarGripPointerDown}
            onDoubleClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const next = { x: 12, y: 12 }
              setToolbarPos(next)
              try {
                localStorage.setItem(TOOLBAR_POS_KEY, JSON.stringify(next))
              } catch {
                /* ignore */
              }
            }}
          >
            <GripVertical className="size-4 shrink-0" />
          </button>
          {!readonly && (
            <div className="flex rounded-md border border-border bg-muted/30 p-0.5 gap-0.5">
              <Button
                type="button"
                variant={canvasTool === "select" ? "secondary" : "ghost"}
                size="icon"
                className="w-8 h-8 shrink-0"
                title={t("mindMap.selectTool")}
                aria-pressed={canvasTool === "select"}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  applyCanvasTool("select")
                }}
                onClick={(e) => {
                  e.preventDefault()
                }}
              >
                <MousePointer2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant={canvasTool === "pan" ? "secondary" : "ghost"}
                size="icon"
                className="w-8 h-8 shrink-0"
                title={t("mindMap.panTool")}
                aria-pressed={canvasTool === "pan"}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  applyCanvasTool("pan")
                }}
                onClick={(e) => {
                  e.preventDefault()
                }}
              >
                <Hand className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          {!readonly && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              title={t("mindMap.addNode")}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddNode()
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
          {!readonly && (
            <Button
              type="button"
              variant={selectedNodeIds.size === nodes.length && nodes.length > 0 ? "secondary" : "outline"}
              size="icon"
              className="h-8 w-8 shrink-0"
              title={t("mindMap.selectAllHint")}
              aria-label={t("mindMap.selectAll")}
              disabled={nodes.length === 0}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSelectAllNodes()
              }}
            >
              <BoxSelect className="w-3.5 h-3.5" />
            </Button>
          )}
          {connecting && (
            <span className="flex h-8 max-w-[10rem] items-center truncate rounded border border-amber-400/30 bg-amber-400/10 px-2 text-[10px] text-amber-400">
              {t("mindMap.connectingHint")}
            </span>
          )}
          {!readonly && multiSelectHeld && (
            <span className="flex h-8 items-center rounded border border-violet-500/40 bg-violet-500/10 px-2 text-[11px] text-violet-300">
              {t("mindMap.multiSelectMode")}
            </span>
          )}
          {!readonly && selectedNodeIds.size > 0 && (
            <span className="flex h-8 items-center rounded border border-primary/30 bg-primary/10 px-2 text-[11px] text-primary">
              {t("mindMap.selectedCount", { count: selectedNodeIds.size })}
            </span>
          )}
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleZoomIn}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleZoomOut}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleReset}>
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
          <span className="tabular-nums flex h-8 min-w-[2.75rem] items-center justify-center rounded border border-transparent px-1.5 text-xs text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <svg
          ref={svgRef}
          className="h-full min-h-0 w-full max-w-full flex-1 touch-none select-none"
          style={{
            cursor: panning
              ? "grabbing"
              : marquee
                ? "crosshair"
              : connecting
                ? "crosshair"
                : multiSelectHeld
                  ? "crosshair"
                  : spaceHeld || canvasTool === "pan"
                    ? "grab"
                    : effectiveCanvasTool === "select"
                      ? "crosshair"
                      : "default",
          }}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={handleCanvasContextMenu}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.25)" />
            </marker>
            {MIND_MAP_NODE_COLORS.map((c, i) => (
              <filter key={i} id={`glow-${i}`}>
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {/* Edges */}
          {nodes
            .filter((n) => n.parentId)
            .map((node) => {
              const parent = nodes.find((p) => p.id === node.parentId)
              if (!parent) return null
              const colorSet = getMindMapColorSet(node.color)
              const from = getMindMapNodeAnchor(parent)
              const to = getMindMapNodeAnchor(node)
              const pathD = edgePath(from.cx, from.cy, to.cx, to.cy)
              return (
                <g key={`edge-${node.id}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={colorSet.bg}
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    markerEnd="url(#arrowhead)"
                  />
                  <circle r="3" fill={colorSet.bg} opacity="0.7">
                    <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} />
                  </circle>
                </g>
              )
            })}

          {/* أزرار فك الربط على منتصف الخط (فوق العقد لسهولة النقر) */}
          {!readonly &&
            nodes
              .filter((n) => n.parentId)
              .map((node) => {
                const parent = nodes.find((p) => p.id === node.parentId)
                if (!parent) return null
                const from = getMindMapNodeAnchor(parent)
                const to = getMindMapNodeAnchor(node)
                const sx = from.cx
                const sy = from.cy
                const tx = to.cx
                const ty = to.cy
                const midX = (sx + tx) / 2
                const midY = (sy + ty) / 2
                return (
                  <g
                    key={`unlink-edge-${node.id}`}
                    transform={`translate(${midX}, ${midY})`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleUnlinkParent(e, node.id)}
                    className="cursor-pointer"
                  >
                    <title>فك الربط مع العقدة الأم</title>
                    <circle r="14" fill="transparent" />
                    <circle
                      r="8"
                      fill="#f97316"
                      stroke="var(--background)"
                      strokeWidth="1.5"
                      opacity={0.92}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="11"
                      fontWeight="bold"
                      y={0.5}
                    >
                      −
                    </text>
                  </g>
                )
              })}

          {/* Nodes */}
          {nodes.map((node) => {
            const layout = getMindMapNodeLayout(node)
            const { bodyW, bodyH, bodyR, noteH, totalH, role } = layout
            const noteText = node.note?.trim() ?? ""
            const colorSet = getMindMapColorSet(node.color)
            const colorIdx = MIND_MAP_NODE_COLORS.findIndex((c) => c.bg === node.color)
            const isHovered = hoveredNode === node.id
            const isSelected = selectedNodeIds.has(node.id)
            const isSearchMatch = searchLower ? searchMatchIds.has(node.id) : false
            const isSearchMiss = searchLower ? !isSearchMatch : false
            const isDraggingThis = activeDragIds.includes(node.id)
            const isConnectSource = connecting?.fromId === node.id
            const maxChars = role === "main" ? 16 : 12
            const displayText =
              node.text.length > maxChars ? node.text.slice(0, maxChars) + "…" : node.text
            const linkedMap =
              node.linkedMapId && allMaps.length > 0
                ? allMaps.find((m) => m.id === node.linkedMapId)
                : null

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (readonly) return
                  setConnecting(null)
                  setSelectedNodeIds(new Set([node.id]))
                  setEditingNode(node.id)
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  cursor: readonly
                    ? "default"
                    : isDraggingThis
                      ? "grabbing"
                      : connecting
                        ? "pointer"
                        : "grab",
                }}
              >
                <rect
                  width={bodyW}
                  height={totalH}
                  fill="transparent"
                  className="pointer-events-all"
                />

                {(isHovered || isConnectSource || isSelected || isSearchMatch) && (
                  <rect
                    x="-4"
                    y="-4"
                    width={bodyW + 8}
                    height={bodyH + 8}
                    rx={bodyR + 2}
                    fill={colorSet.glow}
                    stroke={
                      isSearchMatch
                        ? "#22c55e"
                        : isSelected && !isConnectSource
                          ? "var(--ring)"
                          : colorSet.bg
                    }
                    strokeWidth={isSearchMatch || (isSelected && !isConnectSource) ? 2 : 1}
                    strokeOpacity={isSearchMatch || (isSelected && !isConnectSource) ? 0.9 : 0.4}
                    filter={`url(#glow-${Math.max(0, colorIdx)})`}
                  />
                )}
                {isSearchMiss && (
                  <rect
                    width={bodyW}
                    height={totalH}
                    rx={bodyR}
                    fill="var(--background)"
                    opacity={0.55}
                    className="pointer-events-none"
                  />
                )}

                <rect
                  width={bodyW}
                  height={bodyH}
                  rx={bodyR}
                  fill="var(--card)"
                  stroke={
                    isConnectSource
                      ? colorSet.bg
                      : isSelected
                        ? "var(--ring)"
                        : isHovered
                          ? colorSet.bg
                          : colorSet.border
                  }
                  strokeWidth={
                    role === "main"
                      ? isConnectSource || isSelected
                        ? 3
                        : 2.5
                      : isConnectSource
                        ? 2.5
                        : isSelected
                          ? 2.5
                          : isHovered
                            ? 2
                            : 1.5
                  }
                  strokeOpacity={isConnectSource ? 1 : isSelected ? 1 : isHovered ? 0.9 : 0.65}
                />

                {role === "main" ? (
                  <circle
                    cx={bodyW - 14}
                    cy={14}
                    r={5}
                    fill={colorSet.bg}
                    opacity={0.85}
                    className="pointer-events-none"
                  />
                ) : (
                  <polygon
                    points={`${bodyW - 4},4 ${bodyW - 4},14 ${bodyW - 14},9`}
                    fill={colorSet.bg}
                    opacity={0.75}
                    className="pointer-events-none"
                  />
                )}

                <rect x="0" y="0" width="4" height={bodyH} rx={bodyR} fill={colorSet.bg} />
                <rect x="2" y="0" width="2" height={bodyH} fill={colorSet.bg} />

                {editingNode === node.id && !readonly ? (
                  <foreignObject x="12" y="8" width={bodyW - 20} height={bodyH - 16}>
                    <input
                      type="text"
                      defaultValue={node.text}
                      className="w-full h-full bg-transparent border-none outline-none text-sm text-card-foreground font-medium"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        onUpdateNode(node.id, { text: e.target.value })
                        setEditingNode(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onUpdateNode(node.id, { text: e.currentTarget.value })
                          setEditingNode(null)
                        }
                        if (e.key === "Escape") setEditingNode(null)
                      }}
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={bodyW / 2 + 2}
                    y={bodyH / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--card-foreground)"
                    fontSize={role === "main" ? 13 : 11}
                    fontWeight={role === "main" ? 600 : 400}
                    fontFamily="inherit"
                    className="pointer-events-none select-none"
                  >
                    {displayText}
                  </text>
                )}

                {noteText && noteH > 0 && (
                  <g transform={`translate(0, ${bodyH + 6})`}>
                    <rect
                      width={bodyW}
                      height={noteH - 6}
                      rx={6}
                      fill={colorSet.glow}
                      stroke={colorSet.border}
                      strokeWidth={1}
                      strokeOpacity={0.35}
                    />
                    <foreignObject x={0} y={0} width={bodyW} height={noteH - 6}>
                      <div className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground break-words line-clamp-4">
                        {noteText}
                      </div>
                    </foreignObject>
                  </g>
                )}

                {!readonly && isHovered && (
                  <g onMouseDown={(e) => e.stopPropagation()}>
                    <g
                      transform={`translate(${bodyW - 10}, -10)`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteNode(node.id)
                      }}
                      className="cursor-pointer"
                    >
                      <circle r="9" fill="#ef4444" stroke="var(--background)" strokeWidth="1.5" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="bold">
                        ×
                      </text>
                    </g>

                    <g
                      transform={`translate(${bodyW / 2}, ${totalH + 12})`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddChildNode(node.id)
                      }}
                      className="cursor-pointer"
                    >
                      <circle r="9" fill={colorSet.bg} stroke="var(--background)" strokeWidth="1.5" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13">
                        +
                      </text>
                    </g>

                    <g
                      transform={`translate(${bodyW + 10}, ${bodyH / 2})`}
                      onClick={(e) => handleConnectClick(e, node.id)}
                      className="cursor-pointer"
                    >
                      <title>
                        {node.parentId ? t("mindMap.linkHintActive") : t("mindMap.linkHint")}
                      </title>
                      <circle r="9" fill="#8b5cf6" stroke="var(--background)" strokeWidth="1.5" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9">
                        ↔
                      </text>
                    </g>

                    <g
                      transform={`translate(-10, ${bodyH / 2})`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingNode(node.id)
                      }}
                      className="cursor-pointer"
                    >
                      <circle r="9" fill="#3b82f6" stroke="var(--background)" strokeWidth="1.5" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9">
                        ✎
                      </text>
                    </g>
                  </g>
                )}

                {linkedMap && onNavigateToMap && (
                  <g
                    transform={`translate(${bodyW / 2}, -18)`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onNavigateToMap(linkedMap.id)
                    }}
                    className="cursor-pointer"
                    style={{ pointerEvents: "all" }}
                  >
                    <title>
                      {t("mindMap.goToLinkedMap", {
                        title: linkedMap.title || t("mindMap.defaultMapTitle"),
                      })}
                    </title>
                    <circle
                      r="12"
                      fill="#10b981"
                      stroke="var(--background)"
                      strokeWidth="2"
                      opacity={isHovered ? 1 : 0.95}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      ↗
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {marquee && (() => {
            const box = normalizeWorldRect(marquee.x1, marquee.y1, marquee.x2, marquee.y2)
            return (
              <rect
                x={box.x}
                y={box.y}
                width={Math.max(box.w, 1)}
                height={Math.max(box.h, 1)}
                fill="rgba(59, 130, 246, 0.14)"
                stroke="rgba(59, 130, 246, 0.9)"
                strokeWidth={1.5}
                strokeDasharray="7 4"
                pointerEvents="none"
              />
            )
          })()}

          {/* Empty state */}
          {nodes.length === 0 && (
            <g>
              <text
                x={viewBox.x + viewBox.w / 2}
                y={viewBox.y + viewBox.h / 2 - 14}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize="14"
              >
                أضف عقدة لبدء الخريطة الذهنية
              </text>
              <text
                x={viewBox.x + viewBox.w / 2}
                y={viewBox.y + viewBox.h / 2 + 14}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize="11"
                opacity="0.6"
              >
                {t("mindMap.contextMenuHint")} • + لإضافة فرع
              </text>
            </g>
          )}
        </svg>
      </div>

      {!readonly && nodes.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t("mindMap.helpHint")}
        </p>
      )}

      <MindMapNodeMenu
        menu={contextMenu}
        node={
          contextMenu?.nodeId
            ? (nodes.find((n) => n.id === contextMenu.nodeId) ?? null)
            : null
        }
        allMaps={allMaps}
        folders={folders}
        currentMapId={currentMapId}
        images={images}
        wordPages={wordPages}
        keyPoints={keyPoints}
        expandingNodeId={expandingNodeId}
        onClose={() => setContextMenu(null)}
        onUpdateNode={onUpdateNode}
        onExpandNodeAi={onExpandNodeAi}
        onDuplicateSubtree={onDuplicateSubtree}
        onOpenLessonTab={onOpenLessonTab}
        onNavigateToMap={onNavigateToMap}
        onAddChild={handleAddChildNode}
        onAddSibling={handleAddSiblingNode}
        onEditNode={(id) => setEditingNode(id)}
        onDeleteNode={(id) => {
          onDeleteNode(id)
          setSelectedNodeIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }}
        onStartConnect={(id) => setConnecting({ fromId: id })}
        onUnlinkParent={(id) => onUpdateNode(id, { parentId: null })}
        onAddNodeAt={handleAddNodeAt}
        onSelectAll={handleSelectAllNodes}
      />
    </div>
  )
}
