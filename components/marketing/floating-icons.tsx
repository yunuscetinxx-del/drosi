"use client"

import {
  BookOpen,
  Brain,
  CalendarDays,
  Network,
  Smartphone,
  Sparkles,
  StickyNote,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICONS = [
  { Icon: Brain, className: "floating-icon-1 left-[8%] top-[12%] text-primary" },
  { Icon: StickyNote, className: "floating-icon-2 left-[72%] top-[8%] text-chart-2" },
  { Icon: Network, className: "floating-icon-3 left-[85%] top-[38%] text-chart-3" },
  { Icon: Sparkles, className: "floating-icon-4 left-[6%] top-[48%] text-chart-4" },
  { Icon: BookOpen, className: "floating-icon-5 left-[58%] top-[62%] text-primary" },
  { Icon: CalendarDays, className: "floating-icon-6 left-[22%] top-[72%] text-chart-2" },
  { Icon: Smartphone, className: "floating-icon-7 left-[78%] top-[78%] text-chart-5" },
]

export function FloatingIcons({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      {ICONS.map(({ Icon, className: pos }, i) => (
        <div
          key={i}
          className={cn(
            "absolute flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-card/70 shadow-lg shadow-primary/5 backdrop-blur-sm sm:h-16 sm:w-16",
            pos
          )}
        >
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} />
        </div>
      ))}
    </div>
  )
}
