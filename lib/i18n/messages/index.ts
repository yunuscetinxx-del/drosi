import type { Locale } from "../config"
import { messages as ar } from "./ar"
import { messages as en } from "./en"
import { messages as de } from "./de"

const allMessages = { ar, en, de } as const

export function getMessages(locale: Locale) {
  return allMessages[locale]
}

export type { Messages } from "./ar"
