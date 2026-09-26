import { z } from "zod"

export const dashboardSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  tags: z.string().array().optional(),
  isPublic: z.boolean().optional(),
})

export const panelSchema = z.object({
  title: z.string().min(1, "Required"),
  chartType: z.string().default("table"),
  dataSetId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  x: z.number().int().min(0).default(0),
  y: z.number().int().min(0).default(0),
  w: z.number().int().min(1).max(12).default(6),
  h: z.number().int().min(1).max(24).default(4),
})

export const panelReorderSchema = z.array(
  z.object({
    id: z.string(),
    x: z.number().int(),
    y: z.number().int(),
    w: z.number().int(),
    h: z.number().int(),
  }),
)

export type DashboardInput = z.infer<typeof dashboardSchema>
export type PanelInput = z.infer<typeof panelSchema>
