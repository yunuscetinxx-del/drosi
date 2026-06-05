"use client"

import Link from "next/link"
import {
  BookOpen,
  Brain,
  CalendarDays,
  Network,
  Smartphone,
  Sparkles,
  StickyNote,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MarketingNav } from "@/components/marketing/marketing-nav"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { useTranslations } from "@/components/locale-provider"
import { getMessages } from "@/lib/i18n/messages"

const featureIcons = [Brain, StickyNote, Network, Sparkles, CalendarDays, Smartphone]

export default function LandingPage() {
  const { t, locale } = useTranslations()
  const features = getMessages(locale).marketing.features

  return (
    <div className="min-h-full bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 start-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 end-0 h-80 w-80 rounded-full bg-chart-3/10 blur-3xl" />
      </div>

      <MarketingNav active="home" />

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              {t("marketing.hero.badge")}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t("marketing.hero.title")}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              {t("marketing.hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-w-[200px]">
                <Link href="/login?mode=register">
                  {t("marketing.hero.ctaPrimary")}
                  <ArrowLeft className="ms-2 h-4 w-4 rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[200px]">
                <Link href="/pricing">{t("marketing.hero.ctaSecondary")}</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{t("marketing.hero.note")}</p>
          </div>

          <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-border/80 bg-card/60 p-6 shadow-2xl shadow-primary/5 backdrop-blur sm:p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: BookOpen, label: t("marketing.hero.statLessons") },
                { icon: Brain, label: t("marketing.hero.statAi") },
                { icon: Network, label: t("marketing.hero.statMaps") },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-6 text-center"
                >
                  <Icon className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/20 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold">{t("marketing.featuresTitle")}</h2>
              <p className="mt-3 text-muted-foreground">{t("marketing.featuresSubtitle")}</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = featureIcons[i] ?? Sparkles
                return (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-border/70 bg-card p-6 transition-colors hover:border-primary/30"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold">{t("marketing.cta.title")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("marketing.cta.subtitle")}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login?mode=register">{t("marketing.cta.button")}</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/pricing">{t("marketing.nav.pricing")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
