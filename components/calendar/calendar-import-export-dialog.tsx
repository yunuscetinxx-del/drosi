"use client"

import { useRef, useState } from "react"
import type { CalendarEvent } from "@/types/calendar"
import type { CalendarImportMode, ParsedIcsEvent } from "@/lib/ics-calendar"
import { downloadIcsFile, isAcceptedCalendarFile, parseIcsFiles } from "@/lib/ics-calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, FileUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarImportExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: CalendarEvent[]
  onImport: (
    events: ParsedIcsEvent[],
    mode: CalendarImportMode
  ) => { added: number; updated: number; skipped: number }
  t: (key: string) => string
}

export function CalendarImportExportDialog({
  open,
  onOpenChange,
  events,
  onImport,
  t,
}: CalendarImportExportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<CalendarImportMode>("skip-duplicates")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number } | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const reset = () => {
    setSelectedFiles([])
    setResult(null)
    setError(null)
    setImporting(false)
    setDragOver(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter(isAcceptedCalendarFile)
    if (list.length === 0) {
      setError(t("calendar.importInvalidFile"))
      return
    }
    setError(null)
    setSelectedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...list.filter((f) => !names.has(f.name))]
    })
  }

  const handleImport = async () => {
    if (selectedFiles.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const parsed = await parseIcsFiles(selectedFiles)
      if (parsed.events.length === 0) {
        setError(t("calendar.importEmpty"))
        setImporting(false)
        return
      }
      const stats = onImport(parsed.events, mode)
      setResult(stats)
      setSelectedFiles([])
    } catch {
      setError(t("calendar.importFailed"))
    } finally {
      setImporting(false)
    }
  }

  const handleExport = () => {
    downloadIcsFile(events, t("calendar.exportFilename"))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("calendar.importExportTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{t("calendar.importExportHint")}</p>

          <div
            className={cn(
              "flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">{t("calendar.importDropHint")}</p>
            <p className="text-xs text-muted-foreground">{t("calendar.importFormats")}</p>
            <input
              ref={inputRef}
              type="file"
              accept=".ics,.ical,.ifb,text/calendar"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ""
              }}
            />
          </div>

          {selectedFiles.length > 0 && (
            <ul className="max-h-24 space-y-1 overflow-y-auto text-sm">
              {selectedFiles.map((file) => (
                <li key={file.name} className="truncate text-muted-foreground" dir="ltr">
                  {file.name}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <Label>{t("calendar.importMode")}</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as CalendarImportMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip-duplicates">{t("calendar.importModeSkip")}</SelectItem>
                <SelectItem value="update">{t("calendar.importModeUpdate")}</SelectItem>
                <SelectItem value="add">{t("calendar.importModeAdd")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <p className="rounded-md bg-muted/50 p-3 text-sm">
              {t("calendar.importSuccess")
                .replace("{added}", String(result.added))
                .replace("{updated}", String(result.updated))
                .replace("{skipped}", String(result.skipped))}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            {t("calendar.export")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t("common.close")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleImport()}
              disabled={importing || selectedFiles.length === 0}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-1" />
                  {t("common.processing")}
                </>
              ) : (
                t("calendar.import")
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
