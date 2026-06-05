"use client"

import { useCallback, useMemo, useState } from "react"
import type { LessonNoteEntry } from "@/types/lesson"
import { createLessonNote, sortLessonNotes } from "@/lib/lesson-notes"
import { notePreviewText } from "@/lib/lesson-note-content"
import { LessonNoteHtmlView, LessonNoteRichEditor } from "@/components/lesson-note-rich-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ClipboardPaste, Pencil, Plus, StickyNote, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LessonNotesPanelProps {
  notes: LessonNoteEntry[]
  onNotesChange: (notes: LessonNoteEntry[]) => void
  readOnly?: boolean
}

const NOTE_DIALOG_CLASS =
  "flex h-[min(94vh,920px)] w-[min(98vw,72rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"

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
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftContent, setDraftContent] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const viewingNote = notes.find((n) => n.id === viewingId) ?? null
  const editingNote = notes.find((n) => n.id === editingId) ?? null

  const openViewer = useCallback((note: LessonNoteEntry) => {
    setViewingId(note.id)
  }, [])

  const closeViewer = useCallback(() => {
    setViewingId(null)
  }, [])

  const openEditor = useCallback((note: LessonNoteEntry) => {
    setEditingId(note.id)
    setDraftTitle(note.title)
    setDraftContent(note.content)
  }, [])

  const openEditorFromView = useCallback(() => {
    if (!viewingNote) return
    closeViewer()
    openEditor(viewingNote)
  }, [closeViewer, openEditor, viewingNote])

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
      text ? `<p>${text.replace(/\n/g, "<br>")}</p>` : ""
    )
    onNotesChange([note, ...notes])
    openEditor(note)
  }, [notes, onNotesChange, openEditor, t])

  const confirmDelete = useCallback(() => {
    if (!deleteId) return
    onNotesChange(notes.filter((n) => n.id !== deleteId))
    if (editingId === deleteId) closeEditor()
    if (viewingId === deleteId) closeViewer()
    setDeleteId(null)
  }, [closeEditor, closeViewer, deleteId, editingId, notes, onNotesChange, viewingId])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            {t("lesson.personalNotes")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{t("lesson.notesRichHint")}</p>
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => openViewer(note)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {note.title.trim() || t("lesson.untitledNote")}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]">
                      {notePreviewText(note.content) || t("lesson.noteEmptyPreview")}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground/80">
                      {formatDate(note.updatedAt)}
                    </p>
                  </div>
                  {!readOnly && (
                    <div className="flex shrink-0 flex-col">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={t("lesson.editNote")}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditor(note)
                        }}
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title={t("common.delete")}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(note.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={viewingId !== null} onOpenChange={(open) => !open && closeViewer()}>
        <DialogContent className={cn(NOTE_DIALOG_CLASS)}>
          <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6">
            <DialogTitle className="text-xl">
              {viewingNote?.title.trim() || t("lesson.untitledNote")}
            </DialogTitle>
            {viewingNote && (
              <p className="text-xs text-muted-foreground pt-1">
                {t("lesson.noteLastEdit")}: {formatDate(viewingNote.updatedAt)}
              </p>
            )}
          </DialogHeader>
          {viewingNote && <LessonNoteHtmlView html={viewingNote.content} />}
          <DialogFooter className="shrink-0 border-t px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={closeViewer}>
              {t("common.close")}
            </Button>
            {!readOnly && (
              <Button type="button" onClick={openEditorFromView}>
                <Pencil className="h-4 w-4 ml-1" />
                {t("lesson.editNote")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className={cn(NOTE_DIALOG_CLASS)}>
          <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6">
            <DialogTitle>{t("lesson.editNote")}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 sm:px-6">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder={t("lesson.noteTitlePlaceholder")}
              className="text-lg font-semibold"
              readOnly={readOnly}
              disabled={readOnly}
            />
            <LessonNoteRichEditor
              content={draftContent}
              readOnly={readOnly}
              onChange={setDraftContent}
            />
          </div>
          <DialogFooter className="shrink-0 border-t px-4 py-3 sm:px-6">
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
