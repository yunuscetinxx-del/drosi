import * as jose from "jose"

/** Used when AUTH_SECRET is missing (development only — set AUTH_SECRET in production). */
const DEV_FALLBACK_SECRET = "dev-insecure-auth-secret-min-16"

export function getAuthSecretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[auth] AUTH_SECRET is missing or shorter than 16 characters. Using insecure fallback; set AUTH_SECRET in production."
      )
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET)
  }
  return new TextEncoder().encode(s)
}

export async function createSessionToken(userId: string, email: string): Promise<string> {
  return new jose.SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getAuthSecretKey())
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getAuthSecretKey())
    const userId = payload.sub
    const email = typeof payload.email === "string" ? payload.email : undefined
    if (!userId || !email) return null
    return { userId, email }
  } catch {
    return null
  }
}
