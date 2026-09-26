import { expect, test } from "bun:test"
import { parseSort } from "@/lib/sort"

const allowed = ["createdAt", "name"] as const

test("nilai valid dipakai apa adanya", () => {
  expect(parseSort({ sort: "name", order: "asc" }, { allowed })).toEqual({
    sort: "name",
    order: "asc",
  })
})

test("sort typo / kosong → default", () => {
  expect(parseSort({ sort: "foobar", order: "asc" }, { allowed })).toEqual({
    sort: "createdAt",
    order: "asc",
  })
  expect(parseSort({}, { allowed })).toEqual({ sort: "createdAt", order: "desc" })
  expect(parseSort({ sort: 123 }, { allowed }).sort).toBe("createdAt")
})

test("order aneh → default; case-insensitive", () => {
  expect(parseSort({ order: "DESC" }, { allowed }).order).toBe("desc")
  expect(parseSort({ order: "ASC" }, { allowed }).order).toBe("asc")
  expect(parseSort({ order: "acak" }, { allowed }).order).toBe("desc")
  expect(parseSort({ order: "acak" }, { allowed, defaultOrder: "asc" }).order).toBe("asc")
})

test("defaultSort kustom & allowed kosong", () => {
  expect(parseSort({}, { allowed, defaultSort: "name" }).sort).toBe("name")
  expect(parseSort({}, { allowed: [] }).sort).toBe("createdAt")
})
