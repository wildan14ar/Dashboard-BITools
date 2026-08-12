import { NextResponse } from "next/server"
import { testConnection } from "@/lib/engine"
import { CONFIG_SCHEMAS, sourceTypeSchema } from "@/validation/source"
import { requireAdmin, forbidden, cleanError, parseBody } from "@/lib/api"
import { z } from "zod"

const testSchema = z
  .object({
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

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return forbidden()

  const { data, error } = await parseBody(req, testSchema)
  if (error) return error

  try {
    const result = await testConnection({
      sourceId: "adhoc",
      dbType: data.type,
      configJson: JSON.stringify(data.config),
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ ok: false, error: cleanError(err) }, { status: 500 })
  }
}