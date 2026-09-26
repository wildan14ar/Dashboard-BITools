"use client"

import * as React from "react"

// Pengganti next-themes yang ringan.
//
// Kenapa tidak pakai next-themes: ia me-render <script> inline di dalam
// client component, yang di React 19 memicu console error
// "Encountered a script tag while rendering React component" setiap script
// di-mount dari sisi klien (mis. navigasi antar locale me-remount Providers).
// Anti-FOUC tetap ditangani script <head> di src/app/layout.tsx (server),
// provider ini hanya sinkronisasi state + class setelah mount.

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: ResolvedTheme | undefined
  systemTheme: ResolvedTheme | undefined
  themes: Theme[]
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: undefined,
  systemTheme: undefined,
  themes: ["light", "dark", "system"],
})

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function readStoredTheme(storageKey: string): Theme | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(storageKey)
    return value === "light" || value === "dark" || value === "system" ? value : null
  } catch {
    return null
  }
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  /** Matikan transisi CSS sesaat saat ganti tema (DOM API, bukan <script>). */
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(
    () => readStoredTheme(storageKey) ?? defaultTheme,
  )
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme | undefined>(() =>
    typeof window === "undefined" ? undefined : getSystemTheme(),
  )

  const resolvedTheme: ResolvedTheme | undefined = theme === "system" ? systemTheme : theme

  // Ikuti perubahan preferensi OS saat memakai "system".
  React.useEffect(() => {
    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  // Terapkan class ke <html> setiap resolved berubah (mount awal selaras
  // dengan script anti-FOUC di <head>, jadi tanpa kedip).
  React.useEffect(() => {
    if (resolvedTheme) applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = React.useCallback(
    (next: Theme) => {
      let cleanup: (() => void) | undefined
      if (disableTransitionOnChange) {
        const style = document.createElement("style")
        style.textContent =
          "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
        document.head.appendChild(style)
        cleanup = () => {
          // Paksa reflow agar class baru kepasang tanpa transisi, lalu lepas.
          window.getComputedStyle(document.body)
          setTimeout(() => document.head.removeChild(style), 1)
        }
      }
      try {
        window.localStorage.setItem(storageKey, next)
      } catch {
        // abaikan (mode privat dsb.)
      }
      setThemeState(next)
      cleanup?.()
    },
    [storageKey, disableTransitionOnChange],
  )

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: ["light", "dark", "system"] as Theme[],
    }),
    [theme, setTheme, resolvedTheme, systemTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return React.useContext(ThemeContext)
}
