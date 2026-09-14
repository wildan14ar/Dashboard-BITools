import { expect, test } from "bun:test"
import { hashPassword, verifyPassword } from "@/lib/hash"

test("hashPassword returns argon2 hash", async () => {
  const hash = await hashPassword("password123")
  expect(typeof hash).toBe("string")
  expect(hash).toMatch(/^\$argon2/)
})

test("verifyPassword returns true for correct password", async () => {
  const hash = await hashPassword("password123")
  const result = await verifyPassword("password123", hash)
  expect(result).toBe(true)
})

test("verifyPassword returns false for wrong password", async () => {
  const hash = await hashPassword("password123")
  const result = await verifyPassword("wrongpass", hash)
  expect(result).toBe(false)
})
