"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ShieldCheck, RefreshCw } from "lucide-react"

type BackupInfo = {
  name: string
  createdAt: string
  sizeBytes: number
}

type BackupStatus = {
  lastBackupAt: string | null
  retainCount: number
  minGapHours: number
  backups: BackupInfo[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AutoBackupPanel() {
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      const res = await fetch("/api/admin/backup/auto", { credentials: "include" })
      if (!res.ok) throw new Error("تعذّر تحميل حالة النسخ الاحتياطي")
      setStatus((await res.json()) as BackupStatus)
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع")
    }
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await load()
      setLoading(false)
    })()
  }, [])

  async function runNow() {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/backup/auto", {
        method: "POST",
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as BackupStatus & { error?: string }
      if (!res.ok) throw new Error(data.error || "فشل النسخ الاحتياطي")
      setStatus(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع")
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          نسخ احتياطي تلقائي محلي
        </CardTitle>
        <CardDescription>
          نسخة كاملة (قاعدة البيانات + الصور) تُحفظ تلقائياً في مجلد{" "}
          <code dir="ltr">data/backups</code> — عند بدء تشغيل السيرفر إن مضى أكثر من 24 ساعة على
          آخر نسخة، ويُحتفظ بآخر {status?.retainCount ?? 7} نسخ فقط.
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
            <p className="text-sm">
              آخر نسخة احتياطية:{" "}
              {status?.lastBackupAt ? (
                new Date(status.lastBackupAt).toLocaleString()
              ) : (
                <span className="text-muted-foreground">لا توجد بعد</span>
              )}
            </p>

            <Button type="button" onClick={() => void runNow()} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  جارٍ إنشاء النسخة...
                </>
              ) : (
                <>
                  <RefreshCw className="me-2 h-4 w-4" />
                  إنشاء نسخة احتياطية الآن
                </>
              )}
            </Button>

            {status && status.backups.length > 0 && (
              <div className="space-y-1 rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  النسخ المحفوظة ({status.backups.length}):
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {status.backups.map((b) => (
                    <li key={b.name} className="flex justify-between gap-2">
                      <span>{new Date(b.createdAt).toLocaleString()}</span>
                      <span dir="ltr">{formatSize(b.sizeBytes)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
