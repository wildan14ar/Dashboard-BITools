"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

type ButtonThemeProps = {
  variant?: "icon" | "text"
  className?: string
}

export default function ButtonTheme({ variant = "icon", className = "" }: ButtonThemeProps) {
  const { setTheme, resolvedTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === "light" ? "dark" : "light")

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${className}`}
      >
        <Sun size={18} className="dark:hidden" />
        <Moon size={18} className="hidden dark:block" />
        <span className="dark:hidden">Light Mode</span>
        <span className="hidden dark:block">Dark Mode</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-lg hover:bg-accent transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      <Sun size={20} className="dark:hidden" />
      <Moon size={20} className="hidden dark:block" />
    </button>
  )
}
