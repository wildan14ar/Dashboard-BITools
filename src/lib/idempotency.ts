/**
 * Idempotency-Key untuk POST (Postman best-practice).
 *
 * Klien mengirim header `Idempotency-Key: <ulid>`; retry dengan key yang sama
 * mengembalikan respons tersimpan tanpa efek samping ganda. Key yang dipakai
 * ulang dengan payload berbeda → 422.
 *
 * Penyimpanan in-memory (single-instance). Untuk prod multi-instance gunakan
 * store eksternal (Redis/Upstash) — ganti Map ini dengan adapter.
 */

export const IDEMPOTENCY_HEADER = "Idempotency-Key"
export const IDEMPOTENT_REPLAYED_HEADER = "Idempotent-Replayed"

const TTL_MS = 24 * 60 * 60 * 1000
const MAX_ENTRIES = 1_000

interface StoredResponse {
  fingerprint: string
  status: number
  headers: Record<string, string>
  bodyText: string
  expiresAt: number
}

const store = new Map<string, StoredResponse>()

function evictExpired(now: number): void {
  for (const [k, v] of store) {
    if (now >= v.expiresAt) store.delete(k)
  }
  // Batasi memori: buang yang paling lama jika masih penuh.
  if (store.size > MAX_ENTRIES) {
    const oldest = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
    for (const [k] of oldest.slice(0, store.size - MAX_ENTRIES)) store.delete(k)
  }
}

/** Scope agar key satu user tidak bisa dipakai user lain. */
export function idempotencyScope(userId?: string | null, ip?: string | null): string {
  return userId ? `user:${userId}` : `ip:${ip ?? "anon"}`
}

export function getIdempotencyKey(request: Request): string | null {
  const key = request.headers.get(IDEMPOTENCY_HEADER)?.trim()
  if (!key || key.length > 128) return null
  return key
}

/** Sidik request untuk mendeteksi pemakaian ulang key dengan payload beda. */
export async function fingerprintRequest(request: Request, scope: string): Promise<string> {
  const url = new URL(request.url)
  const bodyText = await request
    .clone()
    .text()
    .catch(() => "")
  return `${request.method}\n${url.pathname}\n${scope}\n${bodyText}`
}

function storeKey(scope: string, key: string): string {
  return `${scope}\n${key}`
}

/**
 * Cek replay. Kembalikan Response tersimpan jika key pernah dipakai dengan
 * fingerprint sama, 422 jika fingerprint berbeda, null jika key baru/tanpa key.
 */
export async function tryReplayIdempotent(
  request: Request,
  scope: string,
): Promise<Response | null> {
  const key = getIdempotencyKey(request)
  if (!key) return null

  const now = Date.now()
  evictExpired(now)

  const stored = store.get(storeKey(scope, key))
  if (!stored || now >= stored.expiresAt) {
    if (stored) store.delete(storeKey(scope, key))
    return null
  }

  const fingerprint = await fingerprintRequest(request, scope)
  if (fingerprint !== stored.fingerprint) {
    return Response.json(
      {
        success: false,
        message: "Idempotency-Key sudah dipakai dengan payload berbeda",
        data: null,
        code: "IDEMPOTENCY_KEY_REUSE",
      },
      { status: 422 },
    )
  }

  const headers = new Headers(stored.headers)
  headers.set(IDEMPOTENT_REPLAYED_HEADER, "true")
  const requestId = request.headers.get("x-request-id")
  if (requestId) headers.set("X-Request-ID", requestId)
  return new Response(stored.bodyText, { status: stored.status, headers })
}

/**
 * Simpan respons sukses (2xx) untuk replay berikutnya.
 * Kembalikan respons asli agar bisa langsung di-return dari route.
 */
export async function rememberIdempotent(
  request: Request,
  scope: string,
  response: Response,
): Promise<Response> {
  const key = getIdempotencyKey(request)
  if (!key) return response
  if (response.status < 200 || response.status >= 300) return response

  const now = Date.now()
  evictExpired(now)

  const fingerprint = await fingerprintRequest(request, scope)
  const clone = response.clone()
  const bodyText = await clone.text().catch(() => "")
  const headers: Record<string, string> = {}
  clone.headers.forEach((v, k) => {
    headers[k] = v
  })

  store.set(storeKey(scope, key), {
    fingerprint,
    status: response.status,
    headers,
    bodyText,
    expiresAt: now + TTL_MS,
  })
  return response
}

/** Hanya untuk test: reset store. */
export function __clearIdempotencyStore(): void {
  store.clear()
}
