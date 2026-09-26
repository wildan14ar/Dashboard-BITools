// Batas ukuran gambar (dipakai validasi client sebelum upload ke /api/attachments)
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2 MB

export function toDataUrlSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.ceil(size / 1024)} KB`
}

export function exceedsSize(file: File, maxBytes: number): boolean {
  return file.size > maxBytes
}
