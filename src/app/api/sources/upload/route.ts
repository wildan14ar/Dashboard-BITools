import { promises as fs } from "node:fs"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { settings } from "@/config/settings"
import { logActivity } from "@/lib/activity"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

const uploadIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/)
const STALE_PART_MS = 24 * 60 * 60 * 1000

function uploadsDir() {
  return path.join(settings.uploads.dir, "uploads")
}

async function readMeta(
  uploadId: string,
): Promise<{ totalChunks: number; received: number; filename: string } | null> {
  try {
    const raw = await fs.readFile(path.join(uploadsDir(), `${uploadId}.meta.json`), "utf-8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function cleanupStaleParts() {
  try {
    const dir = uploadsDir()
    const entries = await fs.readdir(dir)
    const now = Date.now()
    await Promise.all(
      entries
        .filter((e) => e.endsWith(".part") || e.endsWith(".meta.json"))
        .map(async (e) => {
          try {
            const st = await fs.stat(path.join(dir, e))
            if (now - st.mtimeMs > STALE_PART_MS) await fs.unlink(path.join(dir, e))
          } catch {
            // best-effort
          }
        }),
    )
  } catch {
    // direktori belum ada — abaikan
  }
}

/**
 * Upload chunked untuk source file (kind=file/kind=upload).
 * Klien mengiris file (disarankan 5 MB/chunk) dan mengirim sekuensial:
 * FormData { uploadId, chunkIndex, totalChunks, filename, chunk: Blob }.
 * Chunk terakhir (chunkIndex == totalChunks-1) memicu finalisasi
 * dan mengembalikan { path } relatif terhadap DATA_DIR.
 */
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["sources:create"] })
  if (error) return error

  try {
    const form = await request.formData()
    const validation = await RequestHandler.validateRequest(
      z.object({
        body: z.object({
          uploadId: uploadIdSchema,
          chunkIndex: z.coerce.number().int().min(0),
          totalChunks: z.coerce.number().int().min(1).max(2000),
          filename: z.string().min(1).max(255),
        }),
      }),
      // RequestHandler membaca body JSON; FormData di sini sudah diparse manual.
      new NextRequest(request.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          uploadId: form.get("uploadId"),
          chunkIndex: form.get("chunkIndex"),
          totalChunks: form.get("totalChunks"),
          filename: form.get("filename"),
        }),
      }),
    )
    if (validation instanceof NextResponse) return validation

    const { uploadId, chunkIndex, totalChunks, filename } = validation.body
    const chunk = form.get("chunk")
    if (!(chunk instanceof Blob)) return ResponseHandler.badRequest("Chunk file wajib ada")
    if (chunkIndex >= totalChunks) return ResponseHandler.badRequest("chunkIndex di luar rentang")

    const ext = path.extname(filename).toLowerCase()
    if (!(settings.uploads.allowedExts as readonly string[]).includes(ext)) {
      return ResponseHandler.badRequest(
        `Ekstensi ${ext || "(tanpa ekstensi)"} tidak didukung (hanya .csv/.xlsx)`,
      )
    }

    const dir = uploadsDir()
    await fs.mkdir(dir, { recursive: true })
    const partPath = path.join(dir, `${uploadId}.part`)
    const meta = await readMeta(uploadId)

    if (meta) {
      if (meta.totalChunks !== totalChunks || meta.filename !== filename) {
        return ResponseHandler.badRequest("Upload session tidak konsisten, ulangi dari awal")
      }
      if (chunkIndex !== meta.received) {
        return ResponseHandler.badRequest(
          `Chunk tak berurutan: server menunggu chunk ${meta.received}`,
        )
      }
    } else {
      if (chunkIndex !== 0) {
        return ResponseHandler.badRequest("Chunk pertama harus chunkIndex 0")
      }
      await fs.writeFile(
        path.join(dir, `${uploadId}.meta.json`),
        JSON.stringify({ totalChunks, received: 0, filename }),
      )
    }

    const buf = Buffer.from(await chunk.arrayBuffer())
    const partStat = await fs.stat(partPath).catch(() => null)
    const currentSize = partStat?.size ?? 0
    if (currentSize + buf.length > settings.uploads.maxBytes) {
      return ResponseHandler.badRequest("Ukuran file melebihi batas upload")
    }
    await fs.appendFile(partPath, buf)
    const received = (meta?.received ?? 0) + 1
    await fs.writeFile(
      path.join(dir, `${uploadId}.meta.json`),
      JSON.stringify({ totalChunks, received, filename }),
    )

    if (received < totalChunks) {
      return ResponseHandler.success("Chunk diterima", { received, totalChunks })
    }

    // Finalisasi: validasi magic bytes lalu rename ke nama final.
    const fd = await fs.open(partPath, "r")
    const head = Buffer.alloc(4)
    await fd.read(head, 0, 4, 0)
    await fd.close()
    if (ext === ".xlsx" && head.subarray(0, 4).toString("binary") !== "PK\x03\x04") {
      await fs.unlink(partPath).catch(() => {})
      return ResponseHandler.badRequest("File bukan XLSX valid")
    }
    if (ext === ".csv" && head.includes(0)) {
      await fs.unlink(partPath).catch(() => {})
      return ResponseHandler.badRequest("File bukan CSV teks valid")
    }

    const finalName = `${uploadId}${ext}`
    await fs.rename(partPath, path.join(dir, finalName))
    await fs.unlink(path.join(dir, `${uploadId}.meta.json`)).catch(() => {})
    void cleanupStaleParts()

    await logActivity(session?.user?.id || "system", "CREATE", "BiSourceUpload", uploadId, {
      filename,
      size: currentSize + buf.length,
    })
    return ResponseHandler.created("Upload selesai", {
      path: `uploads/${finalName}`,
      size: currentSize + buf.length,
    })
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiSourceUpload", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengunggah chunk", err)
  }
}
