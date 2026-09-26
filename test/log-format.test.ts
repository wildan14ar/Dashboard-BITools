import { expect, test } from "bun:test"
import { formatIp, formatLogSummary, shortId } from "@/lib/log-format"

test("formatIp menormalisasi loopback", () => {
  expect(formatIp("::1")).toBe("127.0.0.1 (lokal)")
  expect(formatIp("::ffff:127.0.0.1")).toBe("127.0.0.1 (lokal)")
  expect(formatIp("192.168.1.5")).toBe("192.168.1.5")
  expect(formatIp(null)).toBeNull()
})

test("ringkasan memakai metadata", () => {
  expect(formatLogSummary({ action: "CREATE", entity: "User", metadata: { email: "a@b.c" } })).toBe(
    "Membuat user a@b.c",
  )
  expect(
    formatLogSummary({
      action: "CREATE",
      entity: "NotificationBroadcast",
      metadata: { sent: 5, title: "Promo" },
    }),
  ).toBe('Broadcast ke 5 user: "Promo"')
  expect(
    formatLogSummary({ action: "DELETE", entity: "Session", metadata: { bulk: true, revoked: 3 } }),
  ).toBe("Mencabut 3 sesi")
  expect(formatLogSummary({ action: "UPDATE", entity: "Profile" })).toBe(
    "Memperbarui profil sendiri",
  )
})

test("fallback pola ACTION + entitas", () => {
  expect(formatLogSummary({ action: "FOO", entity: "Bar" })).toBe("FOO Bar")
})

test("shortId menyembunyikan placeholder", () => {
  expect(shortId("01M2QC0R1C5MHRSQR2KR04YZEE")).toBe("01M2QC0R")
  expect(shortId("all")).toBeNull()
  expect(shortId(null)).toBeNull()
})
