import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ulid } from "ulid"
import api from "@/lib/api"

// Types
export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  createdById: string | null
  startDate: string | null
  endDate: string | null
  allDay: boolean
  color: string
  isNotify: boolean
  isHoliday: boolean
  repeatType: string
  repeatDays: string
  notes: string[]
  userIds: string[]
  occurrences: string[]
  createdAt: string | null
  updatedAt: string | null
}

export interface CalendarInput {
  title?: string
  description?: string | null
  startDate?: string | number | Date
  endDate?: string | number | Date | null
  allDay?: boolean
  color?: string
  isNotify?: boolean
  isHoliday?: boolean
  repeatType?: string
  repeatDays?: string
  notes?: string[]
  userIds?: string[]
}

export type ListCalendarParams = {
  year?: number
  month?: number
  isHoliday?: boolean
}

// Query Keys
export const calendarKeys = {
  all: ["calendar"] as const,
  list: (params: ListCalendarParams) => [...calendarKeys.all, "list", params] as const,
  detail: (id: string) => [...calendarKeys.all, "detail", id] as const,
}

// Hooks
export function useCalendarEvents(params: ListCalendarParams) {
  return useQuery({
    queryKey: calendarKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<CalendarEvent[]>("/calendar", { params })
      return data ?? []
    },
  })
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CalendarInput) => {
      const { data } = await api.post<CalendarEvent>("/calendar", input, {
        idempotencyKey: ulid(),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: CalendarInput & { id: string }) => {
      const { data } = await api.put<CalendarEvent>(`/calendar/${id}`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ id: string }>(`/calendar/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}
