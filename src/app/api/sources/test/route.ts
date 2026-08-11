import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { testConnection } from "@/lib/engine"
import { CONFIG_SCHEMAS, sourceTypeSchema } from "@/validation/source"
import { z } from "zod"

function cleanError(err: unknown): string {
  if (err && typeof err === "object" && "details" in err) return String(err.details)
  if (err instanceof Error) return err.message
  return String(err)
}

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
  if (!session?.user?.isSuperAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const body = await req.json()
  const parsed = testSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const result = await testConnection({
      sourceId: "adhoc",
      dbType: parsed.data.type,
      configJson: JSON.stringify(parsed.data.config),
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ ok: false, error: cleanError(err) }, { status: 500 })
  }
}