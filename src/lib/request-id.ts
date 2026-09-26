import type { NextRequest } from "next/server"

export const REQUEST_ID_HEADER = "x-request-id"

/** Ambil request-id yang disuntik edge-proxy (atau buat fallback sekali pakai). */
export function getRequestId(req?: NextRequest | Request): string | undefined {
  try {
    return req?.headers.get(REQUEST_ID_HEADER) ?? undefined
  } catch {
    return undefined
  }
}
