import { beforeEach, expect, test } from "bun:test"
import { ulid } from "ulid"
import {
  __clearIdempotencyStore,
  getIdempotencyKey,
  idempotencyScope,
  rememberIdempotent,
  tryReplayIdempotent,
} from "@/lib/idempotency"

function postRequest(key: string | null, body: unknown, path = "/api/users"): Request {
  const headers = new Headers({ "content-type": "application/json" })
  if (key) headers.set("Idempotency-Key", key)
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  __clearIdempotencyStore()
})

test("tanpa key → tidak ada replay & tidak disimpan", async () => {
  const req = postRequest(null, { a: 1 })
  expect(getIdempotencyKey(req)).toBeNull()
  expect(await tryReplayIdempotent(req, "user:x")).toBeNull()
  const res = await rememberIdempotent(req, "user:x", Response.json({ ok: true }))
  expect(res.status).toBe(200)
})

test("key sama + body sama → replay identik dengan header penanda", async () => {
  const key = ulid()
  const first = postRequest(key, { email: "a@b.c" })
  expect(await tryReplayIdempotent(first, "user:1")).toBeNull()

  const created = Response.json({ success: true, id: "01ARZ3" }, { status: 201 })
  await rememberIdempotent(first, "user:1", created)

  const retry = postRequest(key, { email: "a@b.c" })
  const replay = await tryReplayIdempotent(retry, "user:1")
  expect(replay).not.toBeNull()
  expect(replay?.status).toBe(201)
  expect(replay?.headers.get("Idempotent-Replayed")).toBe("true")
  expect(await replay?.json()).toEqual({ success: true, id: "01ARZ3" })
})

test("key sama + body beda → 422 IDEMPOTENCY_KEY_REUSE", async () => {
  const key = ulid()
  await rememberIdempotent(
    postRequest(key, { email: "a@b.c" }),
    "user:1",
    Response.json({ ok: true }, { status: 201 }),
  )
  const clash = await tryReplayIdempotent(postRequest(key, { email: "z@z.z" }), "user:1")
  expect(clash?.status).toBe(422)
  const body = (await clash?.json()) as { code: string }
  expect(body.code).toBe("IDEMPOTENCY_KEY_REUSE")
})

test("scope berbeda → key tidak berbagi antar user", async () => {
  const key = ulid()
  await rememberIdempotent(
    postRequest(key, { email: "a@b.c" }),
    "user:1",
    Response.json({ ok: true }, { status: 201 }),
  )
  expect(await tryReplayIdempotent(postRequest(key, { email: "a@b.c" }), "user:2")).toBeNull()
})

test("respons non-2xx tidak disimpan", async () => {
  const key = ulid()
  const req = postRequest(key, { bad: true })
  await rememberIdempotent(req, "user:1", Response.json({ err: 1 }, { status: 400 }))
  expect(await tryReplayIdempotent(postRequest(key, { bad: true }), "user:1")).toBeNull()
})

test("idempotencyScope memisahkan user dan anon", () => {
  expect(idempotencyScope("u1")).toBe("user:u1")
  expect(idempotencyScope(null, "1.2.3.4")).toBe("ip:1.2.3.4")
})
