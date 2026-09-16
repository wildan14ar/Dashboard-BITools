"use client"

import { ChevronDown, LayoutDashboard } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import ButtonLogout from "@/components/atoms/ButtonLogout"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function UserAvatar({
  src,
  name,
  size,
}: {
  src?: string | null
  name?: string | null
  size?: number
}) {
  const [imageError, setImageError] = useState(false)
  const s = size || 32

  if (src && !imageError) {
    return (
      <div className="relative shrink-0" style={{ width: s, height: s }}>
        <Image
          src={src}
          alt={name || "User"}
          fill
          sizes="32px"
          className="rounded-full ring-2 ring-border object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
      </div>
    )
  }

  return (
    <div
      className="rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border text-primary font-medium text-xs border border-primary/20"
      style={{ width: s, height: s }}
    >
      {getInitials(name || "User")}
    </div>
  )
}

export function ButtonUser({ mode = "dropdown" }: { mode?: "dropdown" | "flow" }) {
  const { user, isLoading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) return null
  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        Sign in
      </Link>
    )
  }

  const displayName = user.fullname || user.username || user.email

  if (mode === "flow") {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-foreground hover:bg-accent rounded-lg px-4 py-3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <UserAvatar src={user.avatar} name={displayName} size={28} />
            <span className="font-medium">{displayName}</span>
          </div>
          <ChevronDown size={18} />
        </button>
        {isOpen && (
          <div className="w-full bg-muted/50 border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="py-1">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
              <ButtonLogout className="mt-2" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors outline-none"
        >
          <UserAvatar src={user.avatar} name={displayName} />
          <span className="hidden md:inline-block text-sm font-medium text-foreground">
            {displayName}
          </span>
          <ChevronDown size={16} className="hidden md:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-56 shadow-lg">
        <DropdownMenuLabel className="font-normal mb-2 border-b border-border pb-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/" className="w-full cursor-pointer flex items-center gap-2">
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="w-full cursor-pointer flex items-center gap-2">
          <ButtonLogout className="mt-2" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
