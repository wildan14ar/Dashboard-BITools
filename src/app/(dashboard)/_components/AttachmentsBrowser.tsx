"use client"

import { Check, Copy, Download, FileIcon, Loader2, Trash2, Upload } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import SectionHeader from "@/components/shared/SectionHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  type Attachment,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from "@/hooks/use-attachments"
import { toDataUrlSize } from "@/lib/image-upload"
import { formatRelative } from "@/lib/utils"

const PAGE_SIZE = 12

interface AttachmentsBrowserProps {
  /** "all" = semua user (admin, ?isAdmin=true); "own" = milik sendiri. */
  mode: "all" | "own"
  eyebrow: string
  title: string
  description: string
}

function isImage(mime: string): boolean {
  return mime.startsWith("image/")
}

function absoluteUrl(fileUrl: string): string {
  if (fileUrl.startsWith("http")) return fileUrl
  if (typeof window === "undefined") return fileUrl
  return `${window.location.origin}${fileUrl}`
}

function AttachmentCard({
  attachment,
  showOwner,
  onDelete,
  deleting,
}: {
  attachment: Attachment
  showOwner: boolean
  onDelete: (attachment: Attachment) => void
  deleting: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl(attachment.fileUrl))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Gagal menyalin URL")
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {isImage(attachment.fileType) ? (
          <Image
            src={attachment.fileUrl}
            alt={attachment.fileName}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <FileIcon className="h-10 w-10 opacity-40" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
              {attachment.fileName.split(".").pop()?.slice(0, 4) || "file"}
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-3 space-y-1.5">
        <p className="text-sm font-medium truncate" title={attachment.fileName}>
          {attachment.fileName}
        </p>
        <p className="text-xs text-muted-foreground">
          {toDataUrlSize(attachment.fileSize)}
          {attachment.createdAt ? ` · ${formatRelative(attachment.createdAt)}` : ""}
        </p>
        {showOwner && attachment.user && (
          <p className="text-xs text-muted-foreground truncate">@{attachment.user.username}</p>
        )}
        <div className="flex items-center gap-1 pt-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" asChild>
            <a href={`${attachment.fileUrl}?isDownload=true`} download={attachment.fileName}>
              <Download className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive ml-auto"
            disabled={deleting}
            onClick={() => onDelete(attachment)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AttachmentsBrowser({ mode, eyebrow, title, description }: AttachmentsBrowserProps) {
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<Attachment | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadAttachment()
  const remove = useDeleteAttachment()

  const { data, isLoading } = useAttachments({
    isAdmin: mode === "all" ? true : undefined,
    page,
    limit: PAGE_SIZE,
  })
  const items = data?.items ?? []
  const pagination = data?.pagination

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    upload.mutate(file, {
      onError: () => {
        if (fileInputRef.current) fileInputRef.current.value = ""
      },
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = ""
      },
    })
  }

  const handleDelete = async () => {
    if (!target) return
    try {
      await remove.mutateAsync(target.id)
      setTarget(null)
    } catch {
      // toast error sudah ditangani api client; dialog tetap terbuka
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        level={1}
        action={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              disabled={upload.isPending}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              disabled={upload.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {upload.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {upload.isPending ? "Mengunggah..." : "Upload File"}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Belum ada file. Klik “Upload File” untuk menambah.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                showOwner={mode === "all"}
                onDelete={setTarget}
                deleting={remove.isPending}
              />
            ))}
          </div>
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">
                {pagination.page} / {pagination.total_pages} · {pagination.total} file
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pagination.has_more}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title="Hapus file?"
        description={`File "${target?.fileName}" akan dihapus permanen beserta referensinya.`}
        confirmLabel="Ya, hapus"
        loading={remove.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
