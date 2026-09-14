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

test("sourceSchema accepts all supported db types", () => {
  const sqlConfig = { host: "db", port: "3306", user: "u", password: "p", database: "d" }
  for (const type of ["mysql", "mariadb", "mssql", "sqlite", "clickhouse"]) {
    const result = sourceSchema.safeParse({ name: "S", type, config: sqlConfig })
    expect(result.success).toBe(true)
  }
  const bq = sourceSchema.safeParse({
    name: "BQ",
    type: "bigquery",
    config: { project: "p", dataset: "d", credentials_path: "/k.json" },
  })
  expect(bq.success).toBe(true)
})

test("loginSchema accepts identifier login", () => {
  const result = loginSchema.safeParse({ identifier: "admin", password: "password123" })
  expect(result.success).toBe(true)
})
