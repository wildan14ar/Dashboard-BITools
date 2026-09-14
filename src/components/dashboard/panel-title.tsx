export type TitleConfig = {
  titlePosition?: string
  titleAlign?: string
  titleBold?: boolean
  titleItalic?: boolean
  titleStrikethrough?: boolean
  titleColor?: string
  titleSize?: number
  padding?: number
}

export function buildTitleStyle(config: TitleConfig): React.CSSProperties {
  const titleAlign = config.titleAlign || "left"
  return {
    textAlign: titleAlign as "left" | "center" | "right",
    fontWeight: config.titleBold ? "bold" : "normal",
    fontStyle: config.titleItalic ? "italic" : "normal",
    textDecoration: config.titleStrikethrough ? "line-through" : "none",
    color: config.titleColor || undefined,
    fontSize: config.titleSize || 12,
  }
}

export function renderPanelTitle(title: string, config: TitleConfig): React.ReactNode {
  const titlePosition = config.titlePosition || "top"
  if (titlePosition === "none" || !title) return null

  return (
    <div className="px-2 py-1" style={buildTitleStyle(config)}>
      {title}
    </div>
  )
}
