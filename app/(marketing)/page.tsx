"use client"

import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  Network,
  Sparkles,
  StickyNote,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MarketingNav } from "@/components/marketing/marketing-nav"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { FloatingIcons } from "@/components/marketing/floating-icons"
import { MobileAppSection } from "@/components/marketing/mobile-app-section"
import { useTranslations } from "@/components/locale-provider"
import { getMessages } from "@/lib/i18n/messages"

const featureIcons = [Brain, StickyNote, Network, Sparkles, CalendarDays, Zap]

export default function LandingPage() {
  const { t, locale } = useTranslations()
  const features = getMessages(locale).marketing.features

  return (
    <div className="min-h-full bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 start-1/4 h-[600px] w-[600px] rounded-full bg-primary/12 blur-[100px]" />
        <div className="absolute top-1/3 end-0 h-[400px] w-[500px] rounded-full bg-chart-3/10 blur-[90px]" />
        <div className="absolute bottom-0 start-0 h-72 w-96 rounded-full bg-chart-2/8 blur-[80px]" />
      </div>

      <MarketingNav active="home" />

      <main>
        <section className="relative overflow-hidden">
          <FloatingIcons />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <div className="text-center lg:text-start">
              <Badge variant="secondary" className="mb-5 px-3 py-1">
                {t("marketing.hero.badge")}
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                {t("marketing.hero.title")}
              </h1>
              <p className="mt-6 text-lg text-muted-foreground sm:text-xl leading-relaxed">
                {t("marketing.hero.subtitle")}
              </p>
              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Button asChild size="lg" className="min-w-[200px] shadow-lg shadow-primary/20">
                  <Link href="/login?mode=register">
                    {t("marketing.hero.ctaPrimary")}
                    <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="min-w-[200px]">
                  <Link href="/pricing">{t("marketing.hero.ctaSecondary")}</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{t("marketing.hero.note")}</p>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="rounded-3xl border border-border/60 bg-card/50 p-6 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{t("app.title")}</p>
                    <p className="text-xs text-muted-foreground">{t("app.subtitle")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Brain, label: t("marketing.hero.statAi") },
                    { icon: Network, label: t("marketing.hero.statMaps") },
                    { icon: StickyNote, label: t("marketing.hero.statLessons") },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-2 py-4 text-center"
                    >
                      <Icon className="h-6 w-6 text-primary" />
                      <p className="text-[11px] font-medium leading-snug">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/15 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">{t("marketing.featuresTitle")}</h2>
              <p className="mt-3 text-muted-foreground">{t("marketing.featuresSubtitle")}</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = featureIcons[i] ?? Sparkles
                return (
                  <div
                    key={f.title}
                    className="group rounded-2xl border border-border/60 bg-card/80 p-6 transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <MobileAppSection />

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">{t("marketing.cta.title")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("marketing.cta.subtitle")}</p>
            <Button asChild size="lg" className="mt-8 min-w-[220px]">
              <Link href="/login?mode=register">{t("marketing.cta.button")}</Link>
            </Button>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
