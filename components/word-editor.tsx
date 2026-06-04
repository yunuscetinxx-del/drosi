"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import type { Editor } from "@tiptap/react"
import { LessonImage, WordPage } from "@/types/lesson"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/locale-provider"
import {
  Plus,
  FileText,
  Trash2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Link2,
  Table2,
  Minus,
  RemoveFormatting,
  Undo2,
  Redo2,
  ImageIcon,
  ChevronDown,
  Type,
} from "lucide-react"
import "./word-editor.css"

const generateId = () => Math.random().toString(36).substring(2, 11)

const TEXT_COLORS = [
  { name: "default", value: "" },
  { name: "black", value: "#171717" },
  { name: "gray", value: "#525252" },
  { name: "red", value: "#dc2626" },
  { name: "orange", value: "#ea580c" },
  { name: "amber", value: "#d97706" },
  { name: "green", value: "#16a34a" },
  { name: "teal", value: "#0d9488" },
  { name: "blue", value: "#2563eb" },
  { name: "indigo", value: "#4f46e5" },
  { name: "purple", value: "#7c3aed" },
  { name: "pink", value: "#db2777" },
] as const

const HIGHLIGHT_COLORS = [
  { name: "yellow", value: "#fef08a" },
  { name: "lime", value: "#d9f99d" },
  { name: "green", value: "#bbf7d0" },
  { name: "cyan", value: "#a5f3fc" },
  { name: "blue", value: "#bfdbfe" },
  { name: "purple", value: "#ddd6fe" },
  { name: "pink", value: "#fbcfe8" },
  { name: "orange", value: "#fed7aa" },
  { name: "red", value: "#fecaca" },
  { name: "gray", value: "#e5e5e5" },
] as const

interface WordEditorProps {
  pages: WordPage[]
  images: LessonImage[]
  onPagesChange: (pages: WordPage[]) => void
  readOnly?: boolean
}

function ColorPalettePicker({
  colors,
  currentColor,
  onSelect,
  onClear,
  title,
  clearLabel,
  customLabel,
  children,
}: {
  colors: readonly { name: string; value: string }[]
  currentColor?: string
  onSelect: (color: string) => void
  onClear: () => void
  title: string
  clearLabel: string
  customLabel: string
  children: React.ReactNode
}) {
  const [custom, setCustom] = useState(currentColor ?? "#2563eb")

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="word-toolbar-btn h-8 w-8 shrink-0"
          title={title}
        >
          {children}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3" sideOffset={6}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
        <div className="grid grid-cols-6 gap-1.5">
          {colors.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              onClick={() => {
                if (c.value) onSelect(c.value)
                else onClear()
              }}
              className={cn(
                "h-7 w-7 rounded-md border-2 transition-transform hover:scale-110",
                !c.value
                  ? "bg-background relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-br after:from-transparent after:via-destructive/60 after:to-transparent after:rotate-45"
                  : "border-transparent",
                currentColor === c.value && c.value && "border-foreground ring-1 ring-foreground/30"
              )}
              style={c.value ? { backgroundColor: c.value } : undefined}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <label className="text-[10px] text-muted-foreground shrink-0">{customLabel}</label>
          <input
            type="color"
            value={custom.startsWith("#") ? custom : "#2563eb"}
            onChange={(e) => {
              setCustom(e.target.value)
              onSelect(e.target.value)
            }}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
          />
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
            {clearLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ToolbarButton({
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
      className="word-toolbar-btn h-8 w-8 shrink-0"
      data-active={active ? "true" : "false"}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function WordToolbar({
  editor,
  images,
  t,
}: {
  editor: Editor | null
  images: LessonImage[]
  t: (key: string) => string
}) {
  const [, setToolbarTick] = useState(0)

  useEffect(() => {
    if (!editor) return
    const bump = () => setToolbarTick((n) => n + 1)
    editor.on("selectionUpdate", bump)
    editor.on("transaction", bump)
    return () => {
      editor.off("selectionUpdate", bump)
      editor.off("transaction", bump)
    }
  }, [editor])

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined
    const url = window.prompt(t("word.link"), prev ?? "https://")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  const insertImage = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run()
  }

  const currentTextColor = editor.getAttributes("textStyle").color as string | undefined
  const currentHighlightColor = editor.getAttributes("highlight").color as string | undefined

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-card/95 px-2 py-1.5 backdrop-blur-sm">
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title={t("word.undo")}
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title={t("word.redo")}
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title={t("word.bold")}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title={t("word.italic")}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title={t("word.underline")}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title={t("word.strike")}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title={t("word.heading1")}
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title={t("word.heading2")}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title={t("word.heading3")}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title={t("word.bulletList")}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title={t("word.orderedList")}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive("taskList")}
        title={t("word.taskList")}
      >
        <ListTodo className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title={t("word.alignLeft")}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title={t("word.alignCenter")}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title={t("word.alignRight")}
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title={t("word.alignJustify")}
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      <ColorPalettePicker
        colors={TEXT_COLORS}
        currentColor={currentTextColor}
        title={t("word.textColor")}
        clearLabel={t("word.removeTextColor")}
        customLabel={t("word.customColor")}
        onSelect={(color) => editor.chain().focus().setColor(color).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
      >
        <span className="relative flex items-center justify-center">
          <Type className="h-4 w-4" />
          <span
            className="absolute bottom-0.5 left-1/2 h-1 w-3.5 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: currentTextColor || "currentColor" }}
          />
        </span>
      </ColorPalettePicker>

      <ColorPalettePicker
        colors={HIGHLIGHT_COLORS}
        currentColor={currentHighlightColor}
        title={t("word.highlightColor")}
        clearLabel={t("word.removeHighlightColor")}
        customLabel={t("word.customColor")}
        onSelect={(color) => editor.chain().focus().setHighlight({ color }).run()}
        onClear={() => editor.chain().focus().unsetHighlight().run()}
      >
        <span className="relative flex items-center justify-center">
          <Highlighter className="h-4 w-4" />
          <span
            className="absolute bottom-0.5 left-1/2 h-1 w-3.5 -translate-x-1/2 rounded-full border border-border/50"
            style={{ backgroundColor: currentHighlightColor || "#fef08a" }}
          />
        </span>
      </ColorPalettePicker>

      <ToolbarButton onClick={setLink} active={editor.isActive("link")} title={t("word.link")}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title={t("word.table")}
      >
        <Table2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title={t("word.horizontalRule")}
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        title={t("word.clearFormat")}
      >
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
            <ImageIcon className="h-4 w-4" />
            {t("word.insertImage")}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {images.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">{t("word.noLessonImages")}</div>
          ) : (
            images.map((img, idx) => (
              <DropdownMenuItem key={img.id} onClick={() => insertImage(img.url)} className="gap-2">
                <img src={img.url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                <span>
                  {t("word.selectImage")} {idx + 1}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function WordPageEditor({
  page,
  images,
  onUpdate,
  t,
  readOnly = false,
}: {
  page: WordPage
  images: LessonImage[]
  onUpdate: (updates: Partial<Pick<WordPage, "title" | "content">>) => void
  t: (key: string) => string
  readOnly?: boolean
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")

  const scheduleSave = useCallback(
    (content: string) => {
      setSaveState("saving")
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        onUpdate({ content })
        setSaveState("saved")
        saveTimer.current = null
        setTimeout(() => setSaveState("idle"), 1500)
      }, 500)
    },
    [onUpdate]
  )

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: t("word.placeholder"),
      }),
    ],
    content: page.content || "",
    editorProps: {
      attributes: {
        class: "tiptap",
        style: "color: #171717",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!readOnly) scheduleSave(ed.getHTML())
    },
  })

  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!readOnly && <WordToolbar editor={editor} images={images} t={t} />}

      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2">
        <label className="text-xs font-medium text-muted-foreground shrink-0">{t("word.pageTitle")}</label>
        <Input
          value={page.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder={t("word.pageTitlePlaceholder")}
          readOnly={readOnly}
          disabled={readOnly}
          className="h-9 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"
        />
        <Badge
          variant="secondary"
          className={cn(
            "shrink-0 text-[10px] transition-opacity",
            saveState === "idle" && "opacity-0"
          )}
        >
          {saveState === "saving" ? t("word.saving") : t("word.saved")}
        </Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="word-editor-canvas p-4 sm:p-8">
          <div className="word-editor-sheet word-editor-content">
            <EditorContent editor={editor} />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export function WordEditor({ pages, images, onPagesChange, readOnly = false }: WordEditorProps) {
  const { t } = useTranslations()
  const [activePageId, setActivePageId] = useState<string | null>(pages[0]?.id ?? null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    if (pages.length === 0) {
      setActivePageId(null)
      return
    }
    if (!activePageId || !pages.some((p) => p.id === activePageId)) {
      setActivePageId(pages[0].id)
    }
  }, [pages, activePageId])

  const createPage = () => {
    const newPage: WordPage = {
      id: generateId(),
      title: t("word.defaultPageTitle"),
      content: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    onPagesChange([...pages, newPage])
    setActivePageId(newPage.id)
  }

  const updatePage = (pageId: string, updates: Partial<Pick<WordPage, "title" | "content">>) => {
    onPagesChange(
      pages.map((p) =>
        p.id === pageId ? { ...p, ...updates, updatedAt: new Date() } : p
      )
    )
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const next = pages.filter((p) => p.id !== deleteTarget)
    onPagesChange(next)
    if (activePageId === deleteTarget) {
      setActivePageId(next[0]?.id ?? null)
    }
    setDeleteTarget(null)
  }

  const activePage = pages.find((p) => p.id === activePageId)

  return (
    <div className="word-editor-shell flex min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-52 shrink-0 flex-col border-e border-border bg-muted/20 sm:w-56">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground">{t("word.pages")}</span>
          {!readOnly && (
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={createPage}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {pages.length === 0 ? (
              <div className="px-2 py-6 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">{t("word.noPages")}</p>
                {!readOnly && (
                  <Button type="button" size="sm" variant="outline" className="mt-3 w-full" onClick={createPage}>
                    <Plus className="ml-1 h-3 w-3" />
                    {t("word.createFirst")}
                  </Button>
                )}
              </div>
            ) : (
              pages.map((page, idx) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActivePageId(page.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-start text-xs transition-colors",
                    activePageId === page.id
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-transparent hover:bg-muted/60 text-muted-foreground"
                  )}
                >
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {page.title || `${t("word.defaultPageTitle")} ${idx + 1}`}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        {!readOnly && activePage && pages.length > 1 && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(activePage.id)}
            >
              <Trash2 className="ml-1 h-3.5 w-3.5" />
              {t("word.deletePage")}
            </Button>
          </div>
        )}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {activePage ? (
          <WordPageEditor
            key={activePage.id}
            page={activePage}
            images={images}
            readOnly={readOnly}
            onUpdate={(updates) => updatePage(activePage.id, updates)}
            t={t}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <FileText className="h-14 w-14 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">{t("word.noPages")}</p>
            {!readOnly && (
              <Button onClick={createPage}>
                <Plus className="ml-2 h-4 w-4" />
                {t("word.newPage")}
              </Button>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("word.deletePage")}</AlertDialogTitle>
            <AlertDialogDescription>{t("word.deletePageConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
