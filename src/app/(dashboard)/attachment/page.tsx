"use client"

import { AttachmentsBrowser } from "@/app/(dashboard)/_components/AttachmentsBrowser"

export default function MyFilesPage() {
  return (
    <div className="space-y-6 p-10">
      <AttachmentsBrowser
        mode="own"
        eyebrow="File Saya"
        title="File Saya"
        description="File yang Anda unggah. URL file bisa dipakai sebagai avatar, logo, atau referensi lain."
      />
    </div>
  )
}
