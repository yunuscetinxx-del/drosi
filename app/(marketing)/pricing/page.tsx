"use client"

import { MarketingNav } from "@/components/marketing/marketing-nav"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { PricingPlans } from "@/components/marketing/pricing-plans"
import { useTranslations } from "@/components/locale-provider"

export default function PricingPage() {
  const { t } = useTranslations()

  return (
    <div className="min-h-full bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 start-1/4 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-20 end-1/4 h-72 w-72 rounded-full bg-chart-2/10 blur-3xl" />
      </div>

      <MarketingNav active="pricing" />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">{t("pricing.title")}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>

        <div className="mt-14">
          <PricingPlans />
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted-foreground">
          {t("pricing.footnote")}
        </p>
      </main>

      <MarketingFooter />
    </div>
  )
}
