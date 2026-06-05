export function isNoteHtml(content: string): boolean {
  const t = content.trim()
  return t.startsWith("<") && /<[a-z][\s\S]*>/i.test(t)
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** يحوّل النص العادي القديم إلى HTML بسيط للمحرر */
export function normalizeNoteContentForEditor(content: string): string {
  const t = content.trim()
  if (!t) return ""
  if (isNoteHtml(t)) return content
  return `<p>${escapeHtml(t).replace(/\n/g, "<br>")}</p>`
}

export function notePreviewText(content: string, max = 160): string {
  const plain = isNoteHtml(content)
    ? content
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim()
    : content.trim().replace(/\s+/g, " ")
  if (!plain) return ""
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}
