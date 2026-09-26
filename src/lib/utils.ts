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

// Build search params
export const buildSearchParams = (
  current: URLSearchParams,
  updates: Record<string, string | number | undefined>,
): string => {
  const params = new URLSearchParams(current.toString())
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value))
    else params.delete(key)
  })
  return params.toString()
}

// Check if currentPath matches validPaths patterns:
// exact "/about", shallow wildcard "/courses/*", deep wildcard "/admin/**"
export const isValidPath = (currentPath: string, validPaths: string[]): boolean => {
  const currentSegments = currentPath.split("/").filter(Boolean)

  return validPaths.some((validPath) => {
    if (validPath.endsWith("/**")) {
      const baseSegments = validPath.slice(0, -3).split("/").filter(Boolean)
      return baseSegments.every((seg, i) => currentSegments[i] === seg)
    }

    if (validPath.endsWith("/*")) {
      const baseSegments = validPath.slice(0, -2).split("/").filter(Boolean)
      if (currentSegments.length > baseSegments.length + 1) return false
      return baseSegments.every((seg, i) => currentSegments[i] === seg)
    }

    const targetSegments = validPath.split("/").filter(Boolean)
    if (currentSegments.length !== targetSegments.length) return false
    return targetSegments.every((seg, i) => currentSegments[i] === seg)
  })
}
