import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format tanggal
export const formatDate = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// Format relative time
export const formatRelative = (date: string | Date): string => {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 7) return formatDate(date)
  if (diffDays > 0) return `${diffDays} hari yang lalu`
  if (diffHours > 0) return `${diffHours} jam yang lalu`
  if (diffMins > 0) return `${diffMins} menit yang lalu`
  return "Baru saja"
}
