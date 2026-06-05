import { readFile } from "fs/promises"
import path from "path"
import { resolveAppBaseUrl } from "@/lib/public-app-url"
import { prisma } from "@/lib/prisma"

export type AppPublicConfig = {
  apiBaseUrl: string
  forceApiBaseUrl: boolean
  updatedAt: string
  source: "database" | "env" | "file" | "runtime"
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, "")
}

function isValidHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === "https:" && u.hostname.length > 0
  } catch {
    return false
  }
}

async function readFileConfig(): Promise<Partial<AppPublicConfig> | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "app-config.json")
    const raw = await readFile(filePath, "utf8")
    const json = JSON.parse(raw) as {
      apiBaseUrl?: string
      forceApiBaseUrl?: boolean
      updatedAt?: string
    }
    const apiBaseUrl =
      typeof json.apiBaseUrl === "string" ? normalizeUrl(json.apiBaseUrl) : ""
    if (!isValidHttpsUrl(apiBaseUrl)) return null
    return {
      apiBaseUrl,
      forceApiBaseUrl: json.forceApiBaseUrl === true,
      updatedAt: json.updatedAt ?? new Date().toISOString().slice(0, 10),
      source: "file",
    }
  } catch {
    return null
  }
}

/** عنوان API العام — للتطبيق والموقع (بدون تسجيل دخول) */
export async function resolveAppPublicConfig(): Promise<AppPublicConfig> {
  try {
    const row = await prisma.appPublicConfig.findUnique({
      where: { singleton: "global" },
    })
    if (row?.apiBaseUrl && isValidHttpsUrl(row.apiBaseUrl)) {
      return {
        apiBaseUrl: normalizeUrl(row.apiBaseUrl),
        forceApiBaseUrl: row.forceApiBaseUrl,
        updatedAt: row.updatedAt.toISOString(),
        source: "database",
      }
    }
  } catch {
    /* DB may be unavailable during build */
  }

  const fromEnv =
    process.env.PUBLIC_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv && isValidHttpsUrl(fromEnv)) {
    return {
      apiBaseUrl: normalizeUrl(fromEnv),
      forceApiBaseUrl: false,
      updatedAt: new Date().toISOString(),
      source: "env",
    }
  }

  const fromFile = await readFileConfig()
  if (fromFile?.apiBaseUrl) {
    return {
      apiBaseUrl: fromFile.apiBaseUrl,
      forceApiBaseUrl: fromFile.forceApiBaseUrl ?? false,
      updatedAt: fromFile.updatedAt ?? new Date().toISOString(),
      source: "file",
    }
  }

  const runtime = resolveAppBaseUrl()
  if (runtime && isValidHttpsUrl(runtime)) {
    return {
      apiBaseUrl: normalizeUrl(runtime),
      forceApiBaseUrl: false,
      updatedAt: new Date().toISOString(),
      source: "runtime",
    }
  }

  return {
    apiBaseUrl: "https://sdda.up.railway.app",
    forceApiBaseUrl: false,
    updatedAt: new Date().toISOString(),
    source: "file",
  }
}

export async function saveAppPublicConfig(input: {
  apiBaseUrl: string
  forceApiBaseUrl?: boolean
}): Promise<AppPublicConfig> {
  const apiBaseUrl = normalizeUrl(input.apiBaseUrl)
  if (!isValidHttpsUrl(apiBaseUrl)) {
    throw new Error("Invalid HTTPS URL")
  }

  const row = await prisma.appPublicConfig.upsert({
    where: { singleton: "global" },
    create: {
      singleton: "global",
      apiBaseUrl,
      forceApiBaseUrl: input.forceApiBaseUrl === true,
    },
    update: {
      apiBaseUrl,
      forceApiBaseUrl: input.forceApiBaseUrl === true,
    },
  })

  return {
    apiBaseUrl: normalizeUrl(row.apiBaseUrl),
    forceApiBaseUrl: row.forceApiBaseUrl,
    updatedAt: row.updatedAt.toISOString(),
    source: "database",
  }
}
