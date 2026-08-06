import { z } from "zod"

export const sourceConfigSchema = z.object({
  host: z.string().min(1, "Required"),
  port: z.string().min(1, "Required"),
  user: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
  database: z.string().min(1, "Required"),
})

export const sourceSchema = z.object({
  name: z.string().min(1, "Required"),
  type: z.enum(["postgresql", "mysql", "sqlite", "clickhouse", "bigquery", "mongodb"]),
  config: sourceConfigSchema,
})

export type SourceConfig = z.infer<typeof sourceConfigSchema>
export type SourceInput = z.infer<typeof sourceSchema>