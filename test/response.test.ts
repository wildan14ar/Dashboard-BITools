import { expect, test } from "bun:test"
import { ResponseHandler } from "@/middlewares/response-handler"

test("success envelope shape", async () => {
  const res = ResponseHandler.success("OK", { a: 1 })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ success: true, message: "OK", data: { a: 1 } })
})

test("created returns 201", () => {
  expect(ResponseHandler.created("Made").status).toBe(201)
})

test("error helpers map status codes", () => {
  expect(ResponseHandler.badRequest().status).toBe(400)
  expect(ResponseHandler.unauthorized().status).toBe(401)
  expect(ResponseHandler.forbidden().status).toBe(403)
  expect(ResponseHandler.notFound().status).toBe(404)
  expect(ResponseHandler.conflict().status).toBe(409)
})

test("internalError hides detail in production", async () => {
  const res = ResponseHandler.internalError("Boom", { secret: 1 })
  expect(res.status).toBe(500)
  const body = await res.json()
  expect(body.success).toBe(false)
  expect(body.message).toBe("Boom")
})
