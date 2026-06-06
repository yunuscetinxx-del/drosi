import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_SESSION_COOKIE } from "@/lib/auth-constants"
import { verifySessionToken } from "@/lib/auth-session"

function isAllowedCorsOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    const { hostname, protocol } = new URL(origin)
    if (protocol !== "http:" && protocol !== "https:") return false
    if (hostname === "localhost" || hostname === "127.0.0.1") return true
    if (hostname.endsWith(".up.railway.app")) return true
    return false
  } catch {
    return false
  }
}

function applyCors(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin")
  if (origin && isAllowedCorsOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, Accept"
    )
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    response.headers.set("Vary", "Origin")
  }
  return response
}

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

  if (pathname.startsWith("/flutter-app")) return NextResponse.next()

  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return applyCors(new NextResponse(null, { status: 204 }), request)
    }
  }

  if (pathname.startsWith("/login")) return NextResponse.next()
  if (pathname === "/") return NextResponse.next()
  if (pathname.startsWith("/pricing")) return NextResponse.next()
  if (pathname.startsWith("/share/")) return NextResponse.next()
  if (pathname.startsWith("/api/share/")) return applyCors(NextResponse.next(), request)
  if (pathname.startsWith("/api/auth")) return applyCors(NextResponse.next(), request)
  if (pathname === "/api/public-config") return applyCors(NextResponse.next(), request)
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
    return applyCors(rejectUnauthenticated(request), request)
  }

  return pathname.startsWith("/api/")
    ? applyCors(NextResponse.next(), request)
    : NextResponse.next()
}

function rejectUnauthenticated(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return applyCors(
      NextResponse.json({ error: "غير مصرّح" }, { status: 401 }),
      request
    )
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
