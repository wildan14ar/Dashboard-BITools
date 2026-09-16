"use client"

import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface IconPlatformProps {
  size?: "sm" | "md" | "lg"
  className?: string
  showName?: boolean
  brandName?: string
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
}

const nameSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
}

export function IconPlatform({
  size = "md",
  className = "",
  showName = false,
  brandName = "BI Dashboard",
}: IconPlatformProps) {
  const icon = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        sizeClasses[size],
        className,
      )}
    >
      <BarChart3 className="h-1/2 w-1/2" />
    </span>
  )

  if (showName) {
    return (
      <span className="flex items-center gap-2" suppressHydrationWarning>
        {icon}
        <span className={cn("font-bold text-gray-900 dark:text-white", nameSizeClasses[size])}>
          {brandName}
        </span>
      </span>
    )
  }

  return icon
}
