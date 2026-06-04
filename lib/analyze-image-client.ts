import type { ImageAIAnalysis } from "@/types/lesson"

export async function requestImageAnalysis(
  imageUrl: string,
  instructions?: string
): Promise<
  | {
      ok: true
      analysis: Omit<ImageAIAnalysis, "analyzedAt">
    }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      instructions: instructions?.trim() || undefined,
    }),
  })

  const data = (await res.json()) as {
    analysis?: Omit<ImageAIAnalysis, "analyzedAt">
    error?: string
  }

  if (!res.ok || data.error) {
    return { ok: false, error: data.error ?? "تعذّر تحليل الصورة" }
  }

  if (!data.analysis) {
    return { ok: false, error: "تعذّر تحليل الصورة" }
  }

  return { ok: true, analysis: data.analysis }
}
