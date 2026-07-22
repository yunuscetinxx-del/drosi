"use client"

import { useEffect, useMemo, useState } from "react"
import { Volume2, Square } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "@/components/locale-provider"
import {
  SPEECH_LOCALES,
  getSpeechPrefs,
  getVoicesForLocale,
  guessVoiceGender,
  isSpeechSupported,
  loadVoices,
  setLocaleVoice,
  setSpeechPrefs,
  speakText,
  stopSpeaking,
  type SpeechLocale,
} from "@/lib/text-to-speech"

const AUTO_VOICE_VALUE = "__auto__"

const SAMPLE_TEXT: Record<SpeechLocale, string> = {
  "ar-SA": "مرحباً، هذا مثال على صوت القراءة.",
  "de-DE": "Hallo, das ist ein Beispiel für die Sprachausgabe.",
  "en-US": "Hello, this is an example of the text to speech voice.",
}

const LOCALE_LABEL_KEY: Record<SpeechLocale, string> = {
  "ar-SA": "ttsSettings.languageAr",
  "de-DE": "ttsSettings.languageDe",
  "en-US": "ttsSettings.languageEn",
}

export function TtsSettingsPanel() {
  const { t } = useTranslations()
  const [supported, setSupported] = useState(true)
  const [voicesByLocale, setVoicesByLocale] = useState<
    Record<SpeechLocale, SpeechSynthesisVoice[]>
  >({ "ar-SA": [], "de-DE": [], "en-US": [] })
  const [prefs, setPrefsState] = useState(() => getSpeechPrefs())
  const [testingLocale, setTestingLocale] = useState<SpeechLocale | null>(null)

  useEffect(() => {
    setSupported(isSpeechSupported())
    let cancelled = false
    void loadVoices().then(() => {
      if (cancelled) return
      setVoicesByLocale({
        "ar-SA": getVoicesForLocale("ar-SA"),
        "de-DE": getVoicesForLocale("de-DE"),
        "en-US": getVoicesForLocale("en-US"),
      })
    })
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [])

  const genderLabel = useMemo(
    () => ({
      male: t("ttsSettings.male"),
      female: t("ttsSettings.female"),
      unknown: "",
    }),
    [t]
  )

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            {t("ttsSettings.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("ttsSettings.notSupported")}</p>
        </CardContent>
      </Card>
    )
  }

  function handleVoiceChange(locale: SpeechLocale, voiceURI: string) {
    setLocaleVoice(locale, voiceURI === AUTO_VOICE_VALUE ? null : voiceURI)
    setPrefsState(getSpeechPrefs())
  }

  function handleRateChange(values: number[]) {
    const rate = values[0]
    setPrefsState(setSpeechPrefs({ rate }))
  }

  function handlePitchChange(values: number[]) {
    const pitch = values[0]
    setPrefsState(setSpeechPrefs({ pitch }))
  }

  function handleTest(locale: SpeechLocale) {
    if (testingLocale === locale) {
      stopSpeaking()
      setTestingLocale(null)
      return
    }
    setTestingLocale(locale)
    speakText(SAMPLE_TEXT[locale], () => setTestingLocale((cur) => (cur === locale ? null : cur)), {
      locale,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          {t("ttsSettings.title")}
        </CardTitle>
        <CardDescription>{t("ttsSettings.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {SPEECH_LOCALES.map((locale) => {
            const voices = voicesByLocale[locale]
            const currentValue = prefs.voiceURIByLocale[locale] ?? AUTO_VOICE_VALUE
            return (
              <div key={locale} className="space-y-1.5">
                <Label>{t(LOCALE_LABEL_KEY[locale])}</Label>
                <div className="flex items-center gap-2">
                  <Select value={currentValue} onValueChange={(v) => handleVoiceChange(locale, v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_VOICE_VALUE}>
                        {t("ttsSettings.autoVoice")}
                      </SelectItem>
                      {voices.map((voice) => {
                        const gender = guessVoiceGender(voice)
                        return (
                          <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name}
                            {gender !== "unknown" ? ` — ${genderLabel[gender]}` : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title={t("ttsSettings.testButton")}
                    onClick={() => handleTest(locale)}
                  >
                    {testingLocale === locale ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {voices.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("ttsSettings.noVoicesForLocale")}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("ttsSettings.rateLabel")}</Label>
            <span className="text-xs text-muted-foreground">{prefs.rate.toFixed(1)}x</span>
          </div>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={[prefs.rate]}
            onValueChange={handleRateChange}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("ttsSettings.pitchLabel")}</Label>
            <span className="text-xs text-muted-foreground">{prefs.pitch.toFixed(1)}</span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={[prefs.pitch]}
            onValueChange={handlePitchChange}
          />
        </div>

        <p className="text-xs text-muted-foreground">{t("ttsSettings.hint")}</p>
      </CardContent>
    </Card>
  )
}
