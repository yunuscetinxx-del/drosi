"use client"

import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/locale-provider"
import { getMessages } from "@/lib/i18n/messages"

export function PricingPlans() {
  const { t, locale } = useTranslations()
  const { pricing } = getMessages(locale)
  const freeFeatures = pricing.free.features
  const proFeatures = pricing.pro.features

  return (
    <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
      <PlanCard
        name={t("pricing.free.name")}
        price={t("pricing.free.price")}
        period={t("pricing.free.period")}
        description={t("pricing.free.description")}
        features={freeFeatures}
        cta={t("pricing.free.cta")}
        href="/login?mode=register"
        variant="default"
      />
      <PlanCard
        name={t("pricing.pro.name")}
        price={t("pricing.pro.price")}
        period={t("pricing.pro.period")}
        description={t("pricing.pro.description")}
        features={proFeatures}
        cta={t("pricing.pro.cta")}
        href="/login?mode=register&plan=pro"
        variant="pro"
        badge={t("pricing.pro.badge")}
        highlighted
      />
    </div>
  )
}

function PlanCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  href,
  variant,
  badge,
  highlighted = false,
}: {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  variant: "default" | "pro"
  badge?: string
  highlighted?: boolean
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-8",
        highlighted
          ? "border-primary/50 bg-gradient-to-b from-primary/10 to-card shadow-lg shadow-primary/10"
          : "border-border bg-card"
      )}
    >
      {badge && (
        <Badge className="absolute -top-3 start-6 gap-1 bg-primary text-primary-foreground">
          <Sparkles className="h-3 w-3" />
          {badge}
        </Badge>
      )}
      <div>
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight">{price}</span>
        <span className="text-muted-foreground">{period}</span>
      </div>
      <ul className="mt-8 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                variant === "pro" ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        className="mt-8 w-full"
        variant={highlighted ? "default" : "outline"}
        size="lg"
      >
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  )
}
