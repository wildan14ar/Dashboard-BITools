import { toast } from "sonner"

// Semua endpoint di bawah /api tanpa versioning.
const API_PREFIX = "/api"

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
  code?: string
  requestId?: string
}

type Params = Record<string, string | number | boolean | undefined>

const KEYS_TO_PRESERVE = ["theme", "theme-preference"]

function clearAuthStorage(): void {
  if (typeof window === "undefined") return
  for (const key of Object.keys(localStorage)) {
    if (!KEYS_TO_PRESERVE.includes(key)) localStorage.removeItem(key)
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Params,
  opts?: { idempotencyKey?: string },
): Promise<ApiEnvelope<T>> {
  const url = new URL(`${API_PREFIX}${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const isFormData = body instanceof FormData
  const headers: Record<string, string> = {}
  if (!isFormData && body !== undefined) headers["Content-Type"] = "application/json"
  if (opts?.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      credentials: "same-origin",
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new Error("Network error. Please check your connection.")
  }

  const data = (await res.json().catch(() => null)) as
    | (ApiEnvelope<T> & { message?: string })
    | null
  const message = data?.message || "Something went wrong"

  if (!res.ok) {
    if (typeof window !== "undefined") {
      if (res.status === 401) {
        clearAuthStorage()
        // Emit event for components to handle redirect
        // Proxy already handles redirect at edge level
        window.dispatchEvent(new CustomEvent("auth:unauthorized"))
        throw new Error("Session expired. Please login again.")
      }

      if (res.status === 403) {
        // Emit event for permission denied
        window.dispatchEvent(new CustomEvent("auth:forbidden"))
        throw new Error("You don't have permission to access this resource.")
      }

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After")
        throw new Error(
          `Terlalu banyak permintaan${retryAfter ? `, coba lagi dalam ${retryAfter} detik` : ""}.`,
        )
      }

      // Show error toast for non-GET requests
      if (method !== "GET") {
        toast.error(message)
      }
    }

    throw new Error(message)
  }

  // Show success toast for non-GET requests
  if (method !== "GET" && data) {
    toast.success(data.message || "Operation successful")
  }

  return (data ?? { success: true, message: "", data: null }) as ApiEnvelope<T>
}

const api = {
  get: <T = unknown>(path: string, config?: { params?: Params }) =>
    request<T>("GET", path, undefined, config?.params),
  post: <T = unknown>(path: string, body?: unknown, opts?: { idempotencyKey?: string }) =>
    request<T>("POST", path, body, undefined, opts),
  put: <T = unknown>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = unknown>(path: string, config?: { params?: Params }) =>
    request<T>("DELETE", path, undefined, config?.params),
}

export default api
