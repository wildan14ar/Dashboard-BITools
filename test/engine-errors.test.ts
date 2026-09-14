import { expect, test } from "bun:test"
import { mapEngineError } from "@/lib/engine"

test("sanitizer block maps to 403 without driver details", () => {
  const res = mapEngineError({ code: 7, details: "Query blocked by sanitizer" })
  expect(res.status).toBe(403)
  expect(res.message).not.toContain("blocked by sanitizer")
})

test("missing params maps to 400 with safe message", () => {
  const res = mapEngineError({ code: 3, details: "Missing query parameters: city" })
  expect(res.status).toBe(400)
  expect(res.message).toContain("city")
})

test("driver errors map to generic 500", () => {
  const res = mapEngineError({
    code: 13,
    details: "connection failed: postgresql://admin:secret@db:5432/prod",
  })
  expect(res.status).toBe(500)
  expect(res.message).not.toContain("secret")
  expect(res.message).not.toContain("postgresql://")
})

test("unknown errors map to generic 500", () => {
  expect(mapEngineError(new Error("boom")).status).toBe(500)
})
