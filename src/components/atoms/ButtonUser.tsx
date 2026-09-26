"use client"

import { ChevronDown, LayoutDashboard } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link } from "@/i18n/navigation"
import { authClient } from "@/lib/auth-client"
import ButtonLogout from "./ButtonLogout"

type ButtonUserMode = "dropdown" | "flow"

interface ButtonUserProps {
  mode?: ButtonUserMode
  /** true = avatar + nama; false = avatar saja. */
  showLabel?: boolean
}

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

export function ButtonUser({ mode = "dropdown", showLabel = true }: ButtonUserProps) {
  const { data: session, isPending } = authClient.useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (isPending) return null
  if (!session) return null

  const userName = session?.user?.name

  const flowDropdown = (
    <div className="w-full bg-muted/50 border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-medium text-foreground">{userName}</p>
        <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
      </div>
      <div className="py-1">
        <Link
          href="/dashboard"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </Link>
        <ButtonLogout className="mt-2" />
      </div>
    </div>
  )

  if (mode === "flow") {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-foreground hover:bg-accent rounded-lg px-4 py-3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div>
              <UserAvatar src={session?.user?.image} name={userName} size={28} />
            </div>
            <span className="font-medium">{userName}</span>
          </div>
          <ChevronDown size={18} />
        </button>
        {isOpen && flowDropdown}
      </div>
    )
  }

  // Desktop dropdown mode
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors outline-none"
          aria-label={userName ?? "User menu"}
          title={userName ?? undefined}
        >
          <div>
            <UserAvatar src={session?.user?.image} name={userName} />
          </div>
          {showLabel && (
            <>
              <span className="hidden md:inline-block text-sm font-medium text-foreground">
                {userName}
              </span>
              <ChevronDown size={16} className="hidden md:block" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-56 shadow-lg">
        <DropdownMenuLabel className="font-normal mb-2 border-b border-border pb-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="w-full cursor-pointer flex items-center gap-2">
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
