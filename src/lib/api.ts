import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import type { Session } from "next-auth"
import type { ZodType } from "zod"

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
}

export async function requireAuth(): Promise<Session | null> {
  const session = await auth()
  if (!session) return null
  return session
}

export async function requireAdmin(): Promise<Session | null> {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) return null
  return session
}

export async function parseBody<T>(req: Request, schema: ZodType<T>) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return { error: NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }) }
  return { data: parsed.data }
}

export function cleanError(err: unknown): string {
  if (err && typeof err === "object" && "details" in err) return String(err.details)
  if (err instanceof Error) return err.message
  return String(err)
}
