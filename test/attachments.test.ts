import { expect, test } from "bun:test"
import {
  ATTACHMENTS_URL_PREFIX,
  attachmentIdFromUrl,
  isAttachmentUrl,
  isS3Enabled,
  toAttachmentUrl,
} from "@/config/storage"

test("toAttachmentUrl menormalisasi id menjadi proxy URL", () => {
  expect(toAttachmentUrl(null)).toBeNull()
  expect(toAttachmentUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png")
  expect(toAttachmentUrl("/api/attachments/abc")).toBe("/api/attachments/abc")
  expect(toAttachmentUrl("abc")).toBe(`${ATTACHMENTS_URL_PREFIX}abc`)
})

test("isAttachmentUrl hanya true untuk proxy URL", () => {
  expect(isAttachmentUrl("/api/attachments/abc")).toBe(true)
  expect(isAttachmentUrl("https://cdn.example.com/a.png")).toBe(false)
  expect(isAttachmentUrl("data:image/png;base64,xx")).toBe(false)
  expect(isAttachmentUrl(null)).toBe(false)
  expect(isAttachmentUrl(undefined)).toBe(false)
})

test("attachmentIdFromUrl mengekstrak id", () => {
  expect(attachmentIdFromUrl("/api/attachments/abc")).toBe("abc")
  expect(attachmentIdFromUrl("https://cdn.example.com/a.png")).toBeNull()
  expect(attachmentIdFromUrl(null)).toBeNull()
})

test("isS3Enabled false bila env S3 tidak lengkap", () => {
  // bun test tidak memuat .env — S3_* kosong → fallback DB.
  expect(isS3Enabled()).toBe(false)
})
