import { Heading } from "@/components/charts/heading"
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
  const vAlignClass =
    {
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
      <Heading level={level}>{content}</Heading>
    </div>
  )
}
