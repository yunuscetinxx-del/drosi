"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Database, Download, Loader2, Upload, AlertTriangle } from "lucide-react"
import type { SystemBackupStats } from "@/lib/system-backup"

type PreviewStats = SystemBackupStats & {
  exportedAt?: string
  fileName?: string
}

export function AdminBackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [preview, setPreview] = useState<PreviewStats | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/backup", { credentials: "include" })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "فشل التصدير")
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `drosi-backup-${Date.now()}.json`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setMessage("تم تنزيل النسخة الاحتياطية الكاملة على جهازك")
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التصدير")
    } finally {
      setExporting(false)
    }
  }

  const countStats = (backup: {
    users?: unknown[]
    lessonShares?: unknown[]
    appPublicConfig?: unknown | null
    exportedAt?: string
  }): PreviewStats => {
    let lessons = 0
    let lessonNotes = 0
    let images = 0
    let mindMaps = 0
    let wordPages = 0

    for (const user of backup.users ?? []) {
      const u = user as { lessons?: unknown[] }
      for (const lesson of u.lessons ?? []) {
        const l = lesson as Record<string, unknown>
        lessons++
        lessonNotes += Array.isArray(l.lessonNotes) ? l.lessonNotes.length : 0
        images += Array.isArray(l.images) ? l.images.length : 0
        mindMaps += Array.isArray(l.mindMaps) ? l.mindMaps.length : 0
        wordPages += Array.isArray(l.wordPages) ? l.wordPages.length : 0
      }
    }

    return {
      users: backup.users?.length ?? 0,
      lessons,
      lessonNotes,
      images,
      mindMaps,
      wordPages,
      shares: backup.lessonShares?.length ?? 0,
      hasPublicConfig: backup.appPublicConfig != null,
      exportedAt: backup.exportedAt,
    }
  }

  const handleFilePick = async (file: File | null) => {
    setError(null)
    setMessage(null)
    setPreview(null)
    setPendingFile(null)
    if (!file) return

    try {
      const text = await file.text()
      const backup = JSON.parse(text) as {
        app?: string
        version?: number
        exportedAt?: string
        users?: unknown[]
        lessonShares?: unknown[]
        appPublicConfig?: unknown | null
      }

      if (backup.app !== "drosi") {
        throw new Error("هذا الملف ليس نسخة احتياطية لتطبيق دروسي")
      }

      setPreview({ ...countStats(backup), fileName: file.name })
      setPendingFile(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : "ملف غير صالح")
    }
  }

  const handleImport = async () => {
    if (!pendingFile || confirm !== "RESTORE_ALL") return
    setImporting(true)
    setError(null)
    setMessage(null)
    try {
      const form = new FormData()
      form.append("file", pendingFile)
      form.append("confirm", "RESTORE_ALL")

      const res = await fetch("/api/admin/backup", {
        method: "POST",
        credentials: "include",
        body: form,
      })

      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        stats?: SystemBackupStats
        message?: string
      }

      if (!res.ok) {
        throw new Error(data.error ?? "فشل الاستيراد")
      }

      setMessage(data.message ?? "تم استعادة كل البيانات بنجاح")
      setPreview(null)
      setPendingFile(null)
      setConfirm("")
      if (fileRef.current) fileRef.current.value = ""
      setDialogOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الاستيراد")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">نسخة احتياطية كاملة — تصدير / استيراد</CardTitle>
        </div>
        <CardDescription>
          يشمل المستخدمين، الدروس، الملاحظات، الصور، الخرائط، صفحات الكلمات، التقويم،
          ملفات التعلّم، روابط المشاركة، وإعدادات التطبيق.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 ml-2" />
            )}
            تصدير كل البيانات
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <Upload className="h-4 w-4 ml-2" />
            اختيار ملف للاستيراد
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void handleFilePick(e.target.files?.[0] ?? null)}
          />
        </div>

        {preview && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">معاينة الملف: {preview.fileName}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{preview.users} مستخدم</Badge>
              <Badge variant="outline">{preview.lessons} درس</Badge>
              <Badge variant="outline">{preview.lessonNotes} ملاحظة</Badge>
              <Badge variant="outline">{preview.images} صورة</Badge>
              <Badge variant="outline">{preview.mindMaps} خريطة</Badge>
              <Badge variant="outline">{preview.wordPages} صفحة كلمات</Badge>
              <Badge variant="outline">{preview.shares} رابط مشاركة</Badge>
            </div>
            {preview.exportedAt && (
              <p className="text-xs text-muted-foreground">
                تاريخ التصدير: {new Date(preview.exportedAt).toLocaleString("ar")}
              </p>
            )}
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <p>
                الاستيراد يستبدل <strong>كل</strong> بيانات الموقع الحالية بالنسخة الاحتياطية.
                احتفظ بنسخة قبل الاستيراد إن لزم.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground block mb-1">
                  اكتب RESTORE_ALL للتأكيد
                </label>
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="RESTORE_ALL"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={confirm !== "RESTORE_ALL" || importing}
                onClick={() => setDialogOpen(true)}
              >
                استيراد واستعادة الكل
              </Button>
            </div>
          </div>
        )}

        {message && (
          <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد استيراد النسخة الاحتياطية</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف كل المستخدمين والدروس والملاحظات والصور الحالية واستبدالها بمحتوى الملف.
              هذا الإجراء لا يمكن التراجع عنه بسهولة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={importing}
              onClick={(e) => {
                e.preventDefault()
                void handleImport()
              }}
            >
              {importing ? "جاري الاستيراد..." : "نعم، استعادة الكل"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
