"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, Search, Shield, ArrowRight } from "lucide-react"
import { SiteConfigPanel } from "@/components/site-config-panel"

type ProfileRow = {
  userId: string
  email: string
  analysisCount: number
  subjects: string[]
  questionCount: number
  profileUpdatedAt: string
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [markdown, setMarkdown] = useState("")
  const [detailLoading, setDetailLoading] = useState(false)

  const loadList = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/learning-profiles?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      })
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok) return
      const data = (await res.json()) as { users: ProfileRow[] }
      setUsers(data.users ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList("")
  }, [loadList])

  const openProfile = async (userId: string) => {
    setSelectedId(userId)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/learning-profiles/${userId}`, {
        credentials: "include",
      })
      if (!res.ok) return
      const data = (await res.json()) as { markdown?: string }
      setMarkdown(data.markdown ?? "")
    } finally {
      setDetailLoading(false)
    }
  }

  if (forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
            <p>صلاحية أدمن مطلوبة للوصول لهذه الصفحة.</p>
            <Button asChild variant="outline">
              <Link href="/lessons">العودة للتطبيق</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">لوحة الأدمن — ملفات التعلّم</h1>
              <p className="text-xs text-muted-foreground">
                JSON منظم + تصدير MD لكل مستخدم
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/lessons">
              <ArrowRight className="h-4 w-4 ml-1" />
              التطبيق
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-8">
        <SiteConfigPanel admin />
        <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">المستخدمون</CardTitle>
            <div className="flex gap-2 pt-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث بالبريد أو المادة..."
              />
              <Button type="button" variant="secondary" onClick={() => void loadList(query)}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا مستخدمون أو لا ملفات بعد.</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.userId}
                  type="button"
                  onClick={() => void openProfile(u.userId)}
                  className={`w-full rounded-lg border p-3 text-start transition-colors hover:bg-muted/50 ${
                    selectedId === u.userId ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <p className="font-medium truncate">{u.email}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline">{u.analysisCount} تحليل</Badge>
                    <Badge variant="outline">{u.questionCount} سؤال</Badge>
                  </div>
                  {u.subjects.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {u.subjects.join("، ")}
                    </p>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">ملف MD</CardTitle>
            {selectedId && (
              <Button asChild size="sm" variant="outline">
                <a
                  href={`/api/admin/learning-profiles/${selectedId}?format=md`}
                  download
                >
                  <Download className="h-4 w-4 ml-1" />
                  تنزيل
                </a>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !selectedId ? (
              <p className="text-sm text-muted-foreground">اختر مستخدماً لعرض ملف التعلّم.</p>
            ) : (
              <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-xs leading-relaxed">
                {markdown || "ملف فارغ — سيُبنى مع التحليلات والدردشة."}
              </pre>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  )
}
