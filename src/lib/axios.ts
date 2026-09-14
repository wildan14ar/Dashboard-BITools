import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"
import { settings } from "@/config/settings"

const BASE_URL = "/api"

const REQUEST_TIMEOUT = 10000

const KEYS_TO_PRESERVE = ["theme", "theme-preference"]

// Toast notification function
let showToastCallback: ((type: "success" | "error", message: string) => void) | null = null

export function setToastCallback(callback: (type: "success" | "error", message: string) => void) {
  showToastCallback = callback
}

function clearAuthStorage(): void {
  if (typeof window === "undefined") return

  const allKeys = Object.keys(localStorage)
  allKeys.forEach((key) => {
    if (!KEYS_TO_PRESERVE.includes(key)) {
      localStorage.removeItem(key)
    }
  })
}

// Response interceptor unwraps response.data, so typed methods return T directly.
const client = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

type ApiClient = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
}

export const api = client as unknown as ApiClient

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (settings.NODE_ENV === "development") {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`)
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

client.interceptors.response.use(
  (response: AxiosResponse) => {
    const method = response.config.method?.toUpperCase() || "GET"
    const data = response.data as { success?: boolean; message?: string; error?: string }

    // Show success toast for non-GET requests
    if (method !== "GET" && data?.success && showToastCallback) {
      showToastCallback("success", data.message || "Operation successful")
    }

    return response.data
  },
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status
    const method = error.config?.method?.toUpperCase() || "GET"
    const message = error.response?.data?.message || error.message || "Something went wrong"

    if (typeof window !== "undefined") {
      if (status === 401) {
        clearAuthStorage()
        // Emit event for components to handle redirect
        // Proxy already handles redirect at edge level
        window.dispatchEvent(new CustomEvent("auth:unauthorized"))
        return Promise.reject(new Error("Session expired. Please login again."))
      }

      if (status === 403) {
        // Emit event for permission denied
        window.dispatchEvent(new CustomEvent("auth:forbidden"))
        return Promise.reject(new Error("You don't have permission to access this resource."))
      }

      // Show error toast for non-GET requests
      if (method !== "GET" && showToastCallback) {
        showToastCallback("error", message)
      }
    }

    return Promise.reject(new Error(message))
  },
)

export default api
