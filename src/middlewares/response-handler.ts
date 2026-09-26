import { NextResponse } from "next/server"
import { settings } from "@/config/settings"

/**
 * REST envelope standar (Postman best-practice, backward-compatible).
 *
 * Bentuk sukses:  { success: true, message, data, code, requestId? }
 * Bentuk error:   { success: false, message, data?, code, requestId? }
 * - `code` stabil & machine-readable (cth VALIDATION_ERROR) agar klien
 *   tidak perlu parsing `message`.
 * - `requestId` dikirim edge-proxy via header `x-request-id`; route bisa
 *   meneruskannya lewat opts agar terkorelasi dengan server log.
 * - Header standar: `X-Request-ID` selalu, `Location` untuk 201,
 *   `Retry-After` untuk 429.
 */

export type ErrorCode =
  | "OK"
  | "CREATED"
  | "NO_CONTENT"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR"

export interface ResponseOptions {
  code?: ErrorCode | string
  requestId?: string | null
  /** Header tambahan (cth Location, Retry-After). */
  headers?: Record<string, string>
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
  has_more: boolean
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const total_pages = Math.max(Math.ceil(total / Math.max(limit, 1)), 1)
  return { page, limit, total, total_pages, has_more: page < total_pages }
}

export class ResponseHandler {
  private static create(
    success: boolean,
    message: string,
    data: unknown = null,
    status: number,
    opts: ResponseOptions = {},
  ) {
    const body: Record<string, unknown> = {
      success,
      message,
      data,
      code: opts.code ?? (success ? "OK" : "INTERNAL_ERROR"),
    }
    if (opts.requestId) body.requestId = opts.requestId

    const headers: Record<string, string> = { ...(opts.headers ?? {}) }
    if (opts.requestId) headers["X-Request-ID"] = opts.requestId

    return NextResponse.json(body, { status, headers })
  }

  static success(message: string, data: unknown = null, opts: ResponseOptions = {}) {
    return ResponseHandler.create(true, message, data, 200, { code: "OK", ...opts })
  }

  /** Koleksi dengan meta pagination standar Postman. */
  static paginated(
    message: string,
    items: unknown[],
    pagination: PaginationMeta,
    opts: ResponseOptions = {},
  ) {
    return ResponseHandler.success(message, { items, pagination }, { code: "OK", ...opts })
  }

  static created(message: string, data: unknown = null, opts: ResponseOptions = {}) {
    return ResponseHandler.create(true, message, data, 201, { code: "CREATED", ...opts })
  }

  static noContent(opts: ResponseOptions = {}) {
    const headers: Record<string, string> = { ...(opts.headers ?? {}) }
    if (opts.requestId) headers["X-Request-ID"] = opts.requestId
    return new NextResponse(null, { status: 204, headers })
  }

  static badRequest(
    message = "Bad Request",
    errorData: unknown = null,
    opts: ResponseOptions = {},
  ) {
    return ResponseHandler.create(false, message, errorData, 400, {
      code: "BAD_REQUEST",
      ...opts,
    })
  }

  /** Format body invalid tapi semantik gagal (Postman: 422). */
  static unprocessable(
    message = "Unprocessable Entity",
    errorData: unknown = null,
    opts: ResponseOptions = {},
  ) {
    return ResponseHandler.create(false, message, errorData, 422, {
      code: "UNPROCESSABLE",
      ...opts,
    })
  }

  static unauthorized(message = "Unauthorized", opts: ResponseOptions = {}) {
    return ResponseHandler.create(false, message, null, 401, { code: "UNAUTHORIZED", ...opts })
  }

  static forbidden(message = "Forbidden", opts: ResponseOptions = {}) {
    return ResponseHandler.create(false, message, null, 403, { code: "FORBIDDEN", ...opts })
  }

  static notFound(message = "Resource not found", opts: ResponseOptions = {}) {
    return ResponseHandler.create(false, message, null, 404, { code: "NOT_FOUND", ...opts })
  }

  static conflict(message = "Conflict", conflictData: unknown = null, opts: ResponseOptions = {}) {
    return ResponseHandler.create(false, message, conflictData, 409, { code: "CONFLICT", ...opts })
  }

  static tooManyRequests(message = "Too Many Requests", opts: ResponseOptions = {}) {
    return ResponseHandler.create(false, message, null, 429, {
      code: "TOO_MANY_REQUESTS",
      ...opts,
    })
  }

  static internalError(
    message = "Internal Server Error",
    errorStack: unknown = null,
    opts: ResponseOptions = {},
  ) {
    const isDev = settings.NODE_ENV !== "production"
    const errorData = isDev ? errorStack : null

    return ResponseHandler.create(false, message, errorData, 500, {
      code: "INTERNAL_ERROR",
      ...opts,
    })
  }
}
