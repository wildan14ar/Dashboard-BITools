"use client"

import { Activity, CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { Suspense, useMemo, useState } from "react"
import { Protected } from "@/components/Protected"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLogs } from "@/hooks/use-activity"
import { useAuth } from "@/hooks/use-auth"
import { type CalendarEvent, useCalendarEvents } from "@/hooks/use-calendars"
import { formatRelative } from "@/lib/utils"

const WEEKDAYS_MONDAY_FIRST = [0, 1, 2, 3, 4, 5, 6]

function weekdayName(locale: string, mondayIndex: number): string {
  const anchor = new Date(2026, 0, 5 + mondayIndex)
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    weekday: "short",
  }).format(anchor)
}

function monthCells(year: number, month: number): Date[] {
  const first = new Date(year, month - 1, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month - 1, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function formatTime(iso: string | null, locale: string): string {
  if (!iso) return ""
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function formatFull(iso: string | null, locale: string): string {
  if (!iso) return "-"
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso))
}

function DashboardHome() {
  const locale = useLocale()
  const { user } = useAuth()
  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 })
  const [selected, setSelected] = useState<CalendarEvent | null>(null)

  const { data: events = [] } = useCalendarEvents({ year: view.y, month: view.m })

  const cells = useMemo(() => monthCells(view.y, view.m), [view])
  const monthLabel = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(view.y, view.m - 1, 1))

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    const push = (d: Date, ev: CalendarEvent) => {
      const k = dateKey(d)
      const list = map.get(k)
      if (list) list.push(ev)
      else map.set(k, [ev])
    }
    for (const ev of events) {
      if (ev.occurrences.length > 0) {
        for (const iso of ev.occurrences) push(new Date(iso), ev)
      } else if (ev.startDate) {
        push(new Date(ev.startDate), ev)
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => +new Date(a.startDate ?? 0) - +new Date(b.startDate ?? 0))
    }
    return map
  }, [events])

  const goMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m - 1 + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() + 1 }
    })
  }

  return (
    <div className="space-y-6 p-10">
      {/* Greeting */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-card to-card/50 p-8">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base text-muted-foreground font-medium">Halo</p>
            <h2 className="text-2xl font-bold text-foreground mt-1">
              Selamat datang kembali, {user?.fullname || user?.username || "User"}!
            </h2>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{monthLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goMonth(-1)} aria-label="Bulan lalu">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView({ y: today.getFullYear(), m: today.getMonth() + 1 })}
            >
              Hari ini
            </Button>
            <Button variant="outline" size="sm" onClick={() => goMonth(1)} aria-label="Bulan depan">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Kalender read-only */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-px mb-px">
            {WEEKDAYS_MONDAY_FIRST.map((i) => (
              <div
                key={i}
                className="text-center text-xs font-semibold text-on-surface-variant py-2"
              >
                {weekdayName(locale, i)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
            {cells.map((day) => {
              const inMonth = day.getMonth() === view.m - 1
              const isToday = dateKey(day) === dateKey(today)
              const dayEvents = byDay.get(dateKey(day)) ?? []
              return (
                <div
                  key={day.getTime()}
                  className={`min-h-20 sm:min-h-24 p-1.5 align-top ${
                    inMonth ? "bg-background" : "bg-surface-container/50"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                      isToday
                        ? "bg-primary text-primary-foreground font-bold"
                        : inMonth
                          ? "font-medium"
                          : "text-on-surface-variant"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <span className="mt-1 flex flex-col gap-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setSelected(ev)}
                        title={ev.title}
                        className="flex items-center gap-1 text-[11px] leading-tight rounded px-1 py-0.5 bg-accent text-left truncate cursor-pointer hover:ring-1 hover:ring-primary"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ev.color || "#3B82F6" }}
                        />
                        <span className="truncate">
                          {!ev.allDay && ev.startDate && (
                            <span className="text-muted-foreground mr-1">
                              {formatTime(ev.startDate, locale)}
                            </span>
                          )}
                          {ev.isHoliday ? "🎌 " : ""}
                          {ev.title}
                        </span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setSelected(dayEvents[3])}
                        className="text-[10px] text-primary pl-1 text-left hover:underline"
                      >
                        +{dayEvents.length - 3} lainnya
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity milik sendiri */}
      <RecentActivity />

      {/* Detail read-only */}
      <Dialog open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selected.color || "#3B82F6" }}
                  />
                  {selected.isHoliday ? "🎌 " : ""}
                  {selected.title}
                </DialogTitle>
                <DialogDescription>
                  {formatFull(selected.startDate, locale)}
                  {!selected.allDay && selected.startDate
                    ? ` · ${formatTime(selected.startDate, locale)}`
                    : ""}
                  {selected.allDay ? " · Seharian" : ""}
                  {selected.endDate && !selected.allDay
                    ? ` – ${formatTime(selected.endDate, locale)}`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {selected.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {selected.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {selected.repeatType && selected.repeatType !== "none"
                      ? `Berulang: ${selected.repeatType}`
                      : "Sekali"}
                  </span>
                  {selected.userIds.length > 0 && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {selected.userIds.length} assignee
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RecentActivity() {
  const { data, isLoading } = useLogs({ limit: 6 })
  const items = data?.items ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Aktivitas Terakhir
          </span>
          <Link
            href="/dashboard/profile?tab=log"
            className="text-xs font-normal text-primary hover:underline"
          >
            View all activity
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
        ) : (
          <div className="space-y-2">
            {items.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium truncate">
                  {log.action} · {log.entity}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelative(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <Protected>
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <DashboardHome />
      </Suspense>
    </Protected>
  )
}
