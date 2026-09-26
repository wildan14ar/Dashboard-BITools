import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import {
  EVENT_FIELDS,
  resolveAssignees,
  serializeEvent,
  syncEventNotifications,
} from "@/lib/calendar"
import { applyFieldsMany, parseFields } from "@/lib/fields"
import { idempotencyScope, rememberIdempotent, tryReplayIdempotent } from "@/lib/idempotency"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

function parseNotes(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function stringifyNotes(value: unknown): string {
  return JSON.stringify(Array.isArray(value) ? value.map(String) : [])
}

function buildOccurrences(input: {
  startDate: Date
  endDate?: Date | null
  repeatType: string
  repeatDays: string
  month: number
  year: number
}): string[] {
  const { startDate, endDate, repeatType } = input
  const occurrences: string[] = []

  const monthStart = new Date(input.year, input.month - 1, 1)
  const monthEnd = new Date(input.year, input.month, 0, 23, 59, 59, 999)

  if (repeatType === "none") {
    if (startDate >= monthStart && startDate <= monthEnd) occurrences.push(startDate.toISOString())
    return occurrences
  }

  const cursor = new Date(startDate)
  const maxLoops = 370
  let guard = 0

  while (guard < maxLoops) {
    if (cursor > monthEnd) break
    if (cursor >= monthStart) occurrences.push(new Date(cursor).toISOString())
    if (endDate && cursor > endDate) break

    const next = new Date(cursor)
    if (repeatType === "daily") next.setDate(next.getDate() + 1)
    else if (repeatType === "weekly") next.setDate(next.getDate() + 7)
    else if (repeatType === "monthly") next.setMonth(next.getMonth() + 1)
    else break

    cursor.setTime(next.getTime())
    guard++
  }

  return occurrences
}

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error
    const requestId = getRequestId(request)

    const v = await RequestHandler.validateRequest(
      z.object({
        query: z.object({
          year: z.coerce.number().int().min(2000).optional(),
          month: z.coerce.number().int().min(1).max(12).optional(),
          isHoliday: z
            .string()
            .optional()
            .transform((val) => (val === undefined ? undefined : val === "true")),
          // Postman: field selection — ?fields=title,startDate
          fields: z.string().optional(),
        }),
      }),
      request,
    )
    if (v instanceof NextResponse) return v

    const { year, month, isHoliday, fields: fieldsRaw } = v.query

    const { fields, unknown } = parseFields(fieldsRaw, EVENT_FIELDS)
    if (fieldsRaw && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${EVENT_FIELDS.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR", requestId },
      )
    }

    const where: Record<string, unknown> = {
      OR: [
        { createdById: null },
        { createdById: session.user.id },
        { assignments: { some: { userId: session.user.id } } },
      ],
    }
    if (isHoliday !== undefined) where.isHoliday = isHoliday

    if (year && month) {
      where.startDate = {
        lte: new Date(year, month, 0, 23, 59, 59, 999),
      }
    }

    const events = await prisma.calendar.findMany({
      where,
      include: { assignments: { select: { userId: true } } },
      orderBy: { startDate: "asc" },
    })

    const data = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      createdById: event.createdById,
      startDate: event.startDate,
      endDate: event.endDate,
      allDay: event.allDay,
      color: event.color,
      isNotify: event.isNotify,
      isHoliday: event.isHoliday,
      repeatType: event.repeatType,
      repeatDays: event.repeatDays,
      notes: parseNotes(event.notes),
      userIds: event.assignments.map((a) => a.userId),
      occurrences: buildOccurrences({
        startDate: event.startDate,
        endDate: event.endDate,
        repeatType: event.repeatType,
        repeatDays: event.repeatDays,
        month: month ?? new Date().getMonth() + 1,
        year: year ?? new Date().getFullYear(),
      }),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }))

    return ResponseHandler.success("Calendar events fetched", applyFieldsMany(data, fields), {
      requestId,
    })
  } catch (err) {
    return ResponseHandler.internalError("Failed to fetch calendar events", err, {
      requestId: getRequestId(request),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const scope = idempotencyScope(session.user.id)
    const replay = await tryReplayIdempotent(request, scope)
    if (replay) return replay

    const v = await RequestHandler.validateRequest(
      z.object({
        body: z.object({
          title: z.string().min(1).max(200),
          description: z.string().optional().nullable(),
          startDate: z.union([z.string(), z.number(), z.date()]),
          endDate: z.union([z.string(), z.number(), z.date()]).optional().nullable(),
          allDay: z.boolean().optional().default(false),
          color: z.string().optional().nullable(),
          isNotify: z.boolean().optional().default(false),
          isHoliday: z.boolean().optional().default(false),
          repeatType: z.string().optional().default("none"),
          repeatDays: z.string().optional().default(""),
          notes: z.array(z.string()).optional().default([]),
          userIds: z.array(z.string()).optional().default([]),
        }),
      }),
      request,
    )
    if (v instanceof NextResponse) return v

    const { userIds, notes, ...rest } = v.body

    const startDate = new Date(rest.startDate)
    const endDate = rest.endDate ? new Date(rest.endDate) : null

    // Assignee harus user aktif & ada — selain itu 422 (bukan 500 FK).
    const resolved = await resolveAssignees(prisma, userIds)
    if (resolved.valid === null) {
      return ResponseHandler.unprocessable("Assignee tidak valid", {
        unknown: resolved.unknown,
        field: "userIds",
      })
    }
    const assigneeIds = [...new Set([session.user.id, ...resolved.valid])]

    const event = await prisma.calendar.create({
      data: {
        title: rest.title,
        description: rest.description ?? null,
        createdById: session.user.id,
        startDate,
        endDate,
        allDay: rest.allDay,
        color: rest.color ?? "#3B82F6",
        isNotify: rest.isNotify,
        isHoliday: rest.isHoliday,
        repeatType: rest.repeatType,
        repeatDays: rest.repeatDays,
        notes: stringifyNotes(notes),
        assignments: {
          create: assigneeIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: { assignments: { select: { userId: true } } },
    })

    // isNotify=true → langsung buat notifikasi pengingat untuk assignee.
    if (rest.isNotify) {
      await syncEventNotifications(prisma, event, assigneeIds, true)
    }

    return rememberIdempotent(
      request,
      scope,
      ResponseHandler.created("Calendar event created", serializeEvent(event), {
        requestId: getRequestId(request),
        headers: { Location: `/api/calendar/${event.id}` },
      }),
    )
  } catch (err) {
    return ResponseHandler.internalError("Failed to create calendar event", err, {
      requestId: getRequestId(request),
    })
  }
}
