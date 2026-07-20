/** رفع صورة (data URL) إلى تخزين الخادم المحلي؛ يُرجع مسار الملف المحفوظ أو null عند الفشل. */
export async function uploadImageDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const res = await fetch("/api/uploads", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { url?: string }
    return typeof data.url === "string" ? data.url : null
  } catch {
    return null
  }
}
