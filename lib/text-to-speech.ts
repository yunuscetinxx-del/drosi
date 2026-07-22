/**
 * قراءة النصوص صوتياً عبر Web Speech API مع اكتشاف تلقائي للغة (عربي/ألماني/إنجليزي)،
 * واختيار أفضل صوت متاح تلقائياً، مع إمكانية للمستخدم بتخصيص الصوت والسرعة والنبرة
 * (محفوظة محلياً في المتصفح — لا حاجة لخادم).
 *
 * ملاحظة: جودة الأصوات تعتمد كلياً على ما هو مثبّت في نظام التشغيل/المتصفح (Web Speech API).
 * لا يوجد "نموذج ذكاء اصطناعي" يمكن استبداله هنا مجاناً بدون ربط خدمة سحابية مدفوعة —
 * ما يوفره هذا الملف هو اختيار أذكى لأفضل صوت متاح + تحكم كامل بالسرعة/النبرة/الصوت المفضّل.
 */

export type SpeechLocale = "ar-SA" | "de-DE" | "en-US"

export const SPEECH_LOCALES: SpeechLocale[] = ["ar-SA", "de-DE", "en-US"]

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/
const GERMAN_RE =
  /[äöüßÄÖÜ]|\b(und|nicht|ist|sind|der|die|das|mit|für|eine?|auch|über|während|wird|werden|kann|müssen|schon|noch|nur|sehr|aber|oder)\b/i

/** يكتشف لغة النص: عربي إن وُجدت أحرف عربية، ثم ألماني، وإلا إنجليزي كافتراضي. */
export function detectSpeechLocale(text: string): SpeechLocale {
  if (ARABIC_RE.test(text)) return "ar-SA"
  if (GERMAN_RE.test(text)) return "de-DE"
  return "en-US"
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

// ---------------------------------------------------------------------------
// تفضيلات المستخدم (محفوظة محلياً في المتصفح)
// ---------------------------------------------------------------------------

export type SpeechPrefs = {
  rate: number
  pitch: number
  voiceURIByLocale: Partial<Record<SpeechLocale, string>>
}

const PREFS_KEY = "durusi_tts_prefs"

const DEFAULT_SPEECH_PREFS: SpeechPrefs = {
  rate: 1,
  pitch: 1,
  voiceURIByLocale: {},
}

export function getSpeechPrefs(): SpeechPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_SPEECH_PREFS }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_SPEECH_PREFS }
    const parsed = JSON.parse(raw) as Partial<SpeechPrefs>
    return {
      rate: typeof parsed.rate === "number" ? parsed.rate : DEFAULT_SPEECH_PREFS.rate,
      pitch: typeof parsed.pitch === "number" ? parsed.pitch : DEFAULT_SPEECH_PREFS.pitch,
      voiceURIByLocale: parsed.voiceURIByLocale ?? {},
    }
  } catch {
    return { ...DEFAULT_SPEECH_PREFS }
  }
}

export function setSpeechPrefs(patch: Partial<SpeechPrefs>): SpeechPrefs {
  const next = { ...getSpeechPrefs(), ...patch }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    } catch {
      /* ignore quota/serialization errors */
    }
  }
  return next
}

export function setLocaleVoice(locale: SpeechLocale, voiceURI: string | null): SpeechPrefs {
  const prefs = getSpeechPrefs()
  const voiceURIByLocale = { ...prefs.voiceURIByLocale }
  if (voiceURI) voiceURIByLocale[locale] = voiceURI
  else delete voiceURIByLocale[locale]
  return setSpeechPrefs({ voiceURIByLocale })
}

// ---------------------------------------------------------------------------
// الأصوات المتاحة في المتصفح
// ---------------------------------------------------------------------------

/** بعض المتصفحات (خصوصاً Chrome) تُحمّل قائمة الأصوات بشكل غير متزامن؛ ينتظر جاهزيتها. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([])
  const synth = window.speechSynthesis
  const existing = synth.getVoices()
  if (existing.length > 0) return Promise.resolve(existing)
  return new Promise((resolve) => {
    const onChange = () => {
      synth.removeEventListener("voiceschanged", onChange)
      resolve(synth.getVoices())
    }
    synth.addEventListener("voiceschanged", onChange)
    // شبكة أمان: بعض المتصفحات لا تُطلق الحدث إطلاقاً
    setTimeout(() => {
      synth.removeEventListener("voiceschanged", onChange)
      resolve(synth.getVoices())
    }, 1000)
  })
}

/** يرجّح جودة الصوت — يُفضّل الأصوات الشبكية/العصبية الطبيعية على المحركات الآلية القديمة. */
function scoreVoiceQuality(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  let score = 0
  if (voice.localService === false) score += 2 // أصوات الشبكة عادة أوضح من محرك النظام المحلي
  if (/neural|natural|online|premium|enhanced|wavenet|studio/.test(name)) score += 4
  if (/google/.test(name)) score += 2
  if (/desktop|compact|espeak|robot|legacy/.test(name)) score -= 4
  if (voice.default) score += 1
  return score
}

/** يرجع الأصوات المطابقة للغة معيّنة (بادئة رمز اللغة)، مرتّبة من الأفضل جودة إلى الأقل. */
export function getVoicesForLocale(locale: SpeechLocale): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return []
  const prefix = locale.split("-")[0].toLowerCase()
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(prefix))
    .sort((a, b) => scoreVoiceQuality(b) - scoreVoiceQuality(a))
}

/** تخمين تقريبي (غير مضمون) لجنس الصوت من اسمه — بعض المحركات لا توفر هذه المعلومة أصلاً. */
const FEMALE_NAME_HINTS =
  /female|zeira|salma|hoda|naia|amira|laila|katja|petra|anna|emma|samantha|victoria|susan|karen|zira|hedda|amal/i
const MALE_NAME_HINTS =
  /male|hamed|naayf|maged|tarik|stefan|markus|yannick|daniel|alex(?!a)|david|mark|fred|george|rishi/i

export function guessVoiceGender(voice: SpeechSynthesisVoice): "male" | "female" | "unknown" {
  if (FEMALE_NAME_HINTS.test(voice.name)) return "female"
  if (MALE_NAME_HINTS.test(voice.name)) return "male"
  return "unknown"
}

function pickVoice(locale: SpeechLocale): SpeechSynthesisVoice | undefined {
  if (!isSpeechSupported()) return undefined
  const prefs = getSpeechPrefs()
  const preferredURI = prefs.voiceURIByLocale[locale]
  const candidates = getVoicesForLocale(locale)
  if (preferredURI) {
    const chosen = candidates.find((v) => v.voiceURI === preferredURI)
    if (chosen) return chosen
  }
  if (candidates.length > 0) return candidates[0]
  // لا يوجد صوت مطابق للغة تحديداً — كحل أخير جرّب أي صوت افتراضي متاح
  const all = window.speechSynthesis.getVoices()
  return all.find((v) => v.default) ?? all[0]
}

export type SpeakOptions = {
  rate?: number
  pitch?: number
  locale?: SpeechLocale
}

/** يقرأ نصاً صوتياً بعد اكتشاف لغته تلقائياً (أو حسب locale إن مُرِّر)؛ يُلغي أي قراءة جارية أولاً. */
export function speakText(text: string, onEnd?: () => void, options?: SpeakOptions): void {
  if (!isSpeechSupported()) return
  const trimmed = text.trim()
  if (!trimmed) return
  const synth = window.speechSynthesis
  synth.cancel()
  const prefs = getSpeechPrefs()
  const utterance = new SpeechSynthesisUtterance(trimmed)
  const locale = options?.locale ?? detectSpeechLocale(trimmed)
  utterance.lang = locale
  utterance.rate = options?.rate ?? prefs.rate
  utterance.pitch = options?.pitch ?? prefs.pitch
  const voice = pickVoice(locale)
  if (voice) utterance.voice = voice
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()
  synth.speak(utterance)
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
