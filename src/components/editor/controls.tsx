"use client"

import { cn } from "@/lib/utils"

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] text-muted-foreground">{children}</label>
}

export function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <FieldLabel>{label}</FieldLabel>}
      {children}
    </div>
  )
}

export function OptionButton({ active, onClick, children, className }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 items-center justify-center rounded-md border text-[10px] transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
        className
      )}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({ value, onChange, options, columns }: {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string }[]
  columns?: number
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <OptionButton key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </OptionButton>
      ))}
    </div>
  )
}

export function ColorField({ value, onChange, onReset }: {
  value: string
  onChange: (v: string) => void
  onReset?: () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 cursor-pointer rounded border"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 flex-1 rounded-md border bg-background px-2 text-[10px] font-mono outline-none focus:border-ring"
        placeholder="#hex / color name"
      />
      {value && onReset && (
        <button type="button" onClick={onReset} className="text-[10px] text-muted-foreground underline">
          reset
        </button>
      )}
    </div>
  )
}

export function RangeField({ value, onChange, min, max, step, suffix }: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-primary"
      />
      <span className="w-8 text-right text-xs tabular-nums">{value}{suffix}</span>
    </div>
  )
}