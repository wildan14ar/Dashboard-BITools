import type * as React from "react"

import { cn } from "@/lib/utils"

type LabelProps = {
  htmlFor: string
  className?: string
  children: React.ReactNode
}

function Label({ className, htmlFor, children }: LabelProps) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn("text-sm font-medium select-none", className)}
    >
      {children}
    </label>
  )
}

function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="field-error" className={cn("text-xs text-destructive", className)} {...props} />
  )
}

export { FieldError, Label }
