import type { NextResponse } from "next/server"
import type { ZodSchema } from "zod"
import { ResponseHandler } from "./response-handler"

export async function formDataToObject<T = unknown>(
  formData: FormData,
  schema?: ZodSchema<T>,
): Promise<T> {
  const obj: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    obj[key] = value
  }

  // Jika ada schema, validasi dan casting
  if (schema) {
    const parsed = schema.safeParse(obj)
    if (!parsed.success) {
      throw parsed.error
    }
    return parsed.data
  }
  return obj as T
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
    req: Request,
    params: unknown | null = null,
  ): Promise<T | NextResponse> {
    // 1. Extract Params (dari context jika ada) - Prioritas pertama
    let resolvedParams: unknown = {}
    if (params) {
      resolvedParams = await params
    }

    // 2. Extract Query - Prioritas kedua
    const url = new URL(req.url)
    const query: Record<string, string | string[]> = {}
    url.searchParams.forEach((value, key) => {
      // Handle array notation: categories[]=A&categories[]=B becomes categories: ["A", "B"]
      if (key.endsWith("[]")) {
        const cleanKey = key.slice(0, -2)
        if (!query[cleanKey]) {
          query[cleanKey] = []
        }
        ;(query[cleanKey] as string[]).push(value)
      } else {
        query[key] = value
      }
    })

    // 3. Extract Body (jika bukan GET/HEAD) - Prioritas ketiga
    let body: unknown = {}
    const method = req.method.toUpperCase()
    const contentType = req.headers.get("content-type") || ""
    if (method !== "GET" && method !== "HEAD") {
      try {
        // Support multipart/form-data (FormData) dan JSON
        const clone = req.clone()
        if (contentType.includes("multipart/form-data")) {
          const formData = await clone.formData()
          // Helper konversi FormData ke object (tanpa schema - akan divalidasi later)
          body = await formDataToObject(formData)
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
      // Flatten errors untuk memudahkan pembacaan frontend
      const formattedErrors: Record<string, unknown> = {}
      const errors = validation.error.format() as Record<
        string,
        { _errors: string[] } & Record<string, unknown>
      >

      if (errors.params) formattedErrors.params = errors.params
      if (errors.query) formattedErrors.query = errors.query
      if (errors.body) formattedErrors.body = errors.body

      // Fallback jika error root
      if (Object.keys(formattedErrors).length === 0) {
        return ResponseHandler.badRequest(
          "Validation Error",
          validation.error.flatten().fieldErrors,
        )
      }

      return ResponseHandler.badRequest("Validation Error", formattedErrors)
    }

    return validation.data
  }
}
