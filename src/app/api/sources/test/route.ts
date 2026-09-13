import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { testConnection } from "@/lib/engine"
import { CONFIG_SCHEMAS, sourceTypeSchema } from "@/validation/source"
import { cleanError } from "@/lib/engine"
import { RequestHandler } from "@/middlewares/request-handler"
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
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const validated = await RequestHandler.validateRequest(z.object({ body: testSchema }), req)
  if (validated instanceof NextResponse) return validated
  const data = validated.body

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
