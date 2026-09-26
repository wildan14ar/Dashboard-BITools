import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logActivity } from "@/lib/activity"
import { engineErrorResponse, testConnection } from "@/lib/engine"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"
import { CONFIG_SCHEMAS, sourceTypeSchema } from "@/validations"

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

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth({ permissions: ["sources:create"] })
  if (error) return error

  try {
    const validated = await RequestHandler.validateRequest(z.object({ body: testSchema }), req)
    if (validated instanceof NextResponse) return validated
    const data = validated.body

    try {
      const result = await testConnection({
        sourceId: "adhoc",
        dbType: data.type,
        configJson: JSON.stringify(data.config),
      })
      return ResponseHandler.success("Connection test successful", result)
    } catch (err) {
      await logActivity(session?.user?.id || "system", "ERROR", "BiSource", undefined, {
        error: String(err),
      })
      return engineErrorResponse(err)
    }
  } catch (err) {
    await logActivity(session?.user?.id || "system", "ERROR", "BiSource", undefined, {
      error: String(err),
    })
    return ResponseHandler.internalError("Gagal mengetes koneksi", err)
  }
}
