import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_SESSION_COOKIE } from "@/lib/auth-constants"
import { verifySessionToken } from "@/lib/auth-session"

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization")
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i)
    if (m?.[1]) return m[1].trim()
  }
  return request.cookies.get(AUTH_SESSION_COOKIE)?.value ?? null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/login")) return NextResponse.next()
  if (pathname === "/") return NextResponse.next()
  if (pathname.startsWith("/pricing")) return NextResponse.next()
  if (pathname.startsWith("/share/")) return NextResponse.next()
  if (pathname.startsWith("/api/share/")) return NextResponse.next()
  if (pathname.startsWith("/api/auth")) return NextResponse.next()
  if (pathname === "/api/public-config") return NextResponse.next()
  if (pathname.startsWith("/_next")) return NextResponse.next()
  if (pathname === "/favicon.ico") return NextResponse.next()

  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|json)$/i.test(pathname)) {
    return NextResponse.next()
  }

  const token = tokenFromRequest(request)
  if (!token) {
    return rejectUnauthenticated(request)
  }

  const session = await verifySessionToken(token)
  if (!session) {
    return rejectUnauthenticated(request)
  }

  return NextResponse.next()
}

function rejectUnauthenticated(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  const dest = request.nextUrl.pathname + request.nextUrl.search
  if (dest && dest !== "/login") {
    url.searchParams.set("next", dest)
  }
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
