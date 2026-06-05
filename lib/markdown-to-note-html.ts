import { escapeHtml } from "@/lib/lesson-note-content"

function parseInlineMarkdown(text: string): string {
  let s = escapeHtml(text)
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>")
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  s = s.replace(/__(.+?)__/g, "<strong>$1</strong>")
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>")
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  return s
}

function isTableRow(line: string): boolean {
  const t = line.trim()
  return t.startsWith("|") && t.endsWith("|") && t.includes("|")
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s|:-]+\|?$/.test(line.trim()) && line.includes("-")
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim())
}

function renderTable(lines: string[]): string {
  const rows = lines.filter((l) => l.trim() && !isTableSeparator(l))
  if (rows.length === 0) return ""

  const parsed = rows.map(parseTableRow)
  const header = parsed[0]
  const body = parsed.slice(1)

  const thead = `<thead><tr>${header.map((c) => `<th>${parseInlineMarkdown(c)}</th>`).join("")}</tr></thead>`
  const tbody = body.length
    ? `<tbody>${body
        .map(
          (row) =>
            `<tr>${row.map((c) => `<td>${parseInlineMarkdown(c)}</td>`).join("")}</tr>`
        )
        .join("")}</tbody>`
    : ""

  return `<table class="note-table">${thead}${tbody}</table>`
}

function parseBlock(block: string): string {
  const lines = block.split("\n").filter((l) => l.trim() !== "")
  if (lines.length === 0) return ""

  if (lines.every(isTableRow) || (lines.filter(isTableRow).length >= 2 && lines.some(isTableSeparator))) {
    return renderTable(lines)
  }

  const first = lines[0].trim()
  if (/^#{1,3}\s+/.test(first)) {
    const level = first.match(/^#+/)?.[0].length ?? 1
    const tag = `h${Math.min(level, 3)}`
    const text = first.replace(/^#+\s+/, "")
    return `<${tag}>${parseInlineMarkdown(text)}</${tag}>`
  }

  if (/^[-*]\s+/.test(first)) {
    const items = lines
      .filter((l) => /^[-*]\s+/.test(l.trim()))
      .map((l) => `<li>${parseInlineMarkdown(l.trim().replace(/^[-*]\s+/, ""))}</li>`)
    return items.length ? `<ul>${items.join("")}</ul>` : ""
  }

  if (/^\d+\.\s+/.test(first)) {
    const items = lines
      .filter((l) => /^\d+\.\s+/.test(l.trim()))
      .map((l) => `<li>${parseInlineMarkdown(l.trim().replace(/^\d+\.\s+/, ""))}</li>`)
    return items.length ? `<ol>${items.join("")}</ol>` : ""
  }

  if (/^>\s+/.test(first)) {
    const quote = lines.map((l) => l.trim().replace(/^>\s?/, "")).join(" ")
    return `<blockquote><p>${parseInlineMarkdown(quote)}</p></blockquote>`
  }

  if (/^```/.test(first)) {
    const code = lines.slice(1).filter((l) => !l.trim().startsWith("```")).join("\n")
    return `<pre><code>${escapeHtml(code)}</code></pre>`
  }

  const paragraph = lines.map((l) => parseInlineMarkdown(l.trim())).join("<br>")
  return `<p>${paragraph}</p>`
}

export function looksLikeMarkdown(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return (
    /^#{1,3}\s/m.test(t) ||
    /^\|.+\|$/m.test(t) ||
    /^[-*]\s+/m.test(t) ||
    /^\d+\.\s+/m.test(t) ||
    /\*\*[^*]+\*\*/.test(t) ||
    /^>\s+/m.test(t) ||
    /\[.+\]\(.+\)/.test(t)
  )
}

export function markdownToNoteHtml(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n").trim()
  if (!normalized) return ""

  const blocks = normalized.split(/\n{2,}/)
  const html = blocks.map(parseBlock).filter(Boolean).join("")
  return html || `<p>${parseInlineMarkdown(normalized.replace(/\n/g, " "))}</p>`
}

export function extractTitleFromImportedContent(text: string, html: string): string | null {
  const hMatch = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)
  if (hMatch?.[1]) {
    const plain = hMatch[1].replace(/<[^>]+>/g, "").trim()
    if (plain) return plain.slice(0, 120)
  }

  const firstLine = text.split("\n").find((l) => l.trim())?.trim() ?? ""
  if (!firstLine) return null
  const heading = firstLine.replace(/^#+\s+/, "").replace(/^[-*]\s+/, "")
  if (heading.length > 3 && heading.length <= 120) return heading
  return null
}
