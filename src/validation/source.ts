import { z } from "zod"

export const sourceSchema = z.object({
  name: z.string().min(1, "Required"),
  type: z.enum(["postgresql", "mysql", "sqlite", "clickhouse", "bigquery", "mongodb"]),
  config: z.record(z.string(), z.unknown()).optional(),
})

export type SourceInput = z.infer<typeof sourceSchema>
