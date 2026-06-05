import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"
import { getAuthSecretKey } from "@/lib/auth-session"

const ALGO = "aes-256-gcm"
const SALT = "durusi-gemini-key-v1"

function deriveKey(): Buffer {
  const secret = Buffer.from(getAuthSecretKey())
  return scryptSync(secret, SALT, 32)
}

export function encryptApiKey(plain: string): string {
  const key = deriveKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`
}

export function decryptApiKey(stored: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = stored.split(".")
    if (!ivB64 || !tagB64 || !dataB64) return null
    const key = deriveKey()
    const iv = Buffer.from(ivB64, "base64url")
    const tag = Buffer.from(tagB64, "base64url")
    const data = Buffer.from(dataB64, "base64url")
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(data), decipher.final()])
    return plain.toString("utf8")
  } catch {
    return null
  }
}

export function keyHint(plain: string): string {
  const trimmed = plain.trim()
  if (trimmed.length <= 4) return trimmed
  return trimmed.slice(-4)
}
