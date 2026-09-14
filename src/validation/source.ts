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

export const CONFIG_SCHEMAS = {
  postgresql: sqlConfigSchema,
  mysql: sqlConfigSchema,
  sqlite: sqlConfigSchema,
  clickhouse: sqlConfigSchema,
  bigquery: bigqueryConfigSchema,
  mongodb: mongodbConfigSchema,
  api: apiConfigSchema,
} as const

export const sourceTypeSchema = z.enum([
  "postgresql",
  "mysql",
  "sqlite",
  "clickhouse",
  "bigquery",
  "mongodb",
  "api",
])

// ponytail: config validated against the schema for its type (superRefine),
// not a discriminated union — the form registers flat paths like
// config.host regardless of type, so a per-type object is simpler.
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
