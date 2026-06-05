"use client"

import { useCallback, useMemo, useState } from "react"
import type { LessonNoteEntry } from "@/types/lesson"
import { createLessonNote, sortLessonNotes } from "@/lib/lesson-notes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { ClipboardPaste, Plus, StickyNote, Trash2 } from "lucide-react"

interface LessonNotesPanelProps {
  notes: LessonNoteEntry[]
  onNotesChange: (notes: LessonNoteEntry[]) => void
  readOnly?: boolean
}

function previewText(content: string, max = 160): string {
  const t = content.trim().replace(/\s+/g, " ")
  if (!t) return ""
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function formatDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d))
  } catch {
    return ""
  }
}

export function LessonNotesPanel({
  notes: notesProp,
  onNotesChange,
  readOnly = false,
}: LessonNotesPanelProps) {
  const { t } = useTranslations()
  const notes = useMemo(() => sortLessonNotes(notesProp), [notesProp])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftContent, setDraftContent] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const editingNote = notes.find((n) => n.id === editingId) ?? null

  const openEditor = useCallback((note: LessonNoteEntry) => {
    setEditingId(note.id)
    setDraftTitle(note.title)
    setDraftContent(note.content)
  }, [])

  const closeEditor = useCallback(() => {
    setEditingId(null)
    setDraftTitle("")
    setDraftContent("")
  }, [])

  const saveEditor = useCallback(() => {
    if (!editingId) return
    const now = new Date()
    onNotesChange(
      notes.map((n) =>
        n.id === editingId
          ? {
              ...n,
              title: draftTitle,
              content: draftContent,
              updatedAt: now,
            }
          : n
      )
    )
    closeEditor()
  }, [closeEditor, draftContent, draftTitle, editingId, notes, onNotesChange])

  const addNote = useCallback(() => {
    const note = createLessonNote()
    onNotesChange([note, ...notes])
    openEditor(note)
  }, [notes, onNotesChange, openEditor])

  const pasteNewNote = useCallback(async () => {
    let text = ""
    try {
      text = (await navigator.clipboard.readText())?.trim() ?? ""
    } catch {
      /* ignore */
    }
    const note = createLessonNote(
      text ? t("lesson.notePastedTitle") : t("lesson.newNoteTitle"),
      text
    )
    onNotesChange([note, ...notes])
    openEditor(note)
  }, [notes, onNotesChange, openEditor, t])

  const pasteIntoEditor = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) return
      setDraftContent((prev) => {
        if (!prev) return text
        return `${prev}${prev.endsWith("\n") ? "" : "\n"}${text}`
      })
    } catch {
      /* ignore */
    }
  }, [])

  const confirmDelete = useCallback(() => {
    if (!deleteId) return
    onNotesChange(notes.filter((n) => n.id !== deleteId))
    if (editingId === deleteId) closeEditor()
    setDeleteId(null)
  }, [closeEditor, deleteId, editingId, notes, onNotesChange])

  const charCount = draftContent.length
  const lineCount = draftContent ? draftContent.split("\n").length : 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            {t("lesson.personalNotes")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{t("lesson.notesMultiHint")}</p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void pasteNewNote()}>
              <ClipboardPaste className="h-4 w-4 ml-1" />
              {t("lesson.pasteNote")}
            </Button>
            <Button type="button" size="sm" onClick={addNote}>
              <Plus className="h-4 w-4 ml-1" />
              {t("lesson.newNote")}
            </Button>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <StickyNote className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground max-w-sm">{t("lesson.notesEmpty")}</p>
            {!readOnly && (
              <Button type="button" onClick={addNote}>
                <Plus className="h-4 w-4 ml-1" />
                {t("lesson.newNote")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => openEditor(note)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {note.title.trim() || t("lesson.untitledNote")}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]">
                      {previewText(note.content) || t("lesson.noteEmptyPreview")}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground/80">
                      {formatDate(note.updatedAt)} · {note.content.length} {t("lesson.chars")}
                    </p>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteId(note.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-4 py-3 sm:px-6">
            <DialogTitle>{t("lesson.editNote")}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder={t("lesson.noteTitlePlaceholder")}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {editingNote && (
              <p className="text-xs text-muted-foreground">
                {t("lesson.noteLastEdit")}: {formatDate(editingNote.updatedAt)}
              </p>
            )}
            <Textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder={t("lesson.noteContentPlaceholder")}
              className="min-h-[min(50vh,420px)] resize-y font-mono text-sm leading-relaxed"
              readOnly={readOnly}
              disabled={readOnly}
            />
            <p className="text-xs text-muted-foreground">
              {charCount} {t("lesson.chars")} · {lineCount} {t("lesson.lines")}
            </p>
          </div>
          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            {!readOnly && (
              <Button type="button" variant="outline" onClick={() => void pasteIntoEditor()}>
                <ClipboardPaste className="h-4 w-4 ml-1" />
                {t("lesson.pasteNote")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={closeEditor}>
              {readOnly ? t("common.close") : t("common.cancel")}
            </Button>
            {!readOnly && (
              <Button type="button" onClick={saveEditor}>
                {t("common.save")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lesson.deleteNoteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("lesson.deleteNoteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
