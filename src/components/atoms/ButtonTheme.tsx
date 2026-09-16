"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

type ButtonThemeProps = {
  variant?: "icon" | "text"
  className?: string
}

export function ButtonTheme({ variant = "icon", className = "" }: ButtonThemeProps) {
  const { setTheme, resolvedTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === "light" ? "dark" : "light")

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${className}`}
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
      className={`rounded-lg p-2 transition-colors hover:bg-accent ${className}`}
      aria-label="Toggle theme"
    >
      <Sun size={20} className="dark:hidden" />
      <Moon size={20} className="hidden dark:block" />
    </button>
  )
}
