import type { ReactNode } from "react"

const SIZE_MAP: Record<string, string> = {
  p: "text-sm",
  h1: "text-3xl font-bold",
  h2: "text-2xl font-bold",
  h3: "text-xl font-semibold",
  h4: "text-lg font-semibold",
  h5: "text-base font-medium",
  h6: "text-sm font-medium",
}

export function headingClass(level: string): string {
  return SIZE_MAP[level] ?? SIZE_MAP.p
}

export function Heading({ level, children }: { level: string; children: ReactNode }) {
  const Tag = level === "p" ? "span" : (level as keyof React.JSX.IntrinsicElements)
  return <Tag className={`${headingClass(level)} whitespace-pre-wrap`}>{children}</Tag>
}