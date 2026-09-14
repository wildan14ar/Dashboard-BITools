"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

export default function ButtonLogout() {
  const router = useRouter()

  async function handleLogout() {
    await authClient.signOut()
    router.push("/login")
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <LogOut size={18} />
      <span>Logout</span>
    </button>
  )
}
