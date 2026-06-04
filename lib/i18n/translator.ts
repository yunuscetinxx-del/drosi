import type { Messages } from "./messages/ar"

interface NestedMessages {
  [key: string]: string | NestedMessages
}

function getNestedValue(obj: NestedMessages, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as NestedMessages)[key]
    }
    return undefined
  }, obj)

  return typeof value === "string" ? value : undefined
}

export function createTranslator(messages: Messages) {
  return function t(key: string, params?: Record<string, string | number>): string {
    const value = getNestedValue(messages as NestedMessages, key) ?? key
    if (!params) return value
    return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
  }
}

export type Translator = ReturnType<typeof createTranslator>
