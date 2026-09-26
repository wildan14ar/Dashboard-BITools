import { describe, expect, test } from "bun:test"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { parsePagination } from "@/lib/pagination"
import { getRequestId } from "@/lib/request-id"
import { checkRateLimit } from "@/middlewares/rate-limit"
import { RequestHandler } from "@/middlewares/request-handler"
import { buildPaginationMeta, ResponseHandler } from "@/middlewares/response-handler"

function postJson(path: string, body: unknown): NextRequest {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

describe("ResponseHandler envelope", () => {
  test("sukses: status, code, dan requestId digemakan", async () => {
    const res = ResponseHandler.success("OK", { id: "1" }, { requestId: "req-1" })
    expect(res.status).toBe(200)
    expect(res.headers.get("X-Request-ID")).toBe("req-1")
    const body = await res.json()
    expect(body).toMatchObject({
      success: true,
      message: "OK",
      data: { id: "1" },
      code: "OK",
      requestId: "req-1",
    })
  })

  test("created: 201 + CREATED + teruskan Location", async () => {
    const res = ResponseHandler.created(
      "Dibuat",
      { id: "1" },
      {
        headers: { Location: "/api/users/1" },
      },
    )
    expect(res.status).toBe(201)
    expect(res.headers.get("Location")).toBe("/api/users/1")
    const body = await res.json()
    expect(body).toMatchObject({ success: true, code: "CREATED" })
  })

  test("paginated: items + pagination + meta benar", async () => {
    const meta = buildPaginationMeta(2, 20, 45)
    expect(meta).toEqual({ page: 2, limit: 20, total: 45, total_pages: 3, has_more: true })
    expect(buildPaginationMeta(1, 20, 0)).toMatchObject({ total_pages: 1, has_more: false })
    const res = ResponseHandler.paginated("OK", [1, 2], meta)
    const body = await res.json()
    expect(body.data).toMatchObject({ items: [1, 2], pagination: meta })
  })

  test("error memakai code stabil + status tepat", async () => {
    const cases = [
      { res: ResponseHandler.badRequest(), status: 400, code: "BAD_REQUEST" },
      { res: ResponseHandler.unauthorized(), status: 401, code: "UNAUTHORIZED" },
      { res: ResponseHandler.forbidden(), status: 403, code: "FORBIDDEN" },
      { res: ResponseHandler.notFound(), status: 404, code: "NOT_FOUND" },
      { res: ResponseHandler.conflict(), status: 409, code: "CONFLICT" },
      { res: ResponseHandler.unprocessable(), status: 422, code: "UNPROCESSABLE" },
      {
        res: ResponseHandler.tooManyRequests("Pelan-pelan", { headers: { "Retry-After": "7" } }),
        status: 429,
        code: "TOO_MANY_REQUESTS",
      },
      { res: ResponseHandler.internalError(), status: 500, code: "INTERNAL_ERROR" },
    ]
    for (const { res, status, code } of cases) {
      expect(res.status).toBe(status)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.code).toBe(code)
    }
    const limited = ResponseHandler.tooManyRequests("x", { headers: { "Retry-After": "7" } })
    expect(limited.headers.get("Retry-After")).toBe("7")
  })
})

describe("RequestHandler validasi", () => {
  const schema = z.object({
    params: z.object({}),
    query: z.object({}),
    body: z.object({
      email: z.string().email("Email tidak valid"),
      password: z.string().min(6, "Password minimal 6 karakter"),
    }),
  })

  test("semua error validasi dikembalikan sekaligus", async () => {
    const out = await RequestHandler.validateRequest(
      schema,
      postJson("/api/users", { email: "bukan-email", password: "1" }),
    )
    expect(out).toBeInstanceOf(Response)
    const res = out as Response
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe("VALIDATION_ERROR")
    expect(body.data.details).toHaveLength(2)
    const fields = body.data.details.map((d: { field: string }) => d.field)
    expect(fields).toContain("body.email")
    expect(fields).toContain("body.password")
  })

  test("input valid lolos dengan data terparse", async () => {
    const out = await RequestHandler.validateRequest(
      schema,
      postJson("/api/users", { email: "a@b.id", password: "rahasia1" }),
    )
    expect(out).toMatchObject({ body: { email: "a@b.id" } })
  })
})

describe("parsePagination", () => {
  test("page/limit normal + skip", () => {
    expect(parsePagination({ page: "3", limit: "20" })).toEqual({ page: 3, limit: 20, skip: 40 })
  })

  test("clamp batas dan alias per_page", () => {
    expect(parsePagination({ page: "0", per_page: "10000" })).toEqual({
      page: 1,
      limit: 100,
      skip: 0,
    })
  })
})

describe("checkRateLimit", () => {
  test("diizinkan sampai limit lalu diblokir + retryAfter", () => {
    const key = `test-${Date.now()}`
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true)
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true)
    const blocked = checkRateLimit(key, 2, 60_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThanOrEqual(1)
    expect(blocked.reset).toBeGreaterThan(0)
  })

  test("key berbeda punya budget sendiri", () => {
    const now = Date.now()
    expect(checkRateLimit(`a-${now}`, 1, 60_000).allowed).toBe(true)
    expect(checkRateLimit(`b-${now}`, 1, 60_000).allowed).toBe(true)
    expect(checkRateLimit(`a-${now}`, 1, 60_000).allowed).toBe(false)
  })
})

describe("getRequestId", () => {
  test("ambil dari header atau undefined", () => {
    const withId = new Request("http://localhost/api/x", {
      headers: { "x-request-id": "abc" },
    })
    expect(getRequestId(withId)).toBe("abc")
    expect(getRequestId(new Request("http://localhost/api/x"))).toBeUndefined()
    expect(getRequestId(undefined)).toBeUndefined()
  })
})
