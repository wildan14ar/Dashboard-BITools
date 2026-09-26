"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  type Notification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from "@/hooks/use-notifications"

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

function PanelHeader({ unreadCount, onMarkAll }: { unreadCount: number; onMarkAll: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-sm font-semibold">Notifications</span>
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={onMarkAll}
          className="text-xs text-primary hover:underline cursor-pointer"
        >
          Mark all read
        </button>
      )}
    </div>
  )
}

function PanelList({
  items,
  onOpenItem,
}: {
  items: Notification[]
  onOpenItem: (item: Notification) => void
}) {
  if (items.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">No notifications</div>
  }
  return (
    <div className="max-h-72 overflow-y-auto">
      {items.map((item: Notification) => (
        <Link
          key={item.id}
          href={item.link ?? "#"}
          onClick={() => onOpenItem(item)}
          className={`flex flex-col gap-0.5 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent ${!item.isRead ? "bg-primary/5" : ""}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-foreground line-clamp-2">
              {!item.isRead && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 shrink-0" />
              )}
              {item.title}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">
              {relativeTime(item.createdAt)}
            </span>
          </div>
          {item.body && (
            <span className="text-xs text-muted-foreground line-clamp-1 pl-3">{item.body}</span>
          )}
        </Link>
      ))}
    </div>
  )
}

function PanelFooter({ unreadCount, onNavigate }: { unreadCount: number; onNavigate: () => void }) {
  return (
    <Link
      href="/profile?tab=notifikasi"
      onClick={onNavigate}
      className="block px-3 py-2 text-xs text-center text-primary hover:underline"
    >
      View all notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}
    </Link>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data } = useNotifications({ limit: 5, unread: false })
  const markAllAsRead = useMarkAllAsRead()
  const markAsRead = useMarkAsRead()

  const unreadCount = data?.unreadCount ?? 0
  const items = data?.items ?? []

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id)
  }

  const handleOpenItem = (item: Notification) => {
    if (!item.isRead) handleMarkRead(item.id)
    setOpen(false)
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="relative p-2 hover:bg-accent transition-colors outline-none"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        {/* Desktop: dropdown menempel trigger */}
        <DropdownMenuContent align="end" sideOffset={6} className="hidden sm:block w-80 shadow-xl">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead.mutate()}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {items.map((item: Notification) => (
                <DropdownMenuItem key={item.id} asChild>
                  <Link
                    href={item.link ?? "#"}
                    onClick={() => {
                      if (!item.isRead) handleMarkRead(item.id)
                      setOpen(false)
                    }}
                    className={`flex flex-col gap-0.5 px-3 py-2.5 cursor-pointer ${!item.isRead ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground line-clamp-2">
                        {!item.isRead && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 shrink-0" />
                        )}
                        {item.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                    {item.body && (
                      <span className="text-xs text-muted-foreground line-clamp-1 pl-3">
                        {item.body}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          )}
          <DropdownMenuSeparator />
          <Link
            href="/profile?tab=notifikasi"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-xs text-center text-primary hover:underline"
          >
            View all notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile: panel terpusat, ramping (bukan full-width) */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-[60]" role="dialog" aria-label="Notifications">
          <button
            type="button"
            aria-label="Tutup notifikasi"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 cursor-default"
          />
          <div className="absolute inset-x-6 top-20 mx-auto max-w-sm rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden">
            <PanelHeader unreadCount={unreadCount} onMarkAll={() => markAllAsRead.mutate()} />
            <div className="h-px bg-border" />
            <PanelList items={items} onOpenItem={handleOpenItem} />
            <div className="h-px bg-border" />
            <PanelFooter unreadCount={unreadCount} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
