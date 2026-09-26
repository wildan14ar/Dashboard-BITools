import { z } from "zod"

// Prefix proxy URL attachment — disalin dari ATTACHMENTS_URL_PREFIX di
// src/config/storage.ts (tidak import langsung agar file ini tetap aman
// dipakai di client component tanpa menarik S3 SDK / Prisma).
export const ATTACHMENT_URL_PREFIX = "/api/attachments/"

/**
 * Referensi dokumen terpusat: HARUS proxy URL attachment atau URL eksternal.
 * Base64 inline (data:...) TIDAK diterima — upload dulu via POST /api/attachments.
 */
export const AttachmentUrlSchema = z
  .string()
  .min(1, "Referensi dokumen tidak boleh kosong")
  .refine((v) => !v.startsWith("data:"), {
    message: "Gambar inline base64 tidak didukung — upload via /api/attachments",
  })
  .refine((v) => v.startsWith(ATTACHMENT_URL_PREFIX) || /^https?:\/\//.test(v), {
    message: "Harus URL attachment (/api/attachments/<id>) atau URL eksternal http(s)",
  })

export const OptionalAttachmentUrlSchema = AttachmentUrlSchema.optional()
export const NullableAttachmentUrlSchema = AttachmentUrlSchema.nullable().optional()
