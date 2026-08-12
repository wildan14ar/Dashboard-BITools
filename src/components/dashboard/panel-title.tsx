type TitleConfig = {
  titlePosition?: string
  titleAlign?: string
  titleBold?: boolean
  titleItalic?: boolean
  titleStrikethrough?: boolean
  titleColor?: string
  titleSize?: number
}

export function renderPanelTitle(title: string, config: TitleConfig): React.ReactNode {
  const titlePosition = config.titlePosition || "top"
  if (titlePosition === "none" || !title) return null

  const titleAlign = config.titleAlign || "left"
  const titleBold = config.titleBold || false
  const titleItalic = config.titleItalic || false
  const titleStrikethrough = config.titleStrikethrough || false
  const titleColor = config.titleColor || ""
  const titleSize = config.titleSize || 12

  const style: React.CSSProperties = {
    textAlign: titleAlign as "left" | "center" | "right",
    fontWeight: titleBold ? "bold" : "normal",
    fontStyle: titleItalic ? "italic" : "normal",
    textDecoration: titleStrikethrough ? "line-through" : "none",
    color: titleColor || undefined,
    fontSize: titleSize,
  }

  return (
    <div className="px-2 py-1">
      <span style={style}>{title}</span>
    </div>
  )
}
