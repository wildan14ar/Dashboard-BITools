import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  align?: "left" | "center" | "between"
  action?: ReactNode
  /** Alias lama BI — tetap didukung agar pemanggil eksisting tidak rusak. */
  actions?: ReactNode
  className?: string
  /** Heading level — BI memakai h1 untuk judul halaman utama. */
  level?: 1 | 2
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "between",
  action,
  actions,
  className,
  level = 1,
}: SectionHeaderProps) {
  const Heading = level === 1 ? "h1" : "h2"
  const trailing = action ?? actions

  if (align === "between") {
    return (
      <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
        <div>
          {eyebrow && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <Heading className="text-2xl font-bold tracking-tight">{title}</Heading>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
      </div>
    )
  }

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
      {trailing}
    </div>
  )
}

export default SectionHeader
