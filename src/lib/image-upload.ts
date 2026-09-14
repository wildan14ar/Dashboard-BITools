// Batas ukuran gambar yang disimpan sebagai base64 di DB
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2 MB
export const MAX_ICON_SIZE = 1024 * 1024 // 1 MB

export function toDataUrlSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.ceil(size / 1024)} KB`
}

export function exceedsSize(file: File, maxBytes: number): boolean {
  return file.size > maxBytes
}

// Estimasi ukuran asli dari data URL base64 (untuk validasi server)
export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",")
  if (comma === -1) return dataUrl.length
  const base64 = dataUrl.slice(comma + 1)
  const padding = (base64.match(/=+$/) || [""])[0].length
  return Math.floor((base64.length * 3) / 4) - padding
}

// Convert an image File to a base64 data URL (server-side)
export async function fileToDataUrl(file: File, fallbackMime: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  return `data:${file.type || fallbackMime};base64,${Buffer.from(bytes).toString("base64")}`
}
