import type { NextRequest, NextResponse } from "next/server"
import type { ZodSchema } from "zod"
import { ResponseHandler } from "./response-handler"

export async function formDataToObject(formData: FormData): Promise<Record<string, unknown>> {
  const obj: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    obj[key] = value
  }
  return obj
}

export class RequestHandler {
  /**
   * Memvalidasi request dengan urutan: params → query → body
   * Schema harus memiliki struktur { params?, query?, body? }.
   * Jika gagal, akan mengembalikan NextResponse (langsung return ini di route).
   * Jika sukses, akan mengembalikan data yang sudah divalidasi (T).
   *
   * @param schema - Zod schema untuk validasi { params?, query?, body? }
   * @param req - NextRequest object
   * @param params - Optional: params dari route context (untuk dynamic routes), default null
   */
  static async validateRequest<T>(
    schema: ZodSchema<T>,
    req: NextRequest,
    params: unknown | null = null,
  ): Promise<T | NextResponse> {
    // 1. Extract Params (dari context jika ada) - Prioritas pertama
    let resolvedParams: unknown = {}
    if (params) {
      resolvedParams = await params
    }

    // 2. Extract Query - Prioritas kedua
    const url = new URL(req.url)
    const query: Record<string, string> = Object.fromEntries(url.searchParams)

    // 3. Extract Body (jika bukan GET/HEAD) - Prioritas ketiga
    let body: unknown = {}
    const method = req.method.toUpperCase()
    const contentType = req.headers.get("content-type") || ""
    if (method !== "GET" && method !== "HEAD") {
      try {
        // Support multipart/form-data (FormData) dan JSON
        const clone = req.clone()
        if (contentType.includes("multipart/form-data")) {
          body = await formDataToObject(await clone.formData())
        } else {
          body = await clone.json()
        }
      } catch {
        // Body kosong atau invalid, biarkan object kosong
      }
    }

    // 4. Construct Object untuk Validasi (urutan: params, query, body)
    const dataToValidate = {
      params: resolvedParams,
      query,
      body,
    }

    // 5. Validasi
    const validation = schema.safeParse(dataToValidate)

    if (!validation.success) {
      // Postman best-practice: kembalikan SEMUA error validasi sekaligus
      // dalam bentuk details[] { field, message } + code stabil.
      const details = validation.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message,
        code: issue.code,
      }))

      // Bentuk legacy { params?, query?, body? } tetap disertakan agar
      // frontend lama tidak rusak.
      const formattedErrors: Record<string, unknown> = {}
      const errors = validation.error.format() as Record<
        string,
        { _errors: string[] } & Record<string, unknown>
      >

      if (errors.params) formattedErrors.params = errors.params
      if (errors.query) formattedErrors.query = errors.query
      if (errors.body) formattedErrors.body = errors.body

      return ResponseHandler.badRequest(
        "Validation Error",
        { details, ...formattedErrors },
        {
          code: "VALIDATION_ERROR",
        },
      )
    }

    return validation.data
  }
}
