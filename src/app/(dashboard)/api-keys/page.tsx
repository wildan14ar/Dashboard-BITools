"use client"

import { CheckCheck, Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { useLocale } from "next-intl"
import { Suspense, useMemo, useState } from "react"
import { Protected } from "@/components/Protected"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  type ApiKey,
  type CreatedApiKey,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useUpdateApiKey,
} from "@/hooks/use-api-keys"
import { formatRelative } from "@/lib/utils"

type Filter = "all" | "active" | "inactive"

function formatCreatedAt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

function ApiKeysContent() {
  const locale = useLocale()
  const [filter, setFilter] = useState<Filter>("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  // Form create
  const [name, setName] = useState("")
  const [isRest, setIsRest] = useState(true)
  const [isMcp, setIsMcp] = useState(false)
  const [expires, setExpires] = useState("")

  // Rename
  const [editing, setEditing] = useState<ApiKey | null>(null)
  const [editName, setEditName] = useState("")
  const [targetKey, setTargetKey] = useState<ApiKey | null>(null)

  const handleConfirmRevoke = async () => {
    if (!targetKey) return
    try {
      await revokeKey.mutateAsync(targetKey.id)
      setTargetKey(null)
    } catch {
      // toast error sudah ditangani api client; dialog tetap terbuka
    }
  }

  const { data, isLoading } = useApiKeys()
  const keys = data?.items ?? []
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()
  const updateKey = useUpdateApiKey()

  const counts = useMemo(
    () => ({
      total: keys.length,
      active: keys.filter((k) => k.isActive).length,
      inactive: keys.filter((k) => !k.isActive).length,
    }),
    [keys],
  )

  const visible = keys.filter((k) =>
    filter === "all" ? true : filter === "active" ? k.isActive : !k.isActive,
  )

  const openCreate = () => {
    setCreated(null)
    setCopied(false)
    setName("")
    setIsRest(true)
    setIsMcp(false)
    setExpires("")
    setCreateOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await createKey.mutateAsync({
      name: name.trim(),
      isRestfull: isRest,
      isMCP: isMcp,
      expiresAt: expires || undefined,
    })
    setCreated(res)
  }

  const handleCopy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.key)
      setCopied(true)
    } catch {
      /* clipboard tak tersedia */
    }
  }

  return (
    <div className="space-y-6 p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">API Keys</h1>
          <p className="text-on-surface-variant mt-1">
            Manage your API keys for programmatic access
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New API Key
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(
          [
            { key: "total", label: "Total Keys", value: counts.total },
            { key: "active", label: "Active", value: counts.active },
            { key: "inactive", label: "Inactive", value: counts.inactive },
          ] as const
        ).map((s) => (
          <Card key={s.key}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-bold mt-1">{isLoading ? "…" : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(
          [
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "inactive", label: "Inactive" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {filter === "all" ? "Belum ada API key." : `Tidak ada key ${filter}.`}
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map((k) => (
                <div
                  key={k.id}
                  className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{k.name}</span>
                    <span
                      className={`text-[11px] font-medium rounded px-2 py-0.5 ${
                        k.isActive
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {k.isActive ? "Active" : "Inactive"}
                    </span>
                    {k.isMCP && (
                      <span className="text-[11px] font-medium rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5">
                        MCP
                      </span>
                    )}
                    {k.isRestfull && (
                      <span className="text-[11px] font-medium rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5">
                        REST
                      </span>
                    )}
                    <span className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={updateKey.isPending}
                        onClick={() => {
                          setEditing(k)
                          setEditName(k.name)
                        }}
                        aria-label="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error hover:text-error"
                        disabled={revokeKey.isPending}
                        onClick={() => setTargetKey(k)}
                        aria-label="Revoke"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </div>
                  <code className="block mt-2 text-xs font-mono text-muted-foreground">
                    sk_{k.prefix}…
                  </code>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {k.usageCount} requests
                    {k.lastUsedAt ? ` · Last used ${formatRelative(k.lastUsedAt)}` : ""}
                    {` · Created ${formatCreatedAt(k.createdAt, locale)}`}
                    {k.expiresAt ? ` · Expires ${formatCreatedAt(k.expiresAt, locale)}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog create */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          if (!v) setCreateOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-md">
          {created ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Copy this key now. You won&apos;t be able to see it again.
                </DialogDescription>
              </DialogHeader>
              <code className="block rounded bg-muted px-3 py-2.5 text-xs font-mono break-all">
                {created.key}
              </code>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <p className="font-semibold mb-1">Important</p>
                <p className="text-muted-foreground">
                  Store this key securely. For security reasons, it will not be shown again.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <CheckCheck className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  onClick={() => {
                    setCreateOpen(false)
                    setCreated(null)
                  }}
                >
                  Done
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>Give your API key a descriptive name</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="new-key-name">Name *</Label>
                  <Input
                    id="new-key-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Production, Development, Testing"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="new-key-rest" checked={isRest} onCheckedChange={setIsRest} />
                    <Label htmlFor="new-key-rest">REST</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="new-key-mcp" checked={isMcp} onCheckedChange={setIsMcp} />
                    <Label htmlFor="new-key-mcp">MCP</Label>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-key-exp">Set expiration date</Label>
                  <Input
                    id="new-key-exp"
                    type="date"
                    value={expires}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setExpires(e.target.value)}
                  />
                </div>
                {createKey.isError && (
                  <p className="text-xs font-medium text-destructive">
                    {createKey.error?.message ?? "Gagal membuat key"}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!name.trim() || (!isRest && !isMcp) || createKey.isPending}
                  >
                    {createKey.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog rename-only */}
      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename API Key</DialogTitle>
            <DialogDescription>Hanya nama yang bisa diubah.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!editing) return
              await updateKey.mutateAsync({
                id: editing.id,
                name: editName.trim() || editing.name,
              })
              setEditing(null)
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="rename-key">Nama</Label>
              <Input
                id="rename-key"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={updateKey.isPending}>
                {updateKey.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={targetKey !== null}
        onOpenChange={(open) => {
          if (!open) setTargetKey(null)
        }}
        title="Cabut API key ini?"
        description={
          targetKey
            ? `Key "${targetKey.name}" akan dinonaktifkan dan tidak bisa dipakai lagi.`
            : undefined
        }
        confirmLabel="Cabut key"
        loading={revokeKey.isPending}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  )
}

export default function ApiKeysPage() {
  return (
    <Protected
      permissions={["keys:read", "keys:create", "keys:update", "keys:delete"]}
      fallback={
        <div className="p-8 text-center">
          <h3 className="text-lg font-semibold">Akses ditolak</h3>
          <p className="text-on-surface-variant">
            Minta admin memberikan permission API Keys (read/create/update/delete).
          </p>
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <ApiKeysContent />
      </Suspense>
    </Protected>
  )
}
