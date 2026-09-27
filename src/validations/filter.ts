import { z } from "zod"

export const filterSchema = z.object({
  name: z.string().min(1, "Required"),
  label: z.string().min(1, "Required"),
  type: z.enum(["text", "select", "date_range", "number"]).default("text"),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.number().int().min(0).default(0),
})
