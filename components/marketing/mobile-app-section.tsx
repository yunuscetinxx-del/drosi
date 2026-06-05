"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Download, Smartphone, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/components/locale-provider"
import { getMessages } from "@/lib/i18n/messages"

type MobileUpdate = {
  version?: string
  apkUrl?: string
}

export function MobileAppSection() {
  const { t, locale } = useTranslations()
  const perks = getMessages(locale).marketing.mobile.perks
  const [update, setUpdate] = useState<MobileUpdate | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/mobile-update.json", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as MobileUpdate
        if (!cancelled) setUpdate(data)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const apkUrl = update?.apkUrl?.trim()
  const version = update?.version

  return (
    <section className="border-y border-border/60 bg-gradient-to-b from-muted/30 to-background py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5" />
            Android
            {version ? ` • v${version}` : ""}
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{t("marketing.mobile.title")}</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">{t("marketing.mobile.subtitle")}</p>
          <ul className="mt-6 space-y-2">
            {perks.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            {apkUrl ? (
              <Button asChild size="lg">
                <a href={apkUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="me-2 h-4 w-4" />
                  {t("marketing.mobile.downloadApk")}
                </a>
              </Button>
            ) : (
              <Button size="lg" disabled>
                {t("marketing.mobile.apkSoon")}
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <Link href="/login?mode=register">{t("marketing.mobile.createAccount")}</Link>
            </Button>
          </div>
        </div>
        <div className="relative mx-auto flex h-72 w-full max-w-sm items-center justify-center rounded-3xl border border-border/70 bg-card/80 p-8 shadow-2xl shadow-primary/10 backdrop-blur">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/15 via-transparent to-chart-3/10" />
          <div className="relative text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15">
              <Smartphone className="h-10 w-10 text-primary" />
            </div>
            <p className="text-lg font-semibold">Drosi</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("marketing.mobile.appTagline")}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
