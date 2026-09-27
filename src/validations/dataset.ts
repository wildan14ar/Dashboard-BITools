import { z } from "zod"

export const datasetSchema = z.object({
  name: z.string().min(1, "Required"),
  sql: z.string().min(1, "Required"),
  description: z.string().optional(),
  sourceId: z.string().min(1, "Required"),
  isPublic: z.boolean().optional(),
})

export type DatasetInput = z.infer<typeof datasetSchema>

export const batchRunItemSchema = z.object({
  datasetId: z.string().min(1, "Required"),
  params: z.record(z.string(), z.string()).optional(),
})

export const batchRunSchema = z.object({
  items: z.array(batchRunItemSchema).min(1).max(50),
  useCache: z.boolean().optional(),
})
