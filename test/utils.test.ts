import { expect, test } from "bun:test"
import { buildSearchParams, formatDate, formatRelative } from "@/lib/utils"

test("formatDate formats Indonesian locale", () => {
  const result = formatDate("2024-01-15")
  expect(result).toMatch(/\d{2} \w{3} \d{4}/)
})

test("formatRelative returns 'Baru saja' for recent date", () => {
  const result = formatRelative(new Date())
  expect(result).toBe("Baru saja")
})

test("formatRelative returns minutes for 5 min ago", () => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  const result = formatRelative(fiveMinAgo)
  expect(result).toBe("5 menit yang lalu")
})

test("buildSearchParams updates params", () => {
  const current = new URLSearchParams("page=1&sort=asc")
  const result = buildSearchParams(current, { page: "2", filter: "active" })
  expect(result).toBe("page=2&sort=asc&filter=active")
})

test("buildSearchParams removes empty params", () => {
  const current = new URLSearchParams("page=1&sort=asc")
  const result = buildSearchParams(current, { page: "", sort: "desc" })
  expect(result).toBe("sort=desc")
})
