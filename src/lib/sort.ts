export type SortOrder = "asc" | "desc"

export interface ParsedSort {
  sort: string
  order: SortOrder
}

/**
 * Parse ?sort=&?order= dengan fallback ke default ala Postman.
 * - sort di luar allowlist → defaultSort (tidak pernah 400).
 * - order selain asc/desc (case-insensitive) → defaultOrder.
 * Hasil dipakai langsung: `orderBy: { [sort]: order }`.
 */
export function parseSort(
  input: { sort?: unknown; order?: unknown },
  opts: { allowed: readonly string[]; defaultSort?: string; defaultOrder?: SortOrder },
): ParsedSort {
  const allowed = opts.allowed
  const fallbackSort = opts.defaultSort ?? allowed[0] ?? "createdAt"
  const rawSort = typeof input.sort === "string" ? input.sort : ""
  const sort = allowed.includes(rawSort) ? rawSort : fallbackSort

  const rawOrder = typeof input.order === "string" ? input.order.toLowerCase() : ""
  const order: SortOrder =
    rawOrder === "asc" || rawOrder === "desc" ? rawOrder : (opts.defaultOrder ?? "desc")

  return { sort, order }
}
