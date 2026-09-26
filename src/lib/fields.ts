/**
 * Field selection `?fields=name,email` (Postman: keep responses focused).
 * Proyeksi dilakukan di JS setelah fetch agar aman untuk relasi nested
 * dan tidak mengubah typing Prisma select.
 */

export interface ParsedFields {
  /** null = semua field; array = proyeksi ke subset ini. */
  fields: string[] | null
  unknown: string[]
}

export function parseFields(raw: unknown, allowed: readonly string[]): ParsedFields {
  if (typeof raw !== "string" || !raw.trim()) return { fields: null, unknown: [] }
  const wanted = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const allowedSet = new Set(allowed)
  return {
    fields: wanted.filter((f) => allowedSet.has(f)),
    unknown: wanted.filter((f) => !allowedSet.has(f)),
  }
}

/** Proyeksi dangkal objek ke subset field. */
export function applyFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[] | null,
): Partial<T> | T {
  if (fields === null) return obj
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (f in obj) out[f] = obj[f]
  }
  return out as Partial<T>
}

export function applyFieldsMany<T extends Record<string, unknown>>(
  items: T[],
  fields: string[] | null,
): Array<Partial<T> | T> {
  if (fields === null) return items
  return items.map((item) => applyFields(item, fields))
}
