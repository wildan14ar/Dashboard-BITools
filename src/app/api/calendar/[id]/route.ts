import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/config/prisma"
import { logActivity } from "@/lib/activity"
import {
  canReadEvent,
  canWriteEvent,
  EVENT_FIELDS,
  resolveAssignees,
  serializeEvent,
  stringifyNotes,
  syncEventNotifications,
} from "@/lib/calendar"
import { applyFields, parseFields } from "@/lib/fields"
import { getRequestId } from "@/lib/request-id"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { fetchAndCachePermissions } from "@/middlewares/rbac"

const ParamsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  query: z
    .object({
      // Postman: field selection — ?fields=title,startDate
      fields: z.string().optional(),
    })
    .optional(),
})

const BodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  startDate: z.union([z.string(), z.number(), z.date()]).optional(),
  endDate: z.union([z.string(), z.number(), z.date()]).optional().nullable(),
  allDay: z.boolean().optional(),
  color: z.string().optional().nullable(),
  isNotify: z.boolean().optional(),
  isHoliday: z.boolean().optional(),
  repeatType: z.string().optional(),
  repeatDays: z.string().optional(),
  notes: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error
    const requestId = getRequestId(request)

    const validation = await RequestHandler.validateRequest(ParamsSchema, request, params)
    if (validation instanceof NextResponse) return validation

    const event = await prisma.calendar.findUnique({
      where: { id: validation.params.id },
      include: { assignments: { select: { userId: true } } },
    })
    const perms = await fetchAndCachePermissions(session.user.id)
    if (!event || !canReadEvent(event, session.user.id, perms?.isSuperAdmin ?? false)) {
      return ResponseHandler.notFound("Calendar event not found", { requestId })
    }

    const { fields, unknown } = parseFields(validation.query?.fields, EVENT_FIELDS)
    if (validation.query?.fields && fields !== null && fields.length === 0) {
      return ResponseHandler.badRequest(
        `Unknown fields: ${unknown.join(", ")}. Allowed: ${EVENT_FIELDS.join(", ")}`,
        { field: "fields" },
        { code: "VALIDATION_ERROR", requestId },
      )
    }

    return ResponseHandler.success(
      "Calendar event fetched",
      applyFields(serializeEvent(event), fields),
      {
        requestId,
      },
    )
  } catch (err) {
    return ResponseHandler.internalError("Failed to fetch calendar event", err, {
      requestId: getRequestId(request),
    })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireAuth()
    if (error || !session) {
      return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
    }
    const requestId = getRequestId(request)

    const { id } = await params
    const existing = await prisma.calendar.findUnique({
      where: { id },
      include: { assignments: { select: { userId: true } } },
    })
    const perms = await fetchAndCachePermissions(session.user.id)
    if (!existing || !canWriteEvent(existing, session.user.id, perms?.isSuperAdmin ?? false)) {
      // Samarkan kepemilikan: sama seperti tidak ada.
      return ResponseHandler.notFound("Calendar event not found", { requestId })
    }

    const v = await RequestHandler.validateRequest(z.object({ body: BodySchema }), request)
    if (v instanceof NextResponse) return v

    const { userIds, notes, ...rest } = v.body

    const data: Record<string, unknown> = {}
    if (rest.title !== undefined) data.title = rest.title
    if (rest.description !== undefined) data.description = rest.description ?? null
    if (rest.startDate !== undefined) data.startDate = new Date(rest.startDate)
    if (rest.endDate !== undefined) data.endDate = rest.endDate ? new Date(rest.endDate) : null
    if (rest.allDay !== undefined) data.allDay = rest.allDay
    if (rest.color !== undefined) data.color = rest.color ?? "#3B82F6"
    if (rest.isNotify !== undefined) data.isNotify = rest.isNotify
    if (rest.isHoliday !== undefined) data.isHoliday = rest.isHoliday
    if (rest.repeatType !== undefined) data.repeatType = rest.repeatType
    if (rest.repeatDays !== undefined) data.repeatDays = rest.repeatDays
    if (notes !== undefined) data.notes = stringifyNotes(notes)

    let assignees: string[] | undefined
    if (userIds !== undefined) {
      const resolved = await resolveAssignees(prisma, userIds)
      if (resolved.valid === null) {
        return ResponseHandler.unprocessable("Assignee tidak valid", {
          unknown: resolved.unknown,
          field: "userIds",
        })
      }
      assignees = resolved.valid
    }

    if (Object.keys(data).length === 0 && assignees === undefined) {
      return ResponseHandler.badRequest("Tidak ada field yang diubah", { field: "body" })
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (assignees !== undefined) {
        await tx.calendarAssignment.deleteMany({ where: { calendarId: id } })
        if (assignees.length > 0) {
          await tx.calendarAssignment.createMany({
            data: assignees.map((userId) => ({ calendarId: id, userId })),
          })
        }
      }
      return tx.calendar.update({
        where: { id },
        data,
        include: { assignments: { select: { userId: true } } },
      })
    })

    await logActivity(session.user.id, "UPDATE", "Calendar", id, {})

    // Sinkron notifikasi: isNotify true → buat/refresh pengingat;
    // false/absen (pakai nilai akhir) → hapus pengingat otomatis.
    const notifyEnabled = rest.isNotify !== undefined ? rest.isNotify : existing.isNotify
    await syncEventNotifications(
      prisma,
      updated,
      updated.assignments.map((a) => a.userId),
      notifyEnabled,
    )

    return ResponseHandler.success("Calendar event updated", serializeEvent(updated), { requestId })
  } catch (err) {
    return ResponseHandler.internalError("Failed to update calendar event", err, {
      requestId: getRequestId(request),
    })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireAuth()
    if (error || !session) {
      return error ?? ResponseHandler.unauthorized("Tidak terautentikasi")
    }
    const requestId = getRequestId(request)

    const { id } = await params
    const existing = await prisma.calendar.findUnique({ where: { id } })
    const perms = await fetchAndCachePermissions(session.user.id)
    if (!existing || !canWriteEvent(existing, session.user.id, perms?.isSuperAdmin ?? false)) {
      return ResponseHandler.notFound("Calendar event not found", { requestId })
    }

    await prisma.calendar.delete({ where: { id } })
    // Notifikasi terkait ikut terhapus otomatis via onDelete: Cascade.
    await logActivity(session.user.id, "DELETE", "Calendar", id, {})

    return ResponseHandler.success("Calendar event deleted", { id }, { requestId })
  } catch (err) {
    return ResponseHandler.internalError("Failed to delete calendar event", err, {
      requestId: getRequestId(request),
    })
  }
}
