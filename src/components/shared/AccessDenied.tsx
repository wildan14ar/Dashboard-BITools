import { ShieldAlert } from "lucide-react"

export function AccessDenied({
  title = "Akses Ditolak",
  description = "Anda tidak memiliki izin untuk mengakses halaman ini.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
      <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
