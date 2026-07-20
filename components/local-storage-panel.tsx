"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, HardDrive, Save } from "lucide-react"

type StorageConfig = {
  dataDir: string
  defaultDataDir: string
}

export function LocalStoragePanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<StorageConfig | null>(null)
  const [path, setPath] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/admin/storage-config", { credentials: "include" })
        if (!res.ok) throw new Error("تعذّر تحميل إعداد التخزين")
        const data = (await res.json()) as StorageConfig
        if (!cancelled) {
          setConfig(data)
          setPath(data.dataDir)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطأ غير متوقع")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    const target = path.trim()
    if (!target) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/storage-config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataDir: target }),
      })
      const data = (await res.json().catch(() => ({}))) as StorageConfig & { error?: string }
      if (!res.ok) throw new Error(data.error || "فشل الحفظ")
      setConfig(data)
      setPath(data.dataDir)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardDrive className="h-5 w-5 text-primary" />
          مكان حفظ البيانات محلياً
        </CardTitle>
        <CardDescription>
          قاعدة البيانات (الحسابات، حساب الأدمن، الدروس) وملفات الصور المرفوعة تُحفظ كلها في هذا
          المجلد على جهازك. يمكنك تغييره لأي قرص أو مجلد تريده — سيتم نقل البيانات الحالية تلقائياً.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جارٍ التحميل...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="dataDir">مسار مجلد البيانات</Label>
              <Input
                id="dataDir"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={config?.defaultDataDir ?? "E:\\DrosiData"}
                dir="ltr"
                className="text-left font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                مثال: <code dir="ltr">D:\DrosiData</code> أو <code dir="ltr">E:\procat\dars\data</code>.
                الافتراضي: <code dir="ltr">{config?.defaultDataDir}</code>
              </p>
            </div>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  جارٍ النقل...
                </>
              ) : (
                <>
                  <Save className="me-2 h-4 w-4" />
                  حفظ ونقل البيانات
                </>
              )}
            </Button>

            {config?.dataDir && (
              <p className="text-xs text-muted-foreground">
                المجلد الحالي: <code dir="ltr">{config.dataDir}</code>
              </p>
            )}

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {saved && (
              <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                تم نقل البيانات إلى المجلد الجديد بنجاح.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
