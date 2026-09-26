"use client"

import { AttachmentsBrowser } from "@/app/(dashboard)/_components/AttachmentsBrowser"
import { Protected } from "@/components/Protected"

export default function AdminAttachmentsPage() {
  return (
    <Protected permissions={["attachments:admin"]}>
      <AttachmentsBrowser
        mode="all"
        eyebrow="File Storage"
        title="Semua Attachment"
        description="Seluruh file yang diunggah semua pengguna. Upload di sini tercatat atas nama Anda."
      />
    </Protected>
  )
}
