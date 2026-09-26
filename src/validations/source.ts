import { z } from "zod"

export const sqlConfigSchema = z.object({
  host: z.string().min(1, "Required"),
  port: z.string().min(1, "Required"),
  user: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
  database: z.string().min(1, "Required"),
})

export const bigqueryConfigSchema = z.object({
  project: z.string().min(1, "Required"),
  dataset: z.string().min(1, "Required"),
  credentials_path: z.string().min(1, "Required"),
})

export const mongodbConfigSchema = z.object({
  connection_string: z.string().min(1, "Required"),
  database: z.string().min(1, "Required"),
})

export const apiConfigSchema = z.object({
  base_url: z.string().min(1, "Required"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  path: z.string().min(1, "Required"),
  headers: z.record(z.string(), z.string()).optional().default({}),
  body: z.string().optional(),
})

export const fileConfigSchema = z
  .object({
    kind: z.enum(["upload", "url", "sheets"]),
    // upload: path relatif DATA_DIR dari POST /api/sources/upload, mis. uploads/<id>.xlsx
    path: z.string().optional(),
    // url: alamat file publik + format opsional (otomatis bila kosong)
    file_url: z.string().url("URL tidak valid").optional().or(z.literal("")),
    format: z.enum(["csv", "xlsx"]).optional(),
    // sheets: ID atau share-link spreadsheet + selektor sheet
    spreadsheet_id: z.string().optional(),
    sheet: z.string().optional(),
    gid: z.string().optional(),
    auth: z.enum(["none", "api_key", "service_account"]).optional(),
    api_key: z.string().optional(),
    service_account_json: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "upload" && !val.path) {
      ctx.addIssue({ code: "custom", message: "Required", path: ["path"] })
    }
    if (val.kind === "url" && !val.file_url) {
      ctx.addIssue({ code: "custom", message: "Required", path: ["file_url"] })
    }
    if (val.kind === "sheets") {
      if (!val.spreadsheet_id) {
        ctx.addIssue({ code: "custom", message: "Required", path: ["spreadsheet_id"] })
      }
      if (val.auth === "api_key" && !val.api_key) {
        ctx.addIssue({ code: "custom", message: "Required", path: ["api_key"] })
      }
      if (val.auth === "service_account" && !val.service_account_json) {
        ctx.addIssue({ code: "custom", message: "Required", path: ["service_account_json"] })
      }
    }
  })

export const CONFIG_SCHEMAS = {
  postgresql: sqlConfigSchema,
  mysql: sqlConfigSchema,
  mariadb: sqlConfigSchema,
  mssql: sqlConfigSchema,
  sqlite: sqlConfigSchema,
  clickhouse: sqlConfigSchema,
  bigquery: bigqueryConfigSchema,
  mongodb: mongodbConfigSchema,
  api: apiConfigSchema,
  file: fileConfigSchema,
} as const

export const sourceTypeSchema = z.enum([
  "postgresql",
  "mysql",
  "mariadb",
  "mssql",
  "sqlite",
  "clickhouse",
  "bigquery",
  "mongodb",
  "api",
  "file",
])

export const sourceSchema = z
  .object({
    name: z.string().min(1, "Required"),
    type: sourceTypeSchema,
    config: z.record(z.string(), z.unknown()),
  })
  .superRefine((val, ctx) => {
    const result = CONFIG_SCHEMAS[val.type].safeParse(val.config)
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["config", ...issue.path] })
      }
    }
  })

export type SourceType = z.infer<typeof sourceTypeSchema>
export type SourceInput = z.infer<typeof sourceSchema>
export type SourceConfig = Record<string, unknown>
