import {
  extractTitleFromImportedContent,
  looksLikeMarkdown,
  markdownToNoteHtml,
} from "@/lib/markdown-to-note-html"
import { escapeHtml, isNoteHtml, normalizeNoteContentForEditor } from "@/lib/lesson-note-content"

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "blockquote",
  "pre",
  "code",
  "a",
  "span",
  "div",
  "hr",
])

function stripUnsafeHtml(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")

  s = s.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag: string) => {
    const name = tag.toLowerCase()
    if (!ALLOWED_TAGS.has(name)) return ""
    if (name === "a") {
      const href = match.match(/href=["']([^"']+)["']/i)?.[1] ?? ""
      if (!/^https?:\/\//i.test(href)) return match.replace(/href=["'][^"']*["']/i, "")
    }
    return match.replace(/\s(on\w+|style)=["'][^"']*["']/gi, "")
  })

  return s.trim()
}

function htmlHasRichStructure(html: string): boolean {
  return /<(table|h[1-3]|ul|ol|blockquote)\b/i.test(html)
}

export function convertPasteToNoteHtml(text: string, html?: string | null): string {
  const plain = text.trim()

  if (html?.trim()) {
    const cleaned = stripUnsafeHtml(html)
    if (cleaned && htmlHasRichStructure(cleaned)) {
      return cleaned
    }
  }

  if (plain && looksLikeMarkdown(plain)) {
    return markdownToNoteHtml(plain)
  }

  if (plain && isNoteHtml(plain)) {
    return stripUnsafeHtml(plain)
  }

  return normalizeNoteContentForEditor(plain)
}

export function suggestNoteTitleFromPaste(text: string, html: string): string | null {
  return extractTitleFromImportedContent(text, html)
}

export async function readClipboardForNoteImport(): Promise<{ text: string; html: string | null }> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return { text: "", html: null }
  }

  if (!navigator.clipboard.read) {
    try {
      const text = (await navigator.clipboard.readText())?.trim() ?? ""
      return { text, html: null }
    } catch {
      return { text: "", html: null }
    }
  }

  try {
    const items = await navigator.clipboard.read()
    let text = ""
    let html: string | null = null

    for (const item of items) {
      if (!html && item.types.includes("text/html")) {
        const blob = await item.getType("text/html")
        html = (await blob.text()).trim() || null
      }
      if (!text && item.types.includes("text/plain")) {
        const blob = await item.getType("text/plain")
        text = (await blob.text()).trim()
      }
    }

    if (!text && html) {
      text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    }

    return { text, html }
  } catch {
    try {
      const text = (await navigator.clipboard.readText())?.trim() ?? ""
      return { text, html: null }
    } catch {
      return { text: "", html: null }
    }
  }
}

export async function importNoteFromClipboard(): Promise<{
  content: string
  suggestedTitle: string | null
} | null> {
  const { text, html } = await readClipboardForNoteImport()
  if (!text && !html) return null

  const content = convertPasteToNoteHtml(text, html)
  const suggestedTitle = suggestNoteTitleFromPaste(text, content)
  return { content, suggestedTitle }
}
