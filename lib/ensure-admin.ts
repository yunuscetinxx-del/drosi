import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * ينشئ أو يحدّث حساب المدير من متغيرات البيئة عند تشغيل الخادم.
 * يتطلّب ADMIN_EMAIL و ADMIN_PASSWORD (8 أحرف على الأقل).
 * إن وُجد مستخدم بنفس البريد وليس مديراً، لا يُعدّل (لتجنّب اختطاف حساب).
 */
export async function ensureAdminUserFromEnv(): Promise<void> {
  const rawEmail = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!rawEmail || !password) return

  const email = normalizeEmail(rawEmail)
  if (!email.includes("@")) {
    console.warn("[admin] ADMIN_EMAIL غير صالح، تُجاهل إنشاء المدير.")
    return
  }
  if (password.length < 8) {
    console.warn("[admin] ADMIN_PASSWORD يجب أن تكون 8 أحرف على الأقل.")
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const existing = await prisma.user.findUnique({ where: { email } })

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        lessons: [],
        isAdmin: true,
      },
    })
    console.info(`[admin] تم إنشاء حساب المدير: ${email}`)
    return
  }

  if (!existing.isAdmin) {
    console.warn(
      `[admin] البريد ${email} مسجّل لمستخدم عادي. لن يُرقّى تلقائياً — غيّر ADMIN_EMAIL أو رقِّ الحساب يدوياً في قاعدة البيانات.`
    )
    return
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: { passwordHash, isAdmin: true },
  })
  console.info(`[admin] تمت مزامنة كلمة مرور المدير: ${email}`)
}
