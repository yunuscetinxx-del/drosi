"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MindMapNode } from "@/types/lesson"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ZoomIn, ZoomOut, Maximize2, Hand, MousePointer2, GripVertical } from "lucide-react"

interface MindMapProps {
  nodes: MindMapNode[]
  onAddNode: (node: Omit<MindMapNode, "id">) => void
  onUpdateNode: (nodeId: string, updates: Partial<MindMapNode>) => void
  onDeleteNode: (nodeId: string) => void
  readonly?: boolean
}

const NODE_COLORS = [
  { bg: "#3b82f6", border: "#2563eb", glow: "#3b82f640" },
  { bg: "#8b5cf6", border: "#7c3aed", glow: "#8b5cf640" },
  { bg: "#10b981", border: "#059669", glow: "#10b98140" },
  { bg: "#f59e0b", border: "#d97706", glow: "#f59e0b40" },
  { bg: "#ef4444", border: "#dc2626", glow: "#ef444440" },
  { bg: "#06b6d4", border: "#0891b2", glow: "#06b6d440" },
  { bg: "#ec4899", border: "#db2777", glow: "#ec489940" },
  { bg: "#84cc16", border: "#65a30d", glow: "#84cc1640" },
]

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

export function MindMap({
  nodes,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  readonly = false,
}: MindMapProps) {
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

  useEffect(() => {
    viewBoxRef.current = viewBox
  }, [viewBox])

  useEffect(() => {
    panningRef.current = panning
  }, [panning])

  useEffect(() => {
    draggingRef.current = dragging
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
      draggingRef.current = null
      setDragging(null)
      setPanning(false)
      setCanvasTool(tool)
    },
    [cancelGestureRafs]
  )

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const clipboardRef = useRef<Omit<MindMapNode, "id"> | null>(null)

  useEffect(() => {
    if (selectedNodeId && !nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }, [nodes, selectedNodeId])

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

  const flushDragMove = useCallback(() => {
    dragMoveRafRef.current = null
    const pt = pendingDragClientRef.current
    const dragId = draggingRef.current
    if (!pt || !dragId) return
    pendingDragClientRef.current = null
    const world = svgToWorldFromRef(pt.x, pt.y)
    const off = draggingOffsetRef.current
    onUpdateNode(dragId, {
      x: world.x - off.x,
      y: world.y - off.y,
    })
  }, [onUpdateNode, svgToWorldFromRef])

  // Node drag: always from the node body (even in «يد» mode); canvas pan only from empty background
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      if (readonly) return
      if (connecting) return
      if (editingNode === nodeId) return

      setSelectedNodeId(nodeId)
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return
      const world = svgToWorld(e.clientX, e.clientY)
      const offset = { x: world.x - node.x, y: world.y - node.y }
      draggingOffsetRef.current = offset
      draggingRef.current = nodeId
      setDraggingOffset(offset)
      setDragging(nodeId)
    },
    [nodes, readonly, connecting, svgToWorld, editingNode]
  )

  // Canvas pan (في وضع اليد فقط عند التحرير؛ في وضع التحديد لا نُحرّك اللوحة من الخلفية)
  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (draggingRef.current) return
      if (connecting) {
        setConnecting(null)
        return
      }
      if (effectiveCanvasTool === "select" && !readonly) {
        setSelectedNodeId(null)
        return
      }
      panStartRef.current = { x: e.clientX, y: e.clientY }
      setPanning(true)
    },
    [connecting, readonly, effectiveCanvasTool]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
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
    [panning, flushDragMove, flushPanMove]
  )

  const handleMouseUp = useCallback(() => {
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
      onUpdateNode(id, { x: world.x - off.x, y: world.y - off.y })
    } else {
      pendingDragClientRef.current = null
    }

    draggingRef.current = null
    setDragging(null)
    setPanning(false)
  }, [onUpdateNode, svgToWorldFromRef])

  handleMouseUpRef.current = handleMouseUp

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
    if (!newNodeText.trim()) return
    const color = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)]
    onAddNode({
      text: newNodeText.trim(),
      x: viewBox.x + viewBox.w / 2 + (Math.random() - 0.5) * 200,
      y: viewBox.y + viewBox.h / 2 + (Math.random() - 0.5) * 150,
      parentId: null,
      color: color.bg,
    })
    setNewNodeText("")
  }, [newNodeText, viewBox, onAddNode])

  const handleAddChildNode = useCallback(
    (parentId: string) => {
      const parent = nodes.find((n) => n.id === parentId)
      if (!parent) return
      const color = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)]
      const angle = Math.random() * Math.PI * 2
      const dist = 150 + Math.random() * 50
      onAddNode({
        text: "عقدة جديدة",
        x: parent.x + Math.cos(angle) * dist,
        y: parent.y + Math.sin(angle) * dist,
        parentId,
        color: color.bg,
      })
    },
    [nodes, onAddNode]
  )

  // Bezier edge path
  const edgePath = (from: MindMapNode, to: MindMapNode) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const mx = from.x + dx * 0.5
    return `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`
  }

  const getColorSet = (colorHex: string) =>
    NODE_COLORS.find((c) => c.bg === colorHex) ?? NODE_COLORS[0]

  const NODE_W = 140
  const NODE_H = 44
  const NODE_R = 8

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readonly) return
      if (isTypingTarget(e.target)) return
      if (e.code === "Space") return

      const mod = e.ctrlKey || e.metaKey

      if (mod && e.code === "KeyC") {
        if (!selectedNodeId) return
        const n = nodes.find((x) => x.id === selectedNodeId)
        if (!n) return
        clipboardRef.current = {
          text: n.text,
          x: n.x,
          y: n.y,
          parentId: n.parentId,
          color: n.color,
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
    },
    [readonly, selectedNodeId, nodes, onAddNode, applyCanvasTool]
  )

  return (
    <div
      ref={containerRef}
      tabIndex={readonly ? undefined : -1}
      className="flex h-full min-h-0 flex-col gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
      {!readonly && (
        <div className="flex gap-2 items-center flex-wrap">
          <Input
            value={newNodeText}
            onChange={(e) => setNewNodeText(e.target.value)}
            placeholder="نص العقدة الجديدة..."
            className="flex-1 min-w-[160px]"
            onKeyDown={(e) => { if (e.key === "Enter") handleAddNode() }}
          />
          <Button onClick={handleAddNode} disabled={!newNodeText.trim()} size="sm">
            <Plus className="w-4 h-4 ml-1" />
            إضافة عقدة
          </Button>
          {connecting && (
            <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-lg">
              اختر العقدة الهدف للتوصيل
            </span>
          )}
        </div>
      )}

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
          aria-label="أدوات الخريطة الذهنية"
          className={`pointer-events-auto absolute z-20 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-md backdrop-blur-sm ${
            draggingToolbar ? "cursor-grabbing" : ""
          }`}
          style={{ left: toolbarPos.x, top: toolbarPos.y }}
        >
          <button
            type="button"
            className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label="سحب لإعادة موضع شريط الأدوات"
            title="سحب لإعادة الموضع — نقر مزدوج لإعادة التعيين"
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
                title="تحديد — سحب الصناديق (اختصار: مفتاح V)"
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
                title="يد — تحريك اللوحة من المنطقة الفارغة (اختصار: مفتاح D)"
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
              : connecting
                ? "crosshair"
                : spaceHeld || canvasTool === "pan"
                  ? "grab"
                  : "default",
          }}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
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
            {NODE_COLORS.map((c, i) => (
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
              const colorSet = getColorSet(node.color)
              return (
                <g key={`edge-${node.id}`}>
                  <path
                    d={edgePath(
                      { ...parent, x: parent.x + NODE_W / 2, y: parent.y + NODE_H / 2 },
                      { ...node, x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 }
                    )}
                    fill="none"
                    stroke={colorSet.bg}
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Animated dot along the edge */}
                  <circle r="3" fill={colorSet.bg} opacity="0.7">
                    <animateMotion
                      dur="2.5s"
                      repeatCount="indefinite"
                      path={edgePath(
                        { ...parent, x: parent.x + NODE_W / 2, y: parent.y + NODE_H / 2 },
                        { ...node, x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 }
                      )}
                    />
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
                const sx = parent.x + NODE_W / 2
                const sy = parent.y + NODE_H / 2
                const tx = node.x + NODE_W / 2
                const ty = node.y + NODE_H / 2
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
            const colorSet = getColorSet(node.color)
            const colorIdx = NODE_COLORS.findIndex((c) => c.bg === node.color)
            const isHovered = hoveredNode === node.id
            const isSelected = selectedNodeId === node.id
            const isConnectSource = connecting?.fromId === node.id

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (readonly) return
                  setConnecting(null)
                  setSelectedNodeId(node.id)
                  setEditingNode(node.id)
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  cursor: readonly
                    ? "default"
                    : dragging === node.id
                      ? "grabbing"
                      : connecting
                        ? "pointer"
                        : "grab",
                }}
              >
                {/* Glow effect */}
                {(isHovered || isConnectSource || isSelected) && (
                  <rect
                    x="-4"
                    y="-4"
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx={NODE_R + 2}
                    fill={colorSet.glow}
                    stroke={isSelected && !isConnectSource ? "var(--ring)" : colorSet.bg}
                    strokeWidth={isSelected && !isConnectSource ? 2 : 1}
                    strokeOpacity={isSelected && !isConnectSource ? 0.9 : 0.4}
                    filter={`url(#glow-${Math.max(0, colorIdx)})`}
                  />
                )}

                {/* Node body */}
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={NODE_R}
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
                  strokeWidth={isConnectSource ? 2.5 : isSelected ? 2.5 : isHovered ? 2 : 1.5}
                  strokeOpacity={isConnectSource ? 1 : isSelected ? 1 : isHovered ? 0.9 : 0.6}
                />

                {/* Left color accent bar */}
                <rect
                  x="0"
                  y="0"
                  width="4"
                  height={NODE_H}
                  rx={NODE_R}
                  fill={colorSet.bg}
                />
                <rect x="2" y="0" width="2" height={NODE_H} fill={colorSet.bg} />

                {/* Node text or edit input */}
                {editingNode === node.id && !readonly ? (
                  <foreignObject x="12" y="8" width={NODE_W - 20} height={NODE_H - 16}>
                    <input
                      type="text"
                      defaultValue={node.text}
                      className="w-full h-full bg-transparent border-none outline-none text-sm text-card-foreground"
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
                    x={NODE_W / 2 + 4}
                    y={NODE_H / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--card-foreground)"
                    fontSize="12"
                    fontFamily="inherit"
                    className="pointer-events-none select-none"
                  >
                    {node.text.length > 14 ? node.text.slice(0, 14) + "…" : node.text}
                  </text>
                )}

                {/* Action buttons (visible on hover) */}
                {!readonly && isHovered && (
                  <g onMouseDown={(e) => e.stopPropagation()}>
                    {/* Delete */}
                    <g
                      transform={`translate(${NODE_W - 10}, -10)`}
                      onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id) }}
                      className="cursor-pointer"
                    >
                      <circle r="9" fill="#ef4444" stroke="var(--background)" strokeWidth="1.5" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="bold">×</text>
                    </g>

                    {/* Add child */}
                    <g
                      transform={`translate(${NODE_W / 2}, ${NODE_H + 12})`}
                      onClick={(e) => { e.stopPropagation(); handleAddChildNode(node.id) }}
                      className="cursor-pointer"
                    >
                      <circle r="9" fill={colorSet.bg} stroke="var(--background)" strokeWidth="1.5" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13">+</text>
                    </g>

                    {/* Connect */}
                    <g
                      transform={`translate(${NODE_W + 10}, ${NODE_H / 2})`}
                      onClick={(e) => handleConnectClick(e, node.id)}
                      className="cursor-pointer"
                    >
                      <title>
                        {node.parentId
                          ? "ربط كمصدر ثم اختيار هدف — Shift+نقر لفك الربط من على الخط"
                          : "ربط: انقر كمصدر ثم انقر على العقدة الهدف"}
                      </title>
                      <circle r="9" fill="#8b5cf6" stroke="var(--background)" strokeWidth="1.5" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9">↔</text>
                    </g>

                    {/* Edit text */}
                    <g
                      transform={`translate(-10, ${NODE_H / 2})`}
                      onClick={(e) => { e.stopPropagation(); setEditingNode(node.id) }}
                      className="cursor-pointer"
                    >
                      <circle r="9" fill="#3b82f6" stroke="var(--background)" strokeWidth="1.5" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9">✎</text>
                    </g>
                  </g>
                )}
              </g>
            )
          })}

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
                اسحب للتنقل • عجلة الماوس للتكبير • + لإضافة فرع
              </text>
            </g>
          )}
        </svg>
      </div>

      {!readonly && nodes.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          اسحب العقدة لنقلها — حرّك اللوحة من الفراغ في وضع اليد • المسافة = يد مؤقتة • مرتين للتحرير • ↔ لربط عقدتين • فك الربط: الزر البرتقالي على منتصف الخط بين العقدتين (أو Shift+نقر على ↔) • V / D • Ctrl+C / Ctrl+V
        </p>
      )}
    </div>
  )
}
