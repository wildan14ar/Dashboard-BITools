"use client"

import { useRef, useEffect, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type DialogProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) el.showModal()
    else el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cn(
        "rounded-xl border bg-background p-0 shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95",
        className
      )}
    >
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  )
}
