/**
 * SQLite لا يدعم نوع Json في Prisma — نخزّن هذه الحقول كنص JSON (String) ونحوّلها يدوياً.
 * استخدم هاتين الدالتين عند القراءة/الكتابة من/إلى أعمدة مثل lessons وcalendarEvents وscope.
 */

export function stringifyJsonColumn(value: unknown): string {
  return JSON.stringify(value ?? null)
}

export function parseJsonColumn<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === "") return fallback
  try {
    const parsed = JSON.parse(raw)
    return (parsed ?? fallback) as T
  } catch {
    return fallback
  }
}
