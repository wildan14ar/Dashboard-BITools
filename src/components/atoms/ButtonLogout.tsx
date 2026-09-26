"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "@/i18n/navigation"
import { authClient } from "@/lib/auth-client"

interface ButtonLogoutProps {
  className?: string
}

export default function ButtonLogout({ className }: ButtonLogoutProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut()
        router.push("/login")
        router.refresh()
      }}
      className={`w-full ${className || ""} flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium text-sm`}
    >
      <LogOut size={16} />
      <span>Logout</span>
    </button>
  )
}
