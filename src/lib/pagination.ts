import { buildPaginationMeta, type PaginationMeta } from "@/middlewares/response-handler"

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 10
export const MAX_LIMIT = 100

export interface ParsedPagination {
  page: number
  limit: number
  skip: number
}

/** Parse ?page=&?limit= dengan clamping ala Postman (page/limit pagination). */
export function parsePagination(
  input: { page?: unknown; limit?: unknown; per_page?: unknown },
  defaults: { page?: number; limit?: number } = {},
): ParsedPagination {
  const rawLimit = input.limit ?? input.per_page ?? defaults.limit ?? DEFAULT_LIMIT
  const page = Math.max(Number(input.page) || defaults.page || DEFAULT_PAGE, 1)
  const limit = Math.min(Math.max(Number(rawLimit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  return { page, limit, skip: (page - 1) * limit }
}

export function paginateMeta(page: number, limit: number, total: number): PaginationMeta {
  return buildPaginationMeta(page, limit, total)
}
