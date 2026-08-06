import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { testConnection } from "@/lib/engine"
import { sourceConfigSchema } from "@/validation/source"
import { z } from "zod"

function cleanError(err: unknown): string {
  if (err && typeof err === "object" && "details" in err) return String(err.details)
  if (err instanceof Error) return err.message
  return String(err)
}

const testSchema = z.object({
  type: z.enum(["postgresql", "mysql", "sqlite", "clickhouse", "bigquery", "mongodb"]),
  config: sourceConfigSchema,
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