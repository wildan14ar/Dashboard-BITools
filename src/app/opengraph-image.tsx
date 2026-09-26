import { ImageResponse } from "next/og"

export const runtime = "nodejs"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const revalidate = 86400

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "white",
        fontFamily: "Geist, sans-serif",
        padding: 80,
      }}
    >
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          textAlign: "center",
          marginBottom: 16,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        BI Tools
      </div>
      <div
        style={{
          fontSize: 28,
          color: "#94a3b8",
          textAlign: "center",
          maxWidth: 800,
        }}
      >
        Business Intelligence Dashboard
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}
