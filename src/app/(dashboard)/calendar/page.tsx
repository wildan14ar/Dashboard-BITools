"use client"

import { useQueries } from "@tanstack/react-query"
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react"
import { useLocale } from "next-intl"
import { Suspense, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  type CalendarEvent,
  calendarKeys,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from "@/hooks/use-calendars"
import api from "@/lib/api"
import { BroadcastForm } from "../(admin)/users/_components/BroadcastForm"
import EventDialog, { dayPreset, type EventForm, toLocalInput } from "./_components/EventDialog"

type ViewMode = "month" | "week" | "day"

const WEEKDAYS_MONDAY_FIRST = [0, 1, 2, 3, 4, 5, 6]

function weekdayName(locale: string, mondayIndex: number): string {
  // 2026-01-05 adalah hari Senin — jangkar stabil untuk nama hari.
  const anchor = new Date(2026, 0, 5 + mondayIndex)
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    weekday: "short",
  }).format(anchor)
}

/** 42 sel (6×7) mulai Senin di/mendekati tanggal 1. */
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

/** 7 hari (Senin–Minggu) untuk minggu yang memuat anchor. */
function weekDays(anchor: Date): Date[] {
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
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

export function CalendarContent() {
  const locale = useLocale()
  const today = useMemo(() => new Date(), [])
  const [anchor, setAnchor] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [broadcastEvent, setBroadcastEvent] = useState<CalendarEvent | null>(null)
  const [dialog, setDialog] = useState<
    { mode: "closed" } | { mode: "create"; day: Date } | { mode: "edit"; event: CalendarEvent }
  >({ mode: "closed" })

  const createEvent = useCreateCalendarEvent()
  const updateEvent = useUpdateCalendarEvent()
  const deleteEvent = useDeleteCalendarEvent()

  // Hari yang terlihat → bulan yang perlu di-fetch (1–2 bulan untuk week lintas batas).
  const visibleDays = useMemo(() => {
    if (viewMode === "month") return monthCells(anchor.getFullYear(), anchor.getMonth() + 1)
    if (viewMode === "week") return weekDays(anchor)
    return [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())]
  }, [anchor, viewMode])

  const monthsNeeded = useMemo(() => {
    const set = new Map<string, { year: number; month: number }>()
    for (const d of visibleDays) {
      const k = `${d.getFullYear()}-${d.getMonth()}`
      if (!set.has(k)) set.set(k, { year: d.getFullYear(), month: d.getMonth() + 1 })
    }
    return [...set.values()]
  }, [visibleDays])

  const monthQueries = useQueries({
    queries: monthsNeeded.map(({ year, month }) => ({
      queryKey: calendarKeys.list({ year, month }),
      queryFn: async () => {
        const { data } = await api.get<CalendarEvent[]>("/calendar", {
          params: { year, month },
        })
        return data ?? []
      },
    })),
  })

  // Gabungkan hasil multi-bulan; occurrences digabung per event.
  const events = useMemo(() => {
    const byId = new Map<string, CalendarEvent>()
    for (const q of monthQueries) {
      for (const ev of q.data ?? []) {
        const prev = byId.get(ev.id)
        if (!prev) {
          byId.set(ev.id, ev)
        } else {
          const seen = new Set(prev.occurrences)
          byId.set(ev.id, {
            ...prev,
            occurrences: [...prev.occurrences, ...ev.occurrences.filter((o) => !seen.has(o))],
          })
        }
      }
    }
    return [...byId.values()]
  }, [monthQueries])

  const isLoading = monthQueries.some((q) => q.isLoading)
  const isError = monthQueries.some((q) => q.isError)
  const error = monthQueries.find((q) => q.error)?.error as Error | undefined

  // Petakan tanggal → event (pakai occurrences agar event berulang muncul tepat).
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
    return map
  }, [events])

  const shift = (delta: number) => {
    setAnchor((a) => {
      const d = new Date(a)
      if (viewMode === "month") d.setMonth(a.getMonth() + delta)
      else if (viewMode === "week") d.setDate(a.getDate() + delta * 7)
      else d.setDate(a.getDate() + delta)
      return d
    })
  }
  const goToday = () => setAnchor(new Date())

  const titleLabel =
    viewMode === "month"
      ? new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
          month: "long",
          year: "numeric",
        }).format(anchor)
      : viewMode === "week"
        ? (() => {
            const days = weekDays(anchor)
            const fmt = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
              day: "numeric",
              month: "short",
            })
            return `${fmt.format(days[0])} – ${fmt.format(days[6])}`
          })()
        : new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(anchor)

  const handleSubmit = async (form: EventForm) => {
    const payload = {
      title: form.title.trim(),
      startDate: new Date(form.start).toISOString(),
      endDate: form.end ? new Date(form.end).toISOString() : null,
      color: form.color,
      description: form.description.trim() || null,
      repeatType: form.repeatType,
      isHoliday: form.isHoliday,
      isNotify: form.isNotify,
      userIds: form.userIds,
    }
    if (dialog.mode === "edit") {
      await updateEvent.mutateAsync({ id: dialog.event.id, ...payload })
    } else if (dialog.mode === "create") {
      await createEvent.mutateAsync(payload)
    }
    setDialog({ mode: "closed" })
  }

  const handleDelete = async () => {
    if (dialog.mode !== "edit") return
    await deleteEvent.mutateAsync(dialog.event.id)
    setDialog({ mode: "closed" })
  }

  const dialogKey =
    dialog.mode === "closed"
      ? "closed"
      : dialog.mode === "create"
        ? `create-${dialog.day.getTime()}`
        : `edit-${dialog.event.id}-${dialog.event.updatedAt}`

  const dialogInitial: EventForm =
    dialog.mode === "edit"
      ? {
          title: dialog.event.title,
          start: toLocalInput(dialog.event.startDate),
          end: toLocalInput(dialog.event.endDate),
          color: dialog.event.color || "#3B82F6",
          description: dialog.event.description || "",
          repeatType: dialog.event.repeatType || "none",
          isHoliday: dialog.event.isHoliday,
          isNotify: dialog.event.isNotify,
          userIds: dialog.event.userIds,
        }
      : dialog.mode === "create"
        ? {
            title: "",
            start: dayPreset(dialog.day),
            end: "",
            color: "#3B82F6",
            description: "",
            repeatType: "none",
            isHoliday: false,
            isNotify: false,
            userIds: [],
          }
        : {
            title: "",
            start: "",
            end: "",
            color: "#3B82F6",
            description: "",
            repeatType: "none",
            isHoliday: false,
            isNotify: false,
            userIds: [],
          }

  const openEvent = (ev: CalendarEvent) => setDialog({ mode: "edit", event: ev })

  return (
    <div className="space-y-6 p-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Kalender</h1>
          <p className="text-on-surface-variant mt-1">Jadwal dan event Anda</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(
              [
                { v: "month", id: "Bulan", en: "Month" },
                { v: "week", id: "Minggu", en: "Week" },
                { v: "day", id: "Hari", en: "Day" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setViewMode(o.v)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === o.v
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-accent"
                }`}
              >
                {locale === "id" ? o.id : o.en}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label="Sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hari ini
          </Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)} aria-label="Berikutnya">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-40 text-center capitalize">
            {titleLabel}
          </span>
          <Button size="sm" onClick={() => setDialog({ mode: "create", day: anchor })}>
            <Plus className="h-4 w-4 mr-1" />
            Event
          </Button>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-12 w-12 text-error mb-4" />
              <h3 className="text-lg font-semibold">Gagal memuat kalender</h3>
              <p className="text-on-surface-variant">{error?.message}</p>
            </div>
          ) : viewMode === "day" ? (
            <DayView
              events={(byDay.get(dateKey(visibleDays[0])) ?? [])
                .slice()
                .sort((a, b) => +new Date(a.startDate ?? 0) - +new Date(b.startDate ?? 0))}
              locale={locale}
              onOpen={openEvent}
              onCreate={() => setDialog({ mode: "create", day: visibleDays[0] })}
            />
          ) : (
            <GridView
              days={visibleDays}
              month={viewMode === "month" ? anchor.getMonth() : null}
              today={today}
              locale={locale}
              byDay={byDay}
              onOpen={openEvent}
              onCreateDay={(day) => setDialog({ mode: "create", day })}
            />
          )}
        </CardContent>
      </Card>

      {events.length === 0 && !isLoading && !isError && (
        <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant">
          <CalendarDays className="h-4 w-4" />
          Belum ada event periode ini — klik tanggal untuk membuat.
        </div>
      )}

      {dialog.mode !== "closed" && (
        <EventDialog
          key={dialogKey}
          open
          onClose={() => setDialog({ mode: "closed" })}
          initial={dialogInitial}
          editing={dialog.mode === "edit" ? dialog.event : null}
          pending={createEvent.isPending || updateEvent.isPending}
          onSubmit={handleSubmit}
          onDelete={dialog.mode === "edit" ? handleDelete : undefined}
          deleting={deleteEvent.isPending}
          onBroadcast={(ev) => setBroadcastEvent(ev)}
        />
      )}

      {broadcastEvent && (
        <BroadcastForm
          open
          onClose={() => setBroadcastEvent(null)}
          preset={{
            link: "/calendar",
            calendarId: broadcastEvent.id,
            eventTitle: broadcastEvent.title,
          }}
        />
      )}
    </div>
  )
}

function EventChip({ ev, onOpen }: { ev: CalendarEvent; onOpen: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation()
          onOpen()
        }
      }}
      title={ev.title}
      className="flex items-center gap-1 text-[11px] leading-tight rounded px-1 py-0.5 bg-accent truncate cursor-pointer hover:ring-1 hover:ring-primary"
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: ev.color || "#3B82F6" }}
      />
      <span className="truncate">
        {ev.isHoliday ? "🎌 " : ""}
        {ev.title}
      </span>
    </span>
  )
}

function GridView({
  days,
  month,
  today,
  locale,
  byDay,
  onOpen,
  onCreateDay,
}: {
  days: Date[]
  /** null = mode minggu (semua sel penuh, tanpa redup). */
  month: number | null
  today: Date
  locale: string
  byDay: Map<string, CalendarEvent[]>
  onOpen: (ev: CalendarEvent) => void
  onCreateDay: (day: Date) => void
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-px mb-px">
        {WEEKDAYS_MONDAY_FIRST.map((i) => (
          <div key={i} className="text-center text-xs font-semibold text-on-surface-variant py-2">
            {weekdayName(locale, i)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {days.map((day) => {
          const inMonth = month === null || day.getMonth() === month
          const isToday = dateKey(day) === dateKey(today)
          const dayEvents = byDay.get(dateKey(day)) ?? []
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => onCreateDay(day)}
              className={`min-h-20 sm:min-h-24 p-1.5 text-left align-top transition-colors hover:bg-accent/60 focus:outline-none ${
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
                {dayEvents.slice(0, 2).map((ev) => (
                  <EventChip key={ev.id} ev={ev} onOpen={() => onOpen(ev)} />
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-on-surface-variant pl-1">
                    +{dayEvents.length - 2} lainnya
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DayView({
  events,
  locale,
  onOpen,
  onCreate,
}: {
  events: CalendarEvent[]
  locale: string
  onOpen: (ev: CalendarEvent) => void
  onCreate: () => void
}) {
  return (
    <div className="space-y-2">
      {events.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-on-surface-variant mb-3">Tidak ada event hari ini.</p>
          <Button size="sm" onClick={onCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Buat event
          </Button>
        </div>
      ) : (
        events.map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => onOpen(ev)}
            className="w-full flex items-stretch gap-3 text-left rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
          >
            <span
              className="w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: ev.color || "#3B82F6" }}
            />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-semibold truncate">
                  {ev.isHoliday ? "🎌 " : ""}
                  {ev.title}
                </span>
                {ev.allDay && (
                  <span className="text-[10px] bg-accent rounded px-1.5 py-0.5 shrink-0">
                    Seharian
                  </span>
                )}
              </span>
              <span className="block text-xs text-on-surface-variant mt-0.5">
                {ev.allDay ? "Seharian" : formatTime(ev.startDate, locale)}
                {ev.endDate && !ev.allDay ? ` – ${formatTime(ev.endDate, locale)}` : ""}
                {ev.description ? ` · ${ev.description}` : ""}
              </span>
            </span>
          </button>
        ))
      )}
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <CalendarContent />
    </Suspense>
  )
}
