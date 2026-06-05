import { NextResponse } from "next/server"
import { resolveAppPublicConfig } from "@/lib/app-public-config"

export async function GET() {
  try {
    const config = await resolveAppPublicConfig()
    return NextResponse.json({
      apiBaseUrl: config.apiBaseUrl,
      forceApiBaseUrl: config.forceApiBaseUrl,
      updatedAt: config.updatedAt,
    })
  } catch (e) {
    console.error("[public-config]", e)
    return NextResponse.json({ error: "Could not load config" }, { status: 500 })
  }
}
