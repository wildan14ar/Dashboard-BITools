"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

export function ButtonUser() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null
  if (!user) {
    return (
      <Link href="/login">
        <Button size="sm">Sign in</Button>
      </Link>
    )
  }

  return (
    <span className="text-sm text-muted-foreground">
      {user.fullname ?? user.username ?? user.email}
    </span>
  )
}
