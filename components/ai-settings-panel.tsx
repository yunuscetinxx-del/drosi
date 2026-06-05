"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "@/components/locale-provider"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Unlink,
} from "lucide-react"

const GEMINI_KEY_URL = "https://aistudio.google.com/apikey"

type AiSettings = {
  geminiConnected: boolean
  geminiKeyHint: string | null
  geminiKeyUpdatedAt: string | null
  serverFallbackAvailable: boolean
  activeSource: "gemini" | "openrouter" | "none"
}

export function AiSettingsPanel() {
  const { t } = useTranslations()
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/user/ai-settings", { credentials: "include" })
      if (!res.ok) throw new Error(t("aiSettings.loadError"))
      setSettings((await res.json()) as AiSettings)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  async function saveKey() {
    const key = apiKey.trim()
    if (!key) {
      setError(t("aiSettings.keyRequired"))
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/user/ai-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      })
      const data = (await res.json()) as AiSettings & { error?: string }
      if (!res.ok) throw new Error(data.error || t("aiSettings.saveError"))
      setSettings(data)
      setApiKey("")
      setShowKey(false)
      setSuccess(t("aiSettings.connected"))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("aiSettings.saveError"))
    } finally {
      setSaving(false)
    }
  }

  async function disconnect() {
    setDisconnecting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/user/ai-settings", {
        method: "DELETE",
        credentials: "include",
      })
      const data = (await res.json()) as AiSettings & { error?: string }
      if (!res.ok) throw new Error(data.error || t("aiSettings.disconnectError"))
      setSettings(data)
      setSuccess(t("aiSettings.disconnected"))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("aiSettings.disconnectError"))
    } finally {
      setDisconnecting(false)
    }
  }

  function activeSourceLabel(source: AiSettings["activeSource"]) {
    if (source === "gemini") return t("aiSettings.sourceGemini")
    if (source === "openrouter") return t("aiSettings.sourceServer")
    return t("aiSettings.sourceNone")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("common.loading")}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("aiSettings.title")}
            </CardTitle>
            <CardDescription>{t("aiSettings.subtitle")}</CardDescription>
          </div>
          {settings && (
            <Badge variant={settings.activeSource === "none" ? "destructive" : "secondary"}>
              {activeSourceLabel(settings.activeSource)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t("aiSettings.step1")}</li>
          <li>{t("aiSettings.step2")}</li>
          <li>{t("aiSettings.step3")}</li>
        </ol>

        <Button asChild variant="outline" className="w-full sm:w-auto">
          <a href={GEMINI_KEY_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 ml-2" />
            {t("aiSettings.openStudio")}
          </a>
        </Button>

        {settings?.geminiConnected && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              {t("aiSettings.connectedHint", {
                hint: settings.geminiKeyHint ? `••••${settings.geminiKeyHint}` : "••••",
              })}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="gemini-api-key">{t("aiSettings.keyLabel")}</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="gemini-api-key"
                dir="ltr"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                placeholder={t("aiSettings.keyPlaceholder")}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pe-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute end-0 top-0 h-full"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? t("aiSettings.hideKey") : t("aiSettings.showKey")}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={() => void saveKey()} disabled={saving || !apiKey.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("aiSettings.connect")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("aiSettings.keyPrivacy")}</p>
        </div>

        {settings?.geminiConnected && (
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => void disconnect()}
            disabled={disconnecting}
          >
            {disconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Unlink className="h-4 w-4 ml-2" />
            )}
            {t("aiSettings.disconnect")}
          </Button>
        )}

        {!settings?.geminiConnected && settings?.serverFallbackAvailable && (
          <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/40 p-3">
            {t("aiSettings.serverFallback")}
          </p>
        )}

        {!settings?.geminiConnected && !settings?.serverFallbackAvailable && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p>{t("aiSettings.noAiWarning")}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p>{success}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
