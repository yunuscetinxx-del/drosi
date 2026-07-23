import type { AILearningProfile } from "@/types/ai-learning"

const SCHOOL_JSON_FORMAT = `أعد JSON فقط بدون markdown:
{
  "detectedSubject": "المادة المكتشفة (مثال: ألمانية، رياضيات، فيزياء)",
  "detectedLevel": "المستوى التقريبي (A1-C2 أو ابتدائي/متوسط/ثانوي)",
  "pageType": "textbook_exercise | textbook_reading | notes | worksheet | other",
  "visibleText": "النص المقروء من الصورة فقط، أو اكتب: غير واضح",
  "description": "وصف شامل لمحتوى الصفحة. للغة الألمانية: وصف ألماني B1 فقط",
  "markers": [{"phrase": "عبارة موجودة حرفياً في description", "note": "معناها العربي القصير", "x": 0-1000, "y": 0-1000}],
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
  const isGermanLearning = /deutsch|german|ألمان/i.test(
    `${opts.subject ?? ""} ${opts.lessonSubject ?? ""} ${opts.instructions ?? ""}`
  )
  if (isGermanLearning) return buildGermanImageLearningPrompt(opts.instructions)

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
إذا كانت المادة أو سياق الدرس ألمانية، اكتب description بالألمانية الواضحة بمستوى B1 تلقائياً، حتى لو لم يطلب المستخدم ذلك. للصور اليومية التي لا تحتوي نصاً تعليمياً واضحاً (مثل العائلة أو التسوق أو السفر أو المدرسة)، اكتب أيضاً description بالألمانية بمستوى B1 كي تصلح للتدرّب على اللغة. أضف من 3 إلى 6 عناصر markers: كل phrase يجب أن يكون موجوداً حرفياً في description، وnote ترجمتها العربية القصيرة، وx/y موقع العنصر المعني في الصورة كنسبة من 0 إلى 1000. إن لم تستطع تحديد الموقع بدقة فاختر موقعاً تقريبياً للعنصر، ولا تنشئ marker لمعلومة غير موجودة في الصورة.
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

function buildGermanImageLearningPrompt(instructions?: string): string {
  const userInstruction = instructions?.trim()
    ? `\nAdditional learner request: ${instructions.trim()}`
    : ""

  return `You are a German teacher for CEFR level B1. Analyze ONLY the attached image.

Write the image description in clear, natural German at B1 level. The description must be based only on visible image content. Do not write Arabic, Chinese, English, or any other language in the description. Do not invent details.

Return JSON only, with this exact structure:
{
  "detectedSubject": "Deutsch",
  "detectedLevel": "B1",
  "pageType": "textbook_reading",
  "visibleText": "Visible text in the image, or Leer if there is no text",
  "description": "A German B1 image description",
  "summary": "A short German summary",
  "keyElements": ["German key noun 1", "German key noun 2"],
  "studyNotes": ["A short German B1 learning tip"],
  "relatedConcepts": ["German learning topic"],
  "grammarTopics": ["German grammar topic used in the description"],
  "vocabulary": [{"term": "German word", "meaning": "Arabic meaning"}],
  "markers": [{"phrase": "Exact German phrase from description", "note": "Arabic translation", "x": 0, "y": 0}],
  "exercises": [],
  "studyPlan": ["German B1 review step"]
}

Create 3 to 6 markers for visible people or objects. Each marker phrase must occur exactly in description. x and y are approximate image coordinates from 0 to 1000.${userInstruction}`
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
