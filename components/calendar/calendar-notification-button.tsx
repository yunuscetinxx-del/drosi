"use client"

import { Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/components/locale-provider"
import { useCalendarNotificationControls } from "@/hooks/use-calendar-notifications"
import { cn } from "@/lib/utils"

export function CalendarNotificationButton() {
  const { t } = useTranslations()
  const { enabled, permission, toggleNotifications } = useCalendarNotificationControls(t)

  const active = enabled && permission === "granted"
  const title = active
    ? t("calendar.notifyEnabled")
    : permission === "denied"
      ? t("calendar.notifyDenied")
      : t("calendar.notifyPermissionHint")

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-9 gap-1 border-border", active && "border-primary/50 text-primary")}
      title={title}
      onClick={() => void toggleNotifications()}
    >
      {active ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      <span className="hidden sm:inline">
        {active ? t("calendar.notificationsOn") : t("calendar.notificationsOff")}
      </span>
    </Button>
  )
}
