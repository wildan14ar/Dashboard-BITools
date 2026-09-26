import { redirect } from "next/navigation"

// Root kini milik dashboard: tidak ada lagi landing publik.
// Pengguna yang membuka "/" langsung diarahkan ke "/dashboard"
// (guard auth + locale tetap ditangani di proxy).
export default function RootPage() {
  redirect("/dashboard")
}
