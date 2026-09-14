import { z } from "zod"

export const datasetSchema = z.object({
  name: z.string().min(1, "Required"),
  sql: z.string().min(1, "Required"),
  description: z.string().optional(),
  sourceId: z.string().min(1, "Required"),
  isPublic: z.boolean().optional(),
})

export type DatasetInput = z.infer<typeof datasetSchema>
