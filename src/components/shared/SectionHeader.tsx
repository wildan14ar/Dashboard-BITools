import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  align?: "left" | "center"
  action?: ReactNode
  className?: string
  /** Heading level — use 1 for the main page title (SEO/a11y) */
  level?: 1 | 2
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
  level = 2,
}: SectionHeaderProps) {
  const Heading = level === 1 ? "h1" : "h2"
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <Heading className="text-2xl font-bold tracking-tight md:text-3xl">{title}</Heading>
      {description && (
        <p className={cn("text-muted-foreground", align === "center" && "max-w-2xl")}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
