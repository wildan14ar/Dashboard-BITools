import { expect, test } from "bun:test"
import { applyFields, applyFieldsMany, parseFields } from "@/lib/fields"

test("tanpa param → semua field (null)", () => {
  expect(parseFields(undefined, ["a", "b"])).toEqual({ fields: null, unknown: [] })
  expect(parseFields("", ["a", "b"])).toEqual({ fields: null, unknown: [] })
})

test("subset valid + unknown diabaikan", () => {
  expect(parseFields("a,c,x", ["a", "b", "c"])).toEqual({ fields: ["a", "c"], unknown: ["x"] })
})

test("semua unknown → fields kosong", () => {
  expect(parseFields("x,y", ["a"])).toEqual({ fields: [], unknown: ["x", "y"] })
})

test("applyFields memproyeksikan dangkal", () => {
  const obj = { id: "1", name: "n", secret: "s" }
  expect(applyFields(obj, null)).toEqual(obj)
  expect(applyFields(obj, ["id", "name"])).toEqual({ id: "1", name: "n" })
  expect(applyFieldsMany([obj], ["id"])).toEqual([{ id: "1" }])
})
