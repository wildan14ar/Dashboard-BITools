import type { Panel } from "@/hooks/use-dashboards"

type Props = {
  panel: Panel
}

export function TextChart({ panel }: Props) {
  const config = (panel.config ?? {}) as {
    content?: string
    level?: string
    color?: string
    align?: string
    valign?: string
  }
  const content = config.content ?? ""
  const level = config.level ?? "p"
  const Tag = level === "p" ? "p" : (level as keyof React.JSX.IntrinsicElements)
  const sizeMap: Record<string, string> = {
    h1: "text-3xl font-bold",
    h2: "text-2xl font-bold",
    h3: "text-xl font-semibold",
    h4: "text-lg font-semibold",
    h5: "text-base font-medium",
    h6: "text-sm font-medium",
  }
  const vAlignClass = {
    top: "justify-start",
    center: "justify-center",
    bottom: "justify-end",
  }[config.valign ?? "top"] ?? "justify-start"
  return (
    <div
      className={`flex h-full w-full flex-col scroll-hidden p-1 ${vAlignClass}`}
      style={{
        color: config.color || undefined,
        textAlign: (config.align as "left" | "center" | "right") || undefined,
      }}
    >
      <Tag className={`${level === "p" ? "text-sm" : sizeMap[level] ?? "text-sm"} whitespace-pre-wrap`}>{content}</Tag>
    </div>
  )
}
