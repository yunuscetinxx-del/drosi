"use client"

import { useMemo } from "react"
import type { MindMap, MindMapFolder } from "@/types/lesson"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslations } from "@/components/locale-provider"
import { cn } from "@/lib/utils"
import { Folder, Network, Unlink } from "lucide-react"

interface MindMapLinkMapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  maps: MindMap[]
  folders: MindMapFolder[]
  currentMapId: string
  linkedMapId?: string | null
  onSelect: (mapId: string | null) => void
}

export function MindMapLinkMapDialog({
  open,
  onOpenChange,
  maps,
  folders,
  currentMapId,
  linkedMapId,
  onSelect,
}: MindMapLinkMapDialogProps) {
  const { t } = useTranslations()

  const candidates = useMemo(
    () => maps.filter((map) => map.id !== currentMapId),
    [maps, currentMapId]
  )

  const folderGroups = useMemo(() => {
    const byFolder = new Map<string | null, MindMap[]>()
    for (const map of candidates) {
      const key = map.folderId ?? null
      if (!byFolder.has(key)) byFolder.set(key, [])
      byFolder.get(key)!.push(map)
    }

    const groups: { folder: MindMapFolder | null; maps: MindMap[] }[] = []

    for (const folder of folders) {
      const list = byFolder.get(folder.id) ?? []
      if (list.length > 0) groups.push({ folder, maps: list })
      byFolder.delete(folder.id)
    }

    const unfiled = byFolder.get(null) ?? []
    if (unfiled.length > 0) groups.push({ folder: null, maps: unfiled })

    for (const [folderId, list] of byFolder.entries()) {
      if (folderId && list.length > 0) {
        groups.push({
          folder: {
            id: folderId,
            title: t("mindMap.unknownFolder"),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          maps: list,
        })
      }
    }

    return groups
  }, [candidates, folders, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("mindMap.linkToMapTitle")}</DialogTitle>
          <DialogDescription>{t("mindMap.linkToMapHint")}</DialogDescription>
        </DialogHeader>

        {linkedMapId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => {
              onSelect(null)
              onOpenChange(false)
            }}
          >
            <Unlink className="me-2 h-4 w-4" />
            {t("mindMap.unlinkMap")}
          </Button>
        )}

        {candidates.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("mindMap.noMapsToLink")}
          </p>
        ) : (
          <ScrollArea className="max-h-[50vh] pe-2">
            <div className="space-y-4">
              {folderGroups.map(({ folder, maps: groupMaps }) => (
                <div key={folder?.id ?? "root"} className="space-y-1.5">
                  <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                    {folder ? (
                      <>
                        <Folder className="h-3.5 w-3.5" />
                        {folder.title}
                      </>
                    ) : (
                      t("mindMap.unfiledMaps")
                    )}
                  </p>
                  <div className="space-y-1">
                    {groupMaps.map((map) => (
                      <button
                        key={map.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm transition-colors hover:bg-muted/60",
                          linkedMapId === map.id
                            ? "border-primary/40 bg-primary/10"
                            : "border-transparent"
                        )}
                        onClick={() => {
                          onSelect(map.id)
                          onOpenChange(false)
                        }}
                      >
                        <Network className="h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate">
                          {map.title || t("mindMap.defaultMapTitle")}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {map.nodes.length} {t("mindMap.nodesShort")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
