"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export default function ButtonLogout() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <LogOut size={18} />
      <span>Logout</span>
    </button>
  )
}
