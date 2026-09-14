import { expect, test } from "bun:test"
import { loginSchema } from "@/validations/auth"
import { dashboardSchema, panelSchema } from "@/validations/dashboard"
import { datasetSchema } from "@/validations/dataset"
import { sourceSchema } from "@/validations/source"

test("dashboardSchema accepts valid dashboard", () => {
  const result = dashboardSchema.safeParse({ name: "Sales", tags: ["q1"], isPublic: true })
  expect(result.success).toBe(true)
})

test("dashboardSchema rejects empty name", () => {
  const result = dashboardSchema.safeParse({ name: "" })
  expect(result.success).toBe(false)
})

test("panelSchema applies grid defaults", () => {
  const result = panelSchema.safeParse({ title: "Revenue" })
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.chartType).toBe("table")
    expect(result.data.w).toBe(6)
    expect(result.data.h).toBe(4)
  }
})

test("datasetSchema requires sourceId", () => {
  const result = datasetSchema.safeParse({ name: "D1", sql: "SELECT 1" })
  expect(result.success).toBe(false)
})

test("sourceSchema validates config per type", () => {
  const valid = sourceSchema.safeParse({
    name: "Prod",
    type: "postgresql",
    config: { host: "db", port: "5432", user: "u", password: "p", database: "d" },
  })
  expect(valid.success).toBe(true)

  const invalid = sourceSchema.safeParse({
    name: "Prod",
    type: "postgresql",
    config: { host: "db" },
  })
  expect(invalid.success).toBe(false)
})

test("loginSchema accepts identifier login", () => {
  const result = loginSchema.safeParse({ identifier: "admin", password: "password123" })
  expect(result.success).toBe(true)
})
