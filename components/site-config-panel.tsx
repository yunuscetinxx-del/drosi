"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Globe, Save } from "lucide-react"
import { useTranslations } from "@/components/locale-provider"

type Config = {
  apiBaseUrl: string
  forceApiBaseUrl: boolean
  updatedAt: string
  source?: string
}

export function SiteConfigPanel({ admin = false }: { admin?: boolean }) {
  const { t } = useTranslations()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [url, setUrl] = useState("")
  const [force, setForce] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const path = admin ? "/api/admin/public-config" : "/api/public-config"
        const res = await fetch(path, { credentials: "include" })
        if (!res.ok) throw new Error(t("siteConfig.loadError"))
        const data = (await res.json()) as Config
        if (!cancelled) {
          setConfig(data)
          setUrl(data.apiBaseUrl)
          setForce(data.forceApiBaseUrl)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t("common.error"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [admin, t])

  async function save() {
    if (!admin) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/public-config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiBaseUrl: url.trim(), forceApiBaseUrl: force }),
      })
      const data = (await res.json().catch(() => ({}))) as Config & { error?: string }
      if (!res.ok) throw new Error(data.error || t("common.error"))
      setConfig(data)
      setUrl(data.apiBaseUrl)
      setForce(data.forceApiBaseUrl)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5 text-primary" />
          {t("siteConfig.title")}
        </CardTitle>
        <CardDescription>{t("siteConfig.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.processing")}
          </div>
        ) : (
          <>
            {admin ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiBaseUrl">{t("siteConfig.apiBaseUrl")}</Label>
                  <Input
                    id="apiBaseUrl"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.up.railway.app"
                    dir="ltr"
                    className="text-left font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">{t("siteConfig.hint")}</p>
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                  />
                  <span>{t("siteConfig.forceHint")}</span>
                </label>
                <Button type="button" onClick={() => void save()} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t("common.processing")}
                    </>
                  ) : (
                    <>
                      <Save className="me-2 h-4 w-4" />
                      {t("siteConfig.save")}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-sm" dir="ltr">
                {config?.apiBaseUrl ?? "—"}
              </div>
            )}

            {config?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                {t("siteConfig.updated")}: {new Date(config.updatedAt).toLocaleString()}
              </p>
            )}

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {saved && (
              <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {t("siteConfig.saved")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
