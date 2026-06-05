"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, Loader2 } from "lucide-react"
import { useTranslations } from "@/components/locale-provider"
import { LanguageSwitcher } from "@/components/language-switcher"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/lessons"
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login"
  const { t } = useTranslations()

  const [mode, setMode] = useState<"login" | "register">(initialMode)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          mode === "register" ? { name: name.trim(), email, password } : { email, password }
        ),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || t("common.error"))
        return
      }
      router.replace(next.startsWith("/") ? next : "/")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-background p-6">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">{t("app.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.name")}</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("auth.namePlaceholder")}
                required
                minLength={2}
                maxLength={80}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              dir="ltr"
              className="text-left"
            />
            {mode === "register" && (
              <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
            )}
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                {t("common.processing")}
              </>
            ) : mode === "login" ? (
              t("auth.login")
            ) : (
              t("auth.register")
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              {t("auth.noAccount")}{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("register")
                  setError(null)
                }}
              >
                {t("auth.registerNow")}
              </button>
            </>
          ) : (
            <>
              {t("auth.hasAccount")}{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("login")
                  setError(null)
                }}
              >
                {t("auth.login")}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
