"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

type ButtonLogoutProps = {
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
      className={`flex w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 ${className || ""}`}
    >
      <LogOut size={16} />
      <span>Logout</span>
    </button>
  )
}
