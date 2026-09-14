import { toast } from "sonner"

type ApiEnvelope<T> = { success: boolean; message: string; data: T }

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
): Promise<ApiEnvelope<T>> {
  const url = new URL(`/api${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const isFormData = body instanceof FormData
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers:
        isFormData || body === undefined ? undefined : { "Content-Type": "application/json" },
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
        window.dispatchEvent(new CustomEvent("auth:unauthorized"))
        throw new Error("Session expired. Please login again.")
      }

      if (res.status === 403) {
        window.dispatchEvent(new CustomEvent("auth:forbidden"))
        throw new Error("You don't have permission to access this resource.")
      }

      if (method !== "GET") {
        toast.error(message)
      }
    }

    throw new Error(message)
  }

  if (method !== "GET" && data) {
    toast.success(data.message || "Operation successful")
  }

  return (data ?? { success: true, message: "", data: null }) as ApiEnvelope<T>
}

export const api = {
  get: <T = unknown>(path: string, config?: { params?: Params }) =>
    request<T>("GET", path, undefined, config?.params),
  post: <T = unknown>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = unknown>(path: string) => request<T>("DELETE", path),
}

export default api
