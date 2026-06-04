const JSON_FORMAT = `قدّم التحليل بالتنسيق JSON التالي حرفياً بدون أي markdown أو \\\`\\\`\\\` أو نص خارج الـ JSON:
{
  "description": "وصف شامل للصورة",
  "keyElements": ["عنصر 1", "عنصر 2", "عنصر 3"],
  "studyNotes": ["ملاحظة دراسية 1", "ملاحظة دراسية 2", "ملاحظة دراسية 3"],
  "relatedConcepts": ["مفهوم مرتبط 1", "مفهوم مرتبط 2"]
}`

export function buildImageAnalysisPrompt(instructions?: string | null): string {
  const base = `أنت مساعد تعليمي متخصص في تحليل الصور التعليمية. قم بتحليل هذه الصورة وأعطِ تحليلاً شاملاً باللغة العربية.

المطلوب:
1. وصف شامل لمحتوى الصورة
2. تحديد العناصر الرئيسية والمفاهيم المهمة
3. ملاحظات دراسية مفيدة للطالب
4. مفاهيم مرتبطة يمكن البحث عنها`

  const trimmed = instructions?.trim()
  if (!trimmed) {
    return `${base}

${JSON_FORMAT}`
  }

  return `${base}

تعليمات المستخدم (اتبعها بدقة — لها الأولوية على التعليمات الافتراضية):
${trimmed}

${JSON_FORMAT}`
}

export function formatAnalysisForNotes(
  analysis: {
    description: string
    keyElements: string[]
    studyNotes: string[]
    relatedConcepts: string[]
  },
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  return [
    t("imageEditor.analysisExportTitle"),
    t("imageEditor.analysisExportDescription", { description: analysis.description }),
    t("imageEditor.analysisExportElements", { elements: analysis.keyElements.join(", ") }),
    t("imageEditor.analysisExportNotes", { notes: analysis.studyNotes.join(" | ") }),
  ].join("\n")
}
