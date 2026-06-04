"use client"

import { useEffect, useState } from "react"
import type {
  LessonImage,
  MindMap,
  MindMapFolder,
  MindMapNode,
  WordPage,
} from "@/types/lesson"
import type { LessonTab } from "@/lib/app-navigation"
import {
  MindMapLessonLinkDialog,
  type MindMapLessonLinkTarget,
} from "@/components/mind-map-lesson-link-dialog"
import { MIND_MAP_NODE_COLORS } from "@/lib/mind-map-node"
import { useTranslations } from "@/components/locale-provider"
import { MindMapLinkMapDialog } from "@/components/mind-map-link-map-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Star,
  StickyNote,
  Trash2,
  Unlink,
} from "lucide-react"

export type MindMapContextMenuState = {
  nodeId?: string
  clientX: number
  clientY: number
  worldX?: number
  worldY?: number
} | null

interface MindMapNodeMenuProps {
  menu: MindMapContextMenuState
  node: MindMapNode | null
  allMaps: MindMap[]
  folders: MindMapFolder[]
  currentMapId: string
  images?: LessonImage[]
  wordPages?: WordPage[]
  keyPoints?: string[]
  expandingNodeId?: string | null
  onClose: () => void
  onUpdateNode: (nodeId: string, updates: Partial<MindMapNode>) => void
  onExpandNodeAi?: (nodeId: string) => void | Promise<void>
  onDuplicateSubtree?: (nodeId: string) => void
  onOpenLessonTab?: (tab: LessonTab) => void
  onNavigateToMap?: (mapId: string) => void
  onAddChild?: (nodeId: string) => void
  onAddSibling?: (nodeId: string) => void
  onEditNode?: (nodeId: string) => void
  onDeleteNode?: (nodeId: string) => void
  onStartConnect?: (nodeId: string) => void
  onUnlinkParent?: (nodeId: string) => void
  onAddNodeAt?: (worldX: number, worldY: number, role: "main" | "branch") => void
  onSelectAll?: () => void
}

function MenuSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
}

function MenuItem({
  onClick,
  disabled,
  icon,
  label,
  shortcut,
  active,
  destructive,
}: {
  onClick: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
  shortcut?: string
  active?: boolean
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50",
        active && "bg-accent",
        destructive && "text-destructive hover:bg-destructive/10"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="flex-1 text-start">{label}</span>
      {shortcut && <span className="text-[10px] text-muted-foreground">{shortcut}</span>}
      {active && <Check className="h-4 w-4 shrink-0" />}
    </button>
  )
}

export function MindMapNodeMenu({
  menu,
  node,
  allMaps,
  folders,
  currentMapId,
  images = [],
  wordPages = [],
  keyPoints = [],
  expandingNodeId = null,
  onClose,
  onUpdateNode,
  onExpandNodeAi,
  onDuplicateSubtree,
  onOpenLessonTab,
  onNavigateToMap,
  onAddChild,
  onAddSibling,
  onEditNode,
  onDeleteNode,
  onStartConnect,
  onUnlinkParent,
  onAddNodeAt,
  onSelectAll,
}: MindMapNodeMenuProps) {
  const { t } = useTranslations()
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [lessonLinkOpen, setLessonLinkOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState("")

  const lessonLinkTarget = (): MindMapLessonLinkTarget => {
    if (node?.linkedImageId) return { type: "image", id: node.linkedImageId }
    if (node?.linkedWordPageId) return { type: "word", id: node.linkedWordPageId }
    if (node?.linkedKeyPointIndex != null)
      return { type: "keyPoint", index: node.linkedKeyPointIndex }
    return null
  }

  const applyLessonLink = (target: MindMapLessonLinkTarget) => {
    if (!node) return
    onUpdateNode(node.id, {
      linkedImageId: target?.type === "image" ? target.id : null,
      linkedWordPageId: target?.type === "word" ? target.id : null,
      linkedKeyPointIndex: target?.type === "keyPoint" ? target.index : null,
    })
  }

  const openLessonLink = () => {
    if (!node || !onOpenLessonTab) return
    if (node.linkedImageId) onOpenLessonTab("images")
    else if (node.linkedWordPageId) onOpenLessonTab("word")
    else if (node.linkedKeyPointIndex != null) onOpenLessonTab("keypoints")
    onClose()
  }

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [menu, onClose])

  useEffect(() => {
    if (noteDialogOpen && node) setNoteDraft(node.note ?? "")
  }, [noteDialogOpen, node])

  if (!menu) return null

  const isCanvasMenu = !menu.nodeId
  if (!isCanvasMenu && !node) return null

  const role = node?.role ?? (node?.parentId ? "branch" : "main")
  const linkedTitle =
    node?.linkedMapId != null ? allMaps.find((m) => m.id === node.linkedMapId)?.title : null

  const menuStyle = {
    left: Math.min(menu.clientX, typeof window !== "undefined" ? window.innerWidth - 240 : menu.clientX),
    top: Math.min(menu.clientY, typeof window !== "undefined" ? window.innerHeight - 420 : menu.clientY),
  }

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <div
        className="fixed z-[70] min-w-[210px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        style={menuStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {isCanvasMenu ? (
          <>
            <MenuSectionLabel>{t("mindMap.menuSectionAdd")}</MenuSectionLabel>
            {onAddNodeAt && menu.worldX != null && menu.worldY != null && (
              <>
                <MenuItem
                  icon={<Star className="h-4 w-4 shrink-0 text-amber-500" />}
                  label={t("mindMap.addMainSectionHere")}
                  onClick={() => {
                    onAddNodeAt(menu.worldX!, menu.worldY!, "main")
                    onClose()
                  }}
                />
                <MenuItem
                  icon={<GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  label={t("mindMap.addBranchHere")}
                  onClick={() => {
                    onAddNodeAt(menu.worldX!, menu.worldY!, "branch")
                    onClose()
                  }}
                />
              </>
            )}
            {onSelectAll && (
              <MenuItem
                icon={<Copy className="h-4 w-4 shrink-0 opacity-70" />}
                label={t("mindMap.selectAll")}
                shortcut="Ctrl+A"
                onClick={() => {
                  onSelectAll()
                  onClose()
                }}
              />
            )}
          </>
        ) : (
          node && (
            <>
              <MenuSectionLabel>{t("mindMap.menuSectionAdd")}</MenuSectionLabel>
              {onAddChild && (
                <MenuItem
                  icon={<Plus className="h-4 w-4 shrink-0 text-emerald-500" />}
                  label={t("mindMap.addChildBranch")}
                  shortcut="Tab"
                  onClick={() => {
                    onAddChild(node.id)
                    onClose()
                  }}
                />
              )}
              {onAddSibling && (
                <MenuItem
                  icon={<GitBranch className="h-4 w-4 shrink-0 text-sky-500" />}
                  label={t("mindMap.addSiblingNode")}
                  shortcut="Enter"
                  onClick={() => {
                    onAddSibling(node.id)
                    onClose()
                  }}
                />
              )}

              <div className="my-1 h-px bg-border" />
              <MenuSectionLabel>{t("mindMap.menuSectionType")}</MenuSectionLabel>
              <MenuItem
                icon={<Star className="h-4 w-4 shrink-0 text-amber-500" />}
                label={t("mindMap.setAsMain")}
                active={role === "main"}
                onClick={() => {
                  onUpdateNode(node.id, { role: "main" })
                  onClose()
                }}
              />
              <MenuItem
                icon={<GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />}
                label={t("mindMap.setAsBranch")}
                active={role === "branch"}
                onClick={() => {
                  onUpdateNode(node.id, { role: "branch" })
                  onClose()
                }}
              />

              <div className="my-1 h-px bg-border" />
              <MenuSectionLabel>{t("mindMap.menuSectionEdit")}</MenuSectionLabel>
              {onEditNode && (
                <MenuItem
                  icon={<Pencil className="h-4 w-4 shrink-0 text-blue-500" />}
                  label={t("mindMap.editNodeText")}
                  shortcut="F2"
                  onClick={() => {
                    onEditNode(node.id)
                    onClose()
                  }}
                />
              )}
              <MenuItem
                icon={<StickyNote className="h-4 w-4 shrink-0" />}
                label={node.note?.trim() ? t("mindMap.editNote") : t("mindMap.addNote")}
                onClick={() => {
                  setNoteDraft(node.note ?? "")
                  setNoteDialogOpen(true)
                }}
              />
              {onStartConnect && (
                <MenuItem
                  icon={<Link2 className="h-4 w-4 shrink-0 text-violet-500" />}
                  label={t("mindMap.connectToNode")}
                  onClick={() => {
                    onStartConnect(node.id)
                    onClose()
                  }}
                />
              )}
              {node.parentId && onUnlinkParent && (
                <MenuItem
                  icon={<Unlink className="h-4 w-4 shrink-0 text-orange-500" />}
                  label={t("mindMap.unlinkFromParent")}
                  onClick={() => {
                    onUnlinkParent(node.id)
                    onClose()
                  }}
                />
              )}
              {onDeleteNode && (
                <MenuItem
                  icon={<Trash2 className="h-4 w-4 shrink-0" />}
                  label={t("mindMap.deleteNode")}
                  shortcut="Del"
                  destructive
                  onClick={() => {
                    onDeleteNode(node.id)
                    onClose()
                  }}
                />
              )}

              <div className="my-1 h-px bg-border" />
              <MenuSectionLabel>{t("mindMap.menuSectionLink")}</MenuSectionLabel>
              <MenuItem
                icon={<Link2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                label={node.linkedMapId ? t("mindMap.changeMapLink") : t("mindMap.linkToMap")}
                onClick={() => setLinkDialogOpen(true)}
              />
              <MenuItem
                icon={<ExternalLink className="h-4 w-4 shrink-0 text-sky-500" />}
                label={t("mindMap.linkToLesson")}
                onClick={() => setLessonLinkOpen(true)}
              />
              {(node.linkedImageId || node.linkedWordPageId || node.linkedKeyPointIndex != null) &&
                onOpenLessonTab && (
                  <MenuItem
                    icon={<ExternalLink className="h-4 w-4 shrink-0" />}
                    label={t("mindMap.goToLessonLink")}
                    onClick={openLessonLink}
                  />
                )}
              {node.linkedMapId && onNavigateToMap && (
                <MenuItem
                  icon={<Link2 className="h-4 w-4 shrink-0" />}
                  label={t("mindMap.goToLinkedMap", { title: linkedTitle ?? "" })}
                  onClick={() => {
                    onNavigateToMap(node.linkedMapId!)
                    onClose()
                  }}
                />
              )}

              <div className="my-1 h-px bg-border" />
              <MenuSectionLabel>{t("mindMap.menuSectionMore")}</MenuSectionLabel>
              {onExpandNodeAi && (
                <MenuItem
                  disabled={expandingNodeId === node.id}
                  icon={
                    expandingNodeId === node.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-400" />
                    ) : (
                      <Sparkles className="h-4 w-4 shrink-0 text-violet-400" />
                    )
                  }
                  label={
                    expandingNodeId === node.id ? t("mindMap.expandingAi") : t("mindMap.expandWithAi")
                  }
                  onClick={() => {
                    void onExpandNodeAi(node.id)
                    onClose()
                  }}
                />
              )}
              {onDuplicateSubtree && (
                <MenuItem
                  icon={<Copy className="h-4 w-4 shrink-0" />}
                  label={t("mindMap.duplicateBranch")}
                  onClick={() => {
                    onDuplicateSubtree(node.id)
                    onClose()
                  }}
                />
              )}
              <p className="px-2 py-1 text-xs text-muted-foreground">{t("mindMap.nodeColor")}</p>
              <div className="grid grid-cols-4 gap-1.5 px-2 pb-2">
                {MIND_MAP_NODE_COLORS.map((c) => (
                  <button
                    key={c.bg}
                    type="button"
                    title={c.bg}
                    className={cn(
                      "h-7 w-7 rounded-md border-2 transition-transform hover:scale-105",
                      node.color === c.bg ? "border-foreground ring-1 ring-ring" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.bg }}
                    onClick={() => {
                      onUpdateNode(node.id, { color: c.bg })
                      onClose()
                    }}
                  />
                ))}
              </div>
            </>
          )
        )}
      </div>

      {node && (
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("mindMap.noteTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="mindmap-node-note">{t("mindMap.noteLabel")}</Label>
            <Textarea
              id="mindmap-node-note"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={t("mindMap.notePlaceholder")}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onUpdateNode(node.id, { note: "" })
                setNoteDialogOpen(false)
                onClose()
              }}
            >
              {t("mindMap.clearNote")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onUpdateNode(node.id, { note: noteDraft.trim() })
                setNoteDialogOpen(false)
                onClose()
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {node && (
      <MindMapLinkMapDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        maps={allMaps}
        folders={folders}
        currentMapId={currentMapId}
        linkedMapId={node.linkedMapId}
        onSelect={(mapId) => {
          onUpdateNode(node.id, { linkedMapId: mapId })
          onClose()
        }}
      />
      )}

      {node && (
      <MindMapLessonLinkDialog
        open={lessonLinkOpen}
        onOpenChange={setLessonLinkOpen}
        images={images}
        wordPages={wordPages}
        keyPoints={keyPoints}
        current={lessonLinkTarget()}
        onSelect={(target) => {
          applyLessonLink(target)
          onClose()
        }}
      />
      )}
    </>
  )
}
