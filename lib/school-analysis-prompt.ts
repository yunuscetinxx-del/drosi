import type { AILearningProfile } from "@/types/ai-learning"

const SCHOOL_JSON_FORMAT = `أعد JSON فقط بدون markdown:
{
  "detectedSubject": "المادة المكتشفة (مثال: ألمانية، رياضيات، فيزياء)",
  "detectedLevel": "المستوى التقريبي (A1-C2 أو ابتدائي/متوسط/ثانوي)",
  "pageType": "textbook_exercise | textbook_reading | notes | worksheet | other",
  "visibleText": "النص المقروء من الصورة فقط، أو اكتب: غير واضح",
  "description": "وصف شامل لمحتوى الصفحة",
  "summary": "ملخص تعليمي في 2-4 جمل",
  "keyElements": ["عنصر 1", "عنصر 2"],
  "studyNotes": ["ملاحظة دراسية عملية"],
  "relatedConcepts": ["مفهوم مرتبط"],
  "grammarTopics": ["قاعدة نحوية أو مفهوم علمي"],
  "vocabulary": [{"term": "كلمة", "meaning": "معنى"}],
  "exercises": [
    {
      "number": "رقم التمرين",
      "title": "عنوان التمرين",
      "type": "matching | fill_blank | writing | reading | calculation | other",
      "explanation": "شرح التمرين وما يطلبه",
      "hints": ["تلميح 1"],
      "sampleAnswers": ["إجابة نموذجية أو خطوات الحل"]
    }
  ],
  "studyPlan": ["خطوة مراجعة مقترحة"]
}`

export interface SchoolAnalysisOptions {
  subject?: string
  level?: string
  mode?: "auto" | "manual"
  instructions?: string
  lessonTitle?: string
  lessonSubject?: string
  userProfile?: AILearningProfile | null
}

export function buildSchoolAnalysisPrompt(opts: SchoolAnalysisOptions): string {
  const profileBlock = opts.userProfile
    ? `\nملف تعلّم الطالب (استخدمه لتخصيص التحليل):\n${summarizeProfileForPrompt(opts.userProfile)}`
    : ""

  const manualBlock =
    opts.mode === "manual" && (opts.subject || opts.level)
      ? `\nالمستخدم حدّد: المادة=${opts.subject ?? "تلقائي"}، المستوى=${opts.level ?? "تلقائي"}`
      : ""

  const lessonBlock = opts.lessonTitle
    ? `\nسياق الدرس: «${opts.lessonTitle}»${opts.lessonSubject ? ` — ${opts.lessonSubject}` : ""}`
    : ""

  const instructionsBlock = opts.instructions?.trim()
    ? `\nتعليمات إضافية من المستخدم:\n${opts.instructions.trim()}`
    : ""

  return `أنت معلّم خبير يحلّل صفحات كتب مدرسية ودروس (لغات، رياضيات، علوم، فيزياء، كيمياء، أي مادة).
قاعدة حاسمة: الصورة هي المصدر الوحيد للحقائق. ابدأ بقراءة النص الظاهر فيها، ولا تستخدم معلومات من خارج الصورة أو من سياق الدرس لتخمين محتواها. إذا لم يكن النص أو جزء من الصورة مقروءاً، اكتب "غير واضح" لذلك الجزء ولا تخترع نصاً أو موضوعاً.
إذا طلب المستخدم وصفاً أو نصاً باللغة الألمانية لمستوى B1، اكتب الوصف بالألمانية الواضحة بمستوى B1، ثم أضف ترجمة عربية قصيرة بين قوسين عند الحاجة.
المطلوب تحليل الصورة بدقة بالعربية مع:
1. نسخ النص المرئي في حقل visibleText قبل أي تحليل
2. اكتشاف المادة والمستوى تلقائياً (إن لم يُحدَّدا)
3. استخراج التمارين والقواعد والمفردات الموجودة فعلاً في الصورة
4. شرح كل تمرين وطريقة الحل أو الإجابة النموذجية عند وجودها فقط
5. خطة مراجعة عملية للطالب مبنية على النص الظاهر
6. ربط التحليل بأسئلة الطالب السابقة إن وُجدت في ملف التعلّم
${lessonBlock}${manualBlock}${profileBlock}${instructionsBlock}

${SCHOOL_JSON_FORMAT}`
}

function summarizeProfileForPrompt(profile: AILearningProfile): string {
  const subjects = Object.entries(profile.subjects)
    .slice(0, 6)
    .map(([name, s]) => {
      const topics = s.topicsStudied.slice(-5).join("، ")
      const questions = s.commonQuestions.slice(-3).join(" | ")
      return `- ${name} (${s.level ?? "?"}): مواضيع=${topics || "—"}؛ أسئلة شائعة=${questions || "—"}`
    })
    .join("\n")

  const recentQs = profile.questionHistory
    .slice(-5)
    .map((q) => `• [${q.subject ?? q.topic}] ${q.question}`)
    .join("\n")

  return [
    subjects || "لا مواد مسجّلة بعد",
    profile.globalInsights.length ? `رؤى: ${profile.globalInsights.slice(-3).join("؛ ")}` : "",
    recentQs ? `آخر أسئلة:\n${recentQs}` : "",
    `أسلوب التفصيل المفضّل: ${profile.preferredDetailLevel}`,
  ]
    .filter(Boolean)
    .join("\n")
}
