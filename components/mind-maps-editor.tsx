"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import type {
  LessonImage,
  MindMap,
  MindMapFolder,
  MindMapNode,
  WordPage,
} from "@/types/lesson"
import { MindMap as MindMapCanvas } from "@/components/mind-map"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslations } from "@/components/locale-provider"
import { cn } from "@/lib/utils"
import {
  clearLinkedMapReferences,
  createEmptyMindMap,
  createEmptyMindMapFolder,
  dissolveMindMapFolder,
  filterMapsForSidebar,
  readActiveMindMapId,
  readExpandedFolderIds,
  updateMindMapInList,
  writeActiveMindMapId,
  writeExpandedFolderIds,
} from "@/lib/mind-maps-utils"
import {
  buildMindMapNodesFromKeyPoints,
  buildMindMapNodesFromSummary,
} from "@/lib/mind-map-import"
import {
  canRedoMindMap,
  canUndoMindMap,
  createMindMapHistory,
  pushMindMapHistory,
  redoMindMapHistory,
  undoMindMapHistory,
  type MindMapHistoryState,
} from "@/lib/mind-map-history"
import { autoLayoutMindMapNodes } from "@/lib/mind-map-auto-layout"
import { duplicateMindMap, duplicateMindMapSubtree } from "@/lib/mind-map-duplicate"
import { buildBranchNodesForParent } from "@/lib/mind-map-expand"
import {
  ChevronDown,
  Copy,
  Folder,
  FolderPlus,
  LayoutTemplate,
  Lightbulb,
  MoreHorizontal,
  Network,
  Plus,
  Redo2,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Download,
  FileText,
  HelpCircle,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { LessonTab } from "@/lib/app-navigation"

const generateId = () => Math.random().toString(36).substring(2, 11)

export type MindMapsEditorHandle = {
  addNodesToActive: (nodes: Omit<MindMapNode, "id">[]) => void
}

interface MindMapsEditorProps {
  lessonId: string
  lessonTitle: string
  lessonSubject?: string
  keyPoints?: string[]
  summary?: string
  images?: LessonImage[]
  wordPages?: WordPage[]
  maps: MindMap[]
  folders?: MindMapFolder[]
  readOnly?: boolean
  onMapsChange: (maps: MindMap[]) => void
  onFoldersChange?: (folders: MindMapFolder[]) => void
  onOpenLessonTab?: (tab: LessonTab, targetId?: string) => void
}

function MapSidebarButton({
  map,
  idx,
  active,
  onSelect,
  readOnly,
  folders,
  onMoveToFolder,
  t,
}: {
  map: MindMap
  idx: number
  active: boolean
  onSelect: () => void
  readOnly: boolean
  folders: MindMapFolder[]
  onMoveToFolder: (mapId: string, folderId: string | null) => void
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  return (
    <div className="group flex items-center gap-0.5">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1 rounded-lg border px-2.5 py-2 text-start text-xs transition-colors",
          active
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-transparent hover:bg-muted/60 text-muted-foreground"
        )}
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Network className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {map.title || `${t("mindMap.defaultMapTitle")} ${idx + 1}`}
          </span>
        </span>
        <span className="ps-5 text-[10px] text-muted-foreground">
          {map.nodes.length} {t("mindMap.nodesShort")}
        </span>
      </button>
      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[200]">
            <DropdownMenuItem onClick={() => onMoveToFolder(map.id, null)}>
              {t("mindMap.moveToUnfiled")}
            </DropdownMenuItem>
            {folders.length > 0 && <DropdownMenuSeparator />}
            {folders.map((folder) => (
              <DropdownMenuItem
                key={folder.id}
                onClick={() => onMoveToFolder(map.id, folder.id)}
              >
                {folder.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export const MindMapsEditor = forwardRef<MindMapsEditorHandle, MindMapsEditorProps>(
  function MindMapsEditor(
    {
      lessonId,
      lessonTitle,
      lessonSubject = "",
      keyPoints = [],
      summary = "",
      images = [],
      wordPages = [],
      maps,
      folders = [],
      readOnly = false,
      onMapsChange,
      onFoldersChange,
      onOpenLessonTab,
    },
    ref
  ) {
    const { t } = useTranslations()
    const [activeMapId, setActiveMapId] = useState<string | null>(() => {
      if (maps.length === 0) return null
      const stored = readActiveMindMapId(lessonId)
      if (stored && maps.some((m) => m.id === stored)) return stored
      return maps[0]?.id ?? null
    })
    const [searchQuery, setSearchQuery] = useState("")
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
    const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null)
    const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>(() =>
      readExpandedFolderIds(lessonId)
    )
    const [mapTransition, setMapTransition] = useState(false)
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
    const [nodeSearch, setNodeSearch] = useState("")
    const [historyTick, setHistoryTick] = useState(0)
    const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const historyRef = useRef<Record<string, MindMapHistoryState>>({})
    const skipHistoryRef = useRef(false)
    const mindMapExportRef = useRef<(() => void) | null>(null)

    const mapIdsKey = useMemo(() => maps.map((m) => m.id).join("|"), [maps])

    const persistMaps = useCallback(
      (next: MindMap[]) => {
        if (!readOnly) {
          setSaveState("saving")
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
          saveTimerRef.current = setTimeout(() => {
            setSaveState("saved")
            saveTimerRef.current = null
            setTimeout(() => setSaveState("idle"), 1500)
          }, 500)
        }
        onMapsChange(next)
      },
      [onMapsChange, readOnly]
    )

    useEffect(() => {
      return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      }
    }, [])

    useEffect(() => {
      if (maps.length === 0) {
        setActiveMapId((prev) => (prev === null ? prev : null))
        return
      }

      const stored = readActiveMindMapId(lessonId)
      setActiveMapId((prev) => {
        if (stored && maps.some((m) => m.id === stored)) {
          return prev === stored ? prev : stored
        }
        if (prev && maps.some((m) => m.id === prev)) {
          return prev
        }
        return maps[0].id
      })
    }, [mapIdsKey, lessonId, maps.length])

    useEffect(() => {
      if (!activeMapId) return
      if (!maps.some((m) => m.id === activeMapId)) return
      writeActiveMindMapId(lessonId, activeMapId)
    }, [activeMapId, lessonId, mapIdsKey])

    useEffect(() => {
      const map = maps.find((m) => m.id === activeMapId)
      if (!map?.folderId) return
      setExpandedFolderIds((prev) =>
        prev.includes(map.folderId!) ? prev : [...prev, map.folderId!]
      )
    }, [activeMapId, maps])

    useEffect(() => {
      writeExpandedFolderIds(lessonId, expandedFolderIds)
    }, [expandedFolderIds, lessonId])

    const filteredEntries = useMemo(
      () => filterMapsForSidebar(maps, searchQuery),
      [maps, searchQuery]
    )
    const isSearching = searchQuery.trim().length > 0

    const activeMap = maps.find((m) => m.id === activeMapId) ?? null

    const activeHistory = activeMapId ? historyRef.current[activeMapId] : undefined
    const canUndo = activeHistory ? canUndoMindMap(activeHistory) : false
    const canRedo = activeHistory ? canRedoMindMap(activeHistory) : false
    void historyTick

    useEffect(() => {
      if (!activeMapId || !activeMap) return
      if (!historyRef.current[activeMapId]) {
        historyRef.current[activeMapId] = createMindMapHistory(activeMap.nodes)
        setHistoryTick((n) => n + 1)
      }
    }, [activeMapId, activeMap])

    const applyNodesToActive = useCallback(
      (nodes: MindMapNode[], recordHistory = true) => {
        if (!activeMapId) return
        if (recordHistory) {
          const prev =
            historyRef.current[activeMapId] ?? createMindMapHistory(activeMap?.nodes ?? [])
          historyRef.current[activeMapId] = pushMindMapHistory(prev, nodes)
          setHistoryTick((n) => n + 1)
        } else {
          skipHistoryRef.current = true
        }
        persistMaps(
          updateMindMapInList(maps, activeMapId, (map) => ({
            ...map,
            nodes,
            saved: true,
            updatedAt: new Date(),
          }))
        )
      },
      [activeMapId, activeMap?.nodes, maps, persistMaps]
    )

    const patchActiveMap = useCallback(
      (updater: (map: MindMap) => MindMap) => {
        if (!activeMapId) return
        const current = maps.find((m) => m.id === activeMapId)
        if (!current) return
        const nextMap = updater({
          ...current,
          saved: true,
          updatedAt: new Date(),
        })
        applyNodesToActive(nextMap.nodes, !skipHistoryRef.current)
        skipHistoryRef.current = false
      },
      [activeMapId, maps, applyNodesToActive]
    )

    const handleUndo = useCallback(() => {
      if (!activeMapId) return
      const h = historyRef.current[activeMapId]
      if (!h) return
      const next = undoMindMapHistory(h)
      if (!next) return
      historyRef.current[activeMapId] = next
      setHistoryTick((n) => n + 1)
      applyNodesToActive(next.present, false)
    }, [activeMapId, applyNodesToActive])

    const handleRedo = useCallback(() => {
      if (!activeMapId) return
      const h = historyRef.current[activeMapId]
      if (!h) return
      const next = redoMindMapHistory(h)
      if (!next) return
      historyRef.current[activeMapId] = next
      setHistoryTick((n) => n + 1)
      applyNodesToActive(next.present, false)
    }, [activeMapId, applyNodesToActive])

    const importNodes = useCallback(
      (nodes: MindMapNode[], mapTitle: string) => {
        if (nodes.length === 0) return
        if (!activeMap || activeMap.nodes.length === 0) {
          if (!activeMap) {
            const map = createEmptyMindMap(mapTitle)
            persistMaps([{ ...map, nodes, saved: true, updatedAt: new Date() }])
            setActiveMapId(map.id)
            historyRef.current[map.id] = createMindMapHistory(nodes)
          } else {
            applyNodesToActive(nodes)
          }
          return
        }
        const map = createEmptyMindMap(mapTitle)
        persistMaps([...maps, { ...map, nodes, saved: true, updatedAt: new Date() }])
        setActiveMapId(map.id)
        historyRef.current[map.id] = createMindMapHistory(nodes)
      },
      [activeMap, maps, persistMaps, applyNodesToActive]
    )

    const handleImportKeyPoints = useCallback(() => {
      const nodes = buildMindMapNodesFromKeyPoints(lessonTitle, keyPoints)
      if (nodes.length === 0) return
      importNodes(nodes, t("mindMap.importFromKeyPoints"))
    }, [lessonTitle, keyPoints, importNodes, t])

    const handleImportSummary = useCallback(() => {
      const nodes = buildMindMapNodesFromSummary(lessonTitle, summary)
      if (nodes.length === 0) return
      importNodes(nodes, t("mindMap.importFromSummary"))
    }, [lessonTitle, summary, importNodes, t])

    const handleAutoLayout = useCallback(() => {
      if (!activeMap) return
      applyNodesToActive(autoLayoutMindMapNodes(activeMap.nodes))
    }, [activeMap, applyNodesToActive])

    const handleDuplicateMap = useCallback(() => {
      if (!activeMap) return
      const copy = duplicateMindMap(activeMap)
      persistMaps([...maps, copy])
      setActiveMapId(copy.id)
      historyRef.current[copy.id] = createMindMapHistory(copy.nodes)
    }, [activeMap, maps, persistMaps])

    const handleExpandNodeAi = useCallback(
      async (nodeId: string) => {
        const node = activeMap?.nodes.find((n) => n.id === nodeId)
        if (!node || readOnly) return
        setExpandingNodeId(nodeId)
        try {
          const res = await fetch("/api/mind-map/expand-node", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nodeText: node.text,
              lessonTitle,
              subject: lessonSubject,
            }),
          })
          const data = (await res.json()) as { branches?: string[]; error?: string }
          if (!res.ok) throw new Error(data.error ?? t("mindMap.expandAiFailed"))
          const branches = buildBranchNodesForParent(node, data.branches ?? [])
          if (branches.length === 0) return
          applyNodesToActive([...(activeMap?.nodes ?? []), ...branches])
        } catch {
          /* optional toast */
        } finally {
          setExpandingNodeId(null)
        }
      },
      [activeMap, readOnly, lessonTitle, lessonSubject, applyNodesToActive, t]
    )

    const handleDuplicateSubtree = useCallback(
      (nodeId: string) => {
        if (!activeMap) return
        applyNodesToActive(duplicateMindMapSubtree(activeMap.nodes, nodeId))
      },
      [activeMap, applyNodesToActive]
    )

    const navigateToMap = useCallback(
      (mapId: string) => {
        if (mapId === activeMapId || !maps.some((m) => m.id === mapId)) return
        setMapTransition(true)
        window.setTimeout(() => {
          setActiveMapId(mapId)
          writeActiveMindMapId(lessonId, mapId)
          window.setTimeout(() => setMapTransition(false), 320)
        }, 220)
      },
      [activeMapId, lessonId, maps]
    )

    const createMap = useCallback(
      (title?: string, folderId?: string | null) => {
        const map = createEmptyMindMap(title ?? t("mindMap.defaultMapTitle"), folderId ?? null)
        persistMaps([...maps, map])
        setActiveMapId(map.id)
        if (folderId) {
          setExpandedFolderIds((prev) =>
            prev.includes(folderId) ? prev : [...prev, folderId]
          )
        }
      },
      [maps, persistMaps, t]
    )

    const createFolder = useCallback(() => {
      if (!onFoldersChange) return
      const folder = createEmptyMindMapFolder(t("mindMap.defaultFolderTitle"))
      onFoldersChange([...folders, folder])
      setExpandedFolderIds((prev) => [...prev, folder.id])
    }, [folders, onFoldersChange, t])

    const renameFolder = useCallback(
      (folderId: string, title: string) => {
        if (!onFoldersChange) return
        onFoldersChange(
          folders.map((f) =>
            f.id === folderId
              ? { ...f, title: title.trim() || t("mindMap.defaultFolderTitle"), updatedAt: new Date() }
              : f
          )
        )
      },
      [folders, onFoldersChange, t]
    )

    const deleteFolder = useCallback(() => {
      if (!deleteFolderTarget || !onFoldersChange) return
      persistMaps(dissolveMindMapFolder(maps, deleteFolderTarget))
      onFoldersChange(folders.filter((f) => f.id !== deleteFolderTarget))
      setExpandedFolderIds((prev) => prev.filter((id) => id !== deleteFolderTarget))
      setDeleteFolderTarget(null)
    }, [deleteFolderTarget, folders, maps, onFoldersChange, persistMaps])

    const moveMapToFolder = useCallback(
      (mapId: string, folderId: string | null) => {
        persistMaps(
          updateMindMapInList(maps, mapId, (map) => ({
            ...map,
            folderId,
            saved: true,
            updatedAt: new Date(),
          }))
        )
        if (folderId) {
          setExpandedFolderIds((prev) =>
            prev.includes(folderId) ? prev : [...prev, folderId]
          )
        }
      },
      [maps, persistMaps]
    )

    const renameMap = useCallback(
      (mapId: string, title: string) => {
        persistMaps(
          updateMindMapInList(maps, mapId, (map) => ({
            ...map,
            title: title.trim() || t("mindMap.defaultMapTitle"),
            saved: true,
            updatedAt: new Date(),
          }))
        )
      },
      [maps, persistMaps, t]
    )

    const deleteMap = useCallback(() => {
      if (!deleteTarget) return
      const next = clearLinkedMapReferences(
        maps.filter((m) => m.id !== deleteTarget),
        deleteTarget
      )
      persistMaps(next)
      if (activeMapId === deleteTarget) {
        setActiveMapId(next[0]?.id ?? null)
      }
      setDeleteTarget(null)
    }, [deleteTarget, maps, persistMaps, activeMapId])

    const toggleFolder = useCallback((folderId: string, open: boolean) => {
      setExpandedFolderIds((prev) => {
        if (open) return prev.includes(folderId) ? prev : [...prev, folderId]
        return prev.filter((id) => id !== folderId)
      })
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        addNodesToActive: (nodes) => {
          const withIds = nodes.map((node) => ({ ...node, id: generateId() }))
          if (!activeMap && maps.length === 0) {
            const map = createEmptyMindMap(t("mindMap.aiMapTitle"))
            persistMaps([
              {
                ...map,
                nodes: withIds,
                saved: true,
                updatedAt: new Date(),
              },
            ])
            setActiveMapId(map.id)
            historyRef.current[map.id] = createMindMapHistory(withIds)
            return
          }
          const targetId = activeMapId ?? maps[0]?.id
          if (!targetId) return
          const target = maps.find((m) => m.id === targetId)
          if (!target) return
          applyNodesToActive([...target.nodes, ...withIds])
        },
      }),
      [activeMap, activeMapId, maps, persistMaps, applyNodesToActive, t]
    )

    const mapsInFolder = useCallback(
      (folderId: string) =>
        filteredEntries.filter(({ map, folderId: fid }) => fid === folderId),
      [filteredEntries]
    )

    const unfiledMaps = useMemo(
      () => filteredEntries.filter(({ folderId }) => !folderId),
      [filteredEntries]
    )

    const renderMapList = (entries: typeof filteredEntries, startIdx = 0) =>
      entries.map(({ map }, i) => (
        <MapSidebarButton
          key={map.id}
          map={map}
          idx={startIdx + i}
          active={activeMapId === map.id}
          onSelect={() => setActiveMapId(map.id)}
          readOnly={readOnly}
          folders={folders}
          onMoveToFolder={moveMapToFolder}
          t={t}
        />
      ))

    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-52 shrink-0 flex-col border-e border-border bg-muted/20 sm:w-60">
          <div className="space-y-2 border-b border-border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {t("mindMap.maps")}
              </span>
              {!readOnly && (
                <div className="flex items-center gap-0.5">
                  {onFoldersChange && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title={t("mindMap.newFolder")}
                      onClick={createFolder}
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title={t("mindMap.newMap")}
                    onClick={() => createMap()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={t("mindMap.searchMaps")}
                className="h-8 ps-8 text-xs"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 p-2">
              {maps.length === 0 ? (
                <div className="px-2 py-6 text-center">
                  <Network className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">{t("mindMap.noMaps")}</p>
                  {!readOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => createMap()}
                    >
                      <Plus className="me-1 h-3 w-3" />
                      {t("mindMap.createFirst")}
                    </Button>
                  )}
                </div>
              ) : filteredEntries.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  {t("mindMap.noSearchResults")}
                </p>
              ) : isSearching ? (
                renderMapList(filteredEntries)
              ) : (
                <>
                  {folders.map((folder) => {
                    const folderMaps = mapsInFolder(folder.id)
                    const open =
                      expandedFolderIds.includes(folder.id) || folderMaps.length === 0
                    return (
                      <Collapsible
                        key={folder.id}
                        open={open}
                        onOpenChange={(next) => toggleFolder(folder.id, next)}
                      >
                        <div className="group/folder rounded-lg border border-transparent hover:border-border/60">
                          <div className="flex items-center gap-0.5 px-1 py-0.5">
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="flex shrink-0 items-center rounded-md p-1 text-muted-foreground hover:bg-muted/50"
                                aria-label={folder.title}
                              >
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 shrink-0 transition-transform",
                                    !open && "-rotate-90"
                                  )}
                                />
                              </button>
                            </CollapsibleTrigger>
                            <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500/90" />
                            {!readOnly ? (
                              <Input
                                value={folder.title}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onChange={(e) => renameFolder(folder.id, e.target.value)}
                                className="h-6 min-w-0 flex-1 border-0 bg-transparent px-1 text-xs font-medium shadow-none focus-visible:ring-0"
                              />
                            ) : (
                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                                {folder.title}
                              </span>
                            )}
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                              {folderMaps.length}
                            </span>
                            {!readOnly && onFoldersChange && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 opacity-0 group-hover/folder:opacity-100"
                                title={t("mindMap.addMapToFolder")}
                                onClick={() => createMap(undefined, folder.id)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                            {!readOnly && onFoldersChange && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-destructive opacity-0 group-hover/folder:opacity-100"
                                onClick={() => setDeleteFolderTarget(folder.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <CollapsibleContent className="space-y-1 ps-2 pb-1">
                            {folderMaps.length === 0 ? (
                              <p className="px-2 py-2 text-[10px] text-muted-foreground">
                                {t("mindMap.emptyFolder")}
                              </p>
                            ) : (
                              renderMapList(folderMaps)
                            )}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )
                  })}

                  {unfiledMaps.length > 0 && (
                    <div className="space-y-1">
                      {folders.length > 0 && (
                        <p className="px-2 pt-1 text-[10px] font-medium text-muted-foreground">
                          {t("mindMap.unfiledMaps")}
                        </p>
                      )}
                      {renderMapList(unfiledMaps)}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {!readOnly && activeMap && maps.length > 1 && (
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(activeMap.id)}
              >
                <Trash2 className="me-1 h-3.5 w-3.5" />
                {t("mindMap.deleteMap")}
              </Button>
            </div>
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {activeMap ? (
            <>
              <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5 sm:gap-1.5 sm:px-3">
                <Network className="h-4 w-4 shrink-0 text-primary" />
                {readOnly ? (
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
                    {activeMap.title || t("mindMap.defaultMapTitle")}
                  </h3>
                ) : (
                  <Input
                    value={activeMap.title}
                    onChange={(e) => renameMap(activeMap.id, e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={t("mindMap.mapTitlePlaceholder")}
                    className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0 sm:text-base"
                  />
                )}
                {!readOnly && (
                  <>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "hidden shrink-0 text-[10px] sm:inline-flex",
                        saveState === "idle" && "opacity-0"
                      )}
                    >
                      {saveState === "saving" ? t("word.saving") : t("word.saved")}
                    </Badge>
                    <div className="relative hidden min-w-0 w-28 lg:block lg:w-36">
                      <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={nodeSearch}
                        onChange={(e) => setNodeSearch(e.target.value)}
                        placeholder={t("mindMap.searchNodes")}
                        className="h-8 ps-8 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      disabled={!canUndo}
                      onClick={handleUndo}
                      title={t("mindMap.undo")}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      disabled={!canRedo}
                      onClick={handleRedo}
                      title={t("mindMap.redo")}
                    >
                      <Redo2 className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 shrink-0"
                          title={t("mindMap.toolsMenu")}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[200] w-52">
                        <DropdownMenuItem
                          disabled={keyPoints.length === 0}
                          onClick={handleImportKeyPoints}
                        >
                          <Lightbulb className="me-2 h-4 w-4" />
                          {t("mindMap.importFromKeyPoints")}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!summary.trim()} onClick={handleImportSummary}>
                          <FileText className="me-2 h-4 w-4" />
                          {t("mindMap.importFromSummary")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleAutoLayout}>
                          <LayoutTemplate className="me-2 h-4 w-4" />
                          {t("mindMap.autoLayout")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => mindMapExportRef.current?.()}>
                          <Download className="me-2 h-4 w-4" />
                          {t("mindMap.exportPng")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDuplicateMap}>
                          <Copy className="me-2 h-4 w-4" />
                          {t("mindMap.duplicateMap")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 lg:hidden">
                          <Input
                            value={nodeSearch}
                            onChange={(e) => setNodeSearch(e.target.value)}
                            placeholder={t("mindMap.searchNodes")}
                            className="h-8 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-muted-foreground"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs space-y-1 text-xs">
                        <p>{t("mindMap.editHint")}</p>
                        <p className="text-muted-foreground">{t("mindMap.shortcutsHint")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>

              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col overflow-hidden px-1 pb-1 pt-0 transition-all duration-300 ease-out sm:px-2 sm:pb-2",
                  mapTransition && "scale-[0.97] opacity-0 blur-[2px]",
                  !mapTransition && "scale-100 opacity-100 blur-0"
                )}
              >
                <MindMapCanvas
                  nodes={activeMap.nodes}
                  allMaps={maps}
                  folders={folders}
                  currentMapId={activeMap.id}
                  lessonTitle={lessonTitle}
                  lessonSubject={lessonSubject}
                  images={images}
                  wordPages={wordPages}
                  keyPoints={keyPoints}
                  nodeSearchQuery={nodeSearch}
                  expandingNodeId={expandingNodeId}
                  onNavigateToMap={navigateToMap}
                  onOpenLessonTab={onOpenLessonTab}
                  onExpandNodeAi={handleExpandNodeAi}
                  onDuplicateSubtree={handleDuplicateSubtree}
                  registerExportPng={(fn) => {
                    mindMapExportRef.current = fn
                  }}
                  readonly={readOnly}
                  onAddNode={(node) => {
                    patchActiveMap((map) => ({
                      ...map,
                      nodes: [...map.nodes, { ...node, id: generateId() }],
                    }))
                  }}
                  onAddNodes={(newNodes) => {
                    if (newNodes.length === 0) return
                    patchActiveMap((map) => ({
                      ...map,
                      nodes: [...map.nodes, ...newNodes],
                    }))
                  }}
                  onUpdateNode={(nodeId, updates) => {
                    patchActiveMap((map) => ({
                      ...map,
                      nodes: map.nodes.map((n) =>
                        n.id === nodeId ? { ...n, ...updates } : n
                      ),
                    }))
                  }}
                  onUpdateNodes={(updates) => {
                    if (updates.length === 0) return
                    const patchById = new Map(updates.map((u) => [u.nodeId, u.patch]))
                    patchActiveMap((map) => ({
                      ...map,
                      nodes: map.nodes.map((n) => {
                        const patch = patchById.get(n.id)
                        return patch ? { ...n, ...patch } : n
                      }),
                    }))
                  }}
                  onDeleteNode={(nodeId) => {
                    patchActiveMap((map) => ({
                      ...map,
                      nodes: map.nodes.filter((n) => n.id !== nodeId),
                    }))
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <Network className="h-14 w-14 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">{t("mindMap.noMaps")}</p>
              {!readOnly && (
                <Button onClick={() => createMap()}>
                  <Plus className="me-2 h-4 w-4" />
                  {t("mindMap.newMap")}
                </Button>
              )}
            </div>
          )}
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("mindMap.deleteMap")}</AlertDialogTitle>
              <AlertDialogDescription>{t("mindMap.deleteMapConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteMap}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!deleteFolderTarget}
          onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("mindMap.deleteFolder")}</AlertDialogTitle>
              <AlertDialogDescription>{t("mindMap.deleteFolderConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteFolder}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }
)

MindMapsEditor.displayName = "MindMapsEditor"
