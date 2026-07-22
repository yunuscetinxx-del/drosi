"use client"

import { useEffect, useState } from "react"
import { Volume2, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isSpeechSupported, speakText, stopSpeaking } from "@/lib/text-to-speech"

interface ReadAloudButtonProps {
  text: string
  label?: string
  className?: string
}

/** زر صغير يقرأ النص صوتياً مع اكتشاف تلقائي للغة (عربي/إنجليزي/ألماني). */
export function ReadAloudButton({ text, label, className }: ReadAloudButtonProps) {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(isSpeechSupported())
  }, [])

  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  if (!supported) return null

  const handleClick = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    if (!text.trim()) return
    setSpeaking(true)
    speakText(text, () => setSpeaking(false))
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("shrink-0 text-muted-foreground hover:text-foreground", className)}
      title={label}
      aria-label={label}
      disabled={!text.trim() && !speaking}
      onClick={handleClick}
    >
      {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  )
}
