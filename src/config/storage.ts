import { createHash } from "node:crypto"
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { ulid } from "ulid"
import prisma from "@/config/prisma"
import { settings } from "@/config/settings"
import type { Attachment } from "@/generated/client/client"

const PREVIEWABLE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]

// Prefix proxy URL — satu-satunya bentuk referensi file di API & kolom dokumen.
export const ATTACHMENTS_URL_PREFIX = "/api/attachments/"

// ============================================================================
// Error
// ============================================================================

export class StorageError extends Error {
  code: "FILE_TOO_LARGE" | "EMPTY_FILE" | "S3_ERROR" | "DB_ERROR"
  constructor(code: StorageError["code"], message: string) {
    super(message)
    this.code = code
  }
}

// ============================================================================
// S3 Client (lazy — hanya dibuat bila env S3 lengkap)
// ============================================================================

export function isS3Enabled(): boolean {
  const { endpoint, bucket, accessKey, secretKey } = settings.s3
  return Boolean(endpoint && bucket && accessKey && secretKey)
}

let s3Client: S3Client | null = null
let bucketEnsured = false

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: settings.s3.endpoint,
      region: settings.s3.region,
      forcePathStyle: settings.s3.forcePathStyle,
      credentials: {
        accessKeyId: settings.s3.accessKey,
        secretAccessKey: settings.s3.secretKey,
      },
    })
  }
  return s3Client
}

// Pastikan bucket ada (best-effort, sekali per proses).
async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return
  const client = getS3Client()
  const Bucket = settings.s3.bucket
  try {
    await client.send(new HeadBucketCommand({ Bucket }))
  } catch {
    await client.send(new CreateBucketCommand({ Bucket }))
  }
  bucketEnsured = true
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Uint8Array) return Buffer.from(body)
  const chunks: Uint8Array[] = []
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// ============================================================================
// Helpers
// ============================================================================

export function toAttachmentUrl(value: string | null): string | null {
  if (!value) return null
  if (value.startsWith("http")) return value
  if (value.startsWith(ATTACHMENTS_URL_PREFIX)) return value
  return `${ATTACHMENTS_URL_PREFIX}${value}`
}

export function isAttachmentUrl(value: string | null | undefined): boolean {
  return !!value && value.startsWith(ATTACHMENTS_URL_PREFIX)
}

export function attachmentIdFromUrl(value: string | null | undefined): string | null {
  if (!isAttachmentUrl(value)) return null
  const id = (value as string).slice(ATTACHMENTS_URL_PREFIX.length).split("/")[0]
  return id || null
}

/**
 * Hapus attachment bila value adalah proxy URL attachment.
 * Best-effort (toleran gagal) — dipakai saat dokumen diganti/dihapus
 * agar tidak ada file yatim. Bukan error bila value bukan attachment.
 */
export async function deleteAttachmentByUrl(value: string | null | undefined): Promise<boolean> {
  const id = attachmentIdFromUrl(value)
  if (!id) return false
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id } })
    if (!attachment) return false
    await prisma.attachment.delete({ where: { id } })
    await removeBackendObject(attachment)
    return true
  } catch {
    return false
  }
}

function sanitizeFilename(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180)
  return safe || "file"
}

function normalizeMime(mime: string): string {
  // File API kadang kirim "text/plain;charset=utf-8" — samakan ke tipe dasar
  // agar cocok dengan PREVIEWABLE_TYPES dan Content-Type stabil.
  return mime.split(";")[0]?.trim().toLowerCase() || "application/octet-stream"
}

function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex")
}

function assertUploadable(file: File): void {
  if (!file || file.size <= 0) {
    throw new StorageError("EMPTY_FILE", "File kosong atau tidak valid")
  }
  if (file.size > settings.storage.maxFileSize) {
    const maxMb = (settings.storage.maxFileSize / (1024 * 1024)).toFixed(1)
    throw new StorageError("FILE_TOO_LARGE", `Ukuran file maksimal ${maxMb} MB`)
  }
}

// ============================================================================
// Types
// ============================================================================

export type AttachmentSelect = {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  user?: {
    id: string
    fullname: string | null
    email: string
    username: string
  } | null
  createdAt?: Date
}

export type AttachmentFull = Attachment

const selectShape = {
  id: true,
  fileName: true,
  fileUrl: true,
  fileType: true,
  fileSize: true,
} as const

// ============================================================================
// LIST
// ============================================================================

// Kolom yang boleh di-sort via ?sort= (whitelist — cegah orderBy injection).
export const ATTACHMENT_SORT_FIELDS = ["createdAt", "fileName", "fileSize", "fileType"] as const
export type AttachmentSortField = (typeof ATTACHMENT_SORT_FIELDS)[number]

export async function getAll(
  userId?: string,
  opts: {
    skip?: number
    take?: number
    sort?: string
    order?: string
  } = {},
): Promise<AttachmentSelect[]> {
  const sort: AttachmentSortField = ATTACHMENT_SORT_FIELDS.includes(
    opts.sort as AttachmentSortField,
  )
    ? (opts.sort as AttachmentSortField)
    : "createdAt"
  const order = opts.order === "asc" ? "asc" : "desc"
  return prisma.attachment.findMany({
    where: userId ? { userId } : {},
    orderBy: { [sort]: order },
    skip: opts.skip,
    take: opts.take,
    select: {
      ...selectShape,
      createdAt: true,
      user: {
        select: {
          id: true,
          fullname: true,
          email: true,
          username: true,
        },
      },
    },
  })
}

export async function countAttachments(userId?: string): Promise<number> {
  return prisma.attachment.count({
    where: userId ? { userId } : {},
  })
}

// ============================================================================
// READ (Preview / Download)
// ============================================================================

/**
 * Ambil attachment untuk preview atau download.
 * Sumber bytes: S3 bila row.storage = "s3", kolom data bila "db".
 */
export async function get(
  id: string,
  mode: "preview" | "download" = "preview",
): Promise<{
  buffer: Buffer
  attachment: AttachmentFull
  contentType: string
  contentDisposition: string
} | null> {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
  })

  if (!attachment) return null

  let buffer: Buffer | null = null
  if (attachment.storage === "s3") {
    if (!isS3Enabled()) {
      console.warn(`[storage] attachment ${id} tersimpan di S3 tapi env S3 tidak lengkap`)
      return null
    }
    try {
      const res = await getS3Client().send(
        new GetObjectCommand({
          Bucket: settings.s3.bucket,
          Key: attachment.filePath,
        }),
      )
      buffer = await streamToBuffer(res.Body)
    } catch (error) {
      console.error(`[storage] gagal ambil S3 ${attachment.filePath}`, error)
      return null
    }
  } else {
    if (!attachment.data) return null
    buffer = Buffer.from(attachment.data)
  }

  const isPreviewable = PREVIEWABLE_TYPES.includes(attachment.fileType)
  const contentDisposition =
    mode === "download" || !isPreviewable
      ? `attachment; filename="${attachment.fileName}"`
      : `inline; filename="${attachment.fileName}"`

  return {
    buffer,
    attachment,
    contentType: attachment.fileType,
    contentDisposition,
  }
}

// ============================================================================
// CREATE
// ============================================================================

type StoredPayload = {
  filePath: string
  storage: "s3" | "db"
  data: Uint8Array<ArrayBuffer> | null
}

async function storeNewFile(userId: string, file: File, buffer: Buffer): Promise<StoredPayload> {
  const objectName = `${userId}/${ulid()}_${sanitizeFilename(file.name)}`
  if (isS3Enabled()) {
    await ensureBucket()
    try {
      await getS3Client().send(
        new PutObjectCommand({
          Bucket: settings.s3.bucket,
          Key: objectName,
          Body: buffer,
          ContentType: normalizeMime(file.type),
          Metadata: {
            "original-name": file.name,
            "uploaded-by": userId,
            "uploaded-at": new Date().toISOString(),
          },
        }),
      )
    } catch (error) {
      throw new StorageError("S3_ERROR", `Gagal upload ke S3: ${String(error)}`)
    }
    return { filePath: objectName, storage: "s3", data: null }
  }
  // Fallback: simpan bytes langsung di DB (salin ke ArrayBuffer murni
  // agar cocok dengan tipe Bytes Prisma).
  const copy = new Uint8Array(buffer.byteLength)
  copy.set(buffer)
  return { filePath: `db/${objectName}`, storage: "db", data: copy }
}

/**
 * Upload file baru. Ke S3 bila env lengkap, ke kolom data (DB) bila tidak.
 */
export async function create(file: File, userId: string): Promise<AttachmentSelect> {
  assertUploadable(file)
  const buffer = Buffer.from(await file.arrayBuffer())
  const stored = await storeNewFile(userId, file, buffer)

  const id = ulid()
  try {
    return await prisma.attachment.create({
      data: {
        id,
        fileName: file.name,
        fileUrl: `${ATTACHMENTS_URL_PREFIX}${id}`,
        filePath: stored.filePath,
        fileType: normalizeMime(file.type),
        fileSize: file.size,
        fileHash: sha256Hex(buffer),
        storage: stored.storage,
        data: stored.data,
        userId,
      },
      select: selectShape,
    })
  } catch (error) {
    // Rollback object S3 bila insert DB gagal agar tidak yatim.
    if (stored.storage === "s3") {
      try {
        await getS3Client().send(
          new DeleteObjectCommand({
            Bucket: settings.s3.bucket,
            Key: stored.filePath,
          }),
        )
      } catch {
        // best-effort
      }
    }
    throw error instanceof StorageError
      ? error
      : new StorageError("DB_ERROR", `Gagal simpan attachment: ${String(error)}`)
  }
}

// ============================================================================
// UPDATE
// ============================================================================

async function removeBackendObject(attachment: AttachmentFull): Promise<void> {
  if (attachment.storage !== "s3" || !isS3Enabled()) return
  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: settings.s3.bucket,
        Key: attachment.filePath,
      }),
    )
  } catch {
    // File lama boleh tidak ada — abaikan.
  }
}

/**
 * Update isi file (re-upload) — ID & proxy URL tetap sama.
 */
export async function update(
  id: string,
  file: File,
  userId?: string,
): Promise<AttachmentSelect | null> {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
  })

  if (!attachment) return null
  if (userId && attachment.userId !== userId) return null

  assertUploadable(file)
  const buffer = Buffer.from(await file.arrayBuffer())

  await removeBackendObject(attachment)
  const stored = await storeNewFile(attachment.userId, file, buffer)

  const updated = await prisma.attachment.update({
    where: { id },
    data: {
      fileName: file.name,
      filePath: stored.filePath,
      fileType: normalizeMime(file.type),
      fileSize: file.size,
      fileHash: sha256Hex(buffer),
      storage: stored.storage,
      data: stored.data,
    },
    select: selectShape,
  })

  return updated
}

/**
 * Update metadata saja (fileName) — tidak menyentuh isi file.
 */
export async function updateMetadata(
  id: string,
  data: { fileName?: string },
  userId?: string,
): Promise<AttachmentSelect | null> {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
  })

  if (!attachment) return null
  if (userId && attachment.userId !== userId) return null

  const updateData: Partial<Attachment> = {}
  if (data.fileName) {
    updateData.fileName = data.fileName
  }

  const updated = await prisma.attachment.update({
    where: { id },
    data: updateData,
    select: selectShape,
  })

  return updated
}

// ============================================================================
// DELETE
// ============================================================================

/**
 * Hapus attachment + file backend-nya.
 */
export async function delete_(
  id: string,
  userId?: string,
  deleteFile = true,
): Promise<{ success: boolean; message: string; attachment?: AttachmentFull }> {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
  })
  if (!attachment) {
    return { success: false, message: "Attachment not found" }
  }
  if (userId && attachment.userId !== userId) {
    return { success: false, message: "You don't have permission to delete this file" }
  }

  const deleted = await prisma.attachment.delete({
    where: { id },
  })

  if (deleteFile) {
    await removeBackendObject(attachment)
  }

  return { success: true, message: "Attachment deleted successfully", attachment: deleted }
}
