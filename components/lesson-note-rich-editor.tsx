"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Link from "@tiptap/extension-link"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import type { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { normalizeNoteContentForEditor } from "@/lib/lesson-note-content"
import { useTranslations } from "@/components/locale-provider"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Palette,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react"
import "./lesson-note-content.css"

const TEXT_COLORS = [
  "#171717",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
  "#db2777",
] as const

const HIGHLIGHT_COLORS = [
  "#fef08a",
  "#bbf7d0",
  "#bfdbfe",
  "#ddd6fe",
  "#fbcfe8",
  "#fed7aa",
] as const

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      data-active={active ? "true" : undefined}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function NoteToolbar({ editor, t }: { editor: Editor | null; t: (k: string) => string }) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!editor) return
    const bump = () => tick((n) => n + 1)
    editor.on("selectionUpdate", bump)
    editor.on("transaction", bump)
    return () => {
      editor.off("selectionUpdate", bump)
      editor.off("transaction", bump)
    }
  }, [editor])

  if (!editor) return null

  const textColor = editor.getAttributes("textStyle").color as string | undefined
  const hlColor = editor.getAttributes("highlight").color as string | undefined

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title={t("word.undo")}>
        <Undo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title={t("word.redo")}>
        <Redo2 className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title={t("word.bold")}>
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title={t("word.italic")}>
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title={t("word.underline")}>
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title={t("word.strike")}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title={t("lesson.noteTextColor")}>
            <Palette className="h-4 w-4" style={{ color: textColor || undefined }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex flex-wrap gap-1.5 max-w-[10rem]">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="h-6 w-6 rounded-full border border-border"
                style={{ background: c }}
                onClick={() => editor.chain().focus().setColor(c).run()}
              />
            ))}
            <button
              type="button"
              className="h-6 px-2 text-xs rounded border"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              {t("lesson.noteClearColor")}
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title={t("lesson.noteHighlight")}>
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex flex-wrap gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="h-6 w-6 rounded border border-border"
                style={{ background: c }}
                onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
              />
            ))}
            <button
              type="button"
              className="h-6 px-2 text-xs rounded border"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              {t("lesson.noteClearHighlight")}
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <div className="mx-1 h-6 w-px bg-border" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title={t("word.heading1")}>
        <Heading1 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title={t("word.heading2")}>
        <Heading2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title={t("word.heading3")}>
        <Heading3 className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title={t("word.bulletList")}>
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title={t("word.orderedList")}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" />
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title={t("word.alignLeft")}>
        <AlignLeft className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title={t("word.alignCenter")}>
        <AlignCenter className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title={t("word.alignRight")}>
        <AlignRight className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title={t("word.clearFormat")}>
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarBtn>
    </div>
  )
}

interface LessonNoteRichEditorProps {
  content: string
  placeholder?: string
  readOnly?: boolean
  onChange: (html: string) => void
}

export function LessonNoteRichEditor({
  content,
  placeholder,
  readOnly = false,
  onChange,
}: LessonNoteRichEditorProps) {
  const { t } = useTranslations()
  const initial = normalizeNoteContentForEditor(content)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: placeholder ?? t("lesson.noteContentPlaceholder"),
      }),
    ],
    content: initial,
    onUpdate: ({ editor: ed }) => {
      if (!readOnly) onChangeRef.current(ed.getHTML())
    },
  })

  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  useEffect(() => {
    if (!editor) return
    const normalized = normalizeNoteContentForEditor(content)
    if (editor.getHTML() !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false })
    }
  }, [content, editor])

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text || !editor) return
      editor.chain().focus().insertContent(text.replace(/\n/g, "<br>")).run()
    } catch {
      /* ignore */
    }
  }, [editor])

  return (
    <div className="lesson-note-editor-wrap flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      {!readOnly && (
        <>
          <NoteToolbar editor={editor} t={t} />
          <div className="border-b border-border px-3 py-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => void pasteFromClipboard()}>
              {t("lesson.pasteNote")}
            </Button>
          </div>
        </>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <EditorContent editor={editor} className="lesson-note-content" />
      </div>
    </div>
  )
}

/** عرض HTML منسّق للملاحظة */
export function LessonNoteHtmlView({ html }: { html: string }) {
  const normalized = normalizeNoteContentForEditor(html)
  return (
    <div className="lesson-note-viewer min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-8">
      <div
        className="lesson-note-sheet lesson-note-content"
        dangerouslySetInnerHTML={{ __html: normalized || `<p class="text-muted-foreground"></p>` }}
      />
    </div>
  )
}
