import { randomBytes } from "crypto"

export { buildShareUrl } from "@/lib/public-app-url"

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url")
}
