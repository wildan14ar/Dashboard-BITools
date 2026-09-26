export interface LogSummaryInput {
  action: string
  entity: string
  entityId?: string | null
  metadata?: unknown
  user?: { fullname?: string | null; username?: string | null } | null
}

/** Normalisasi IP loopback agar terbaca manusia. */
export function formatIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  if (ip === "::1" || ip === "::ffff:127.0.0.1") return "127.0.0.1 (lokal)"
  return ip
}

function metaValue(metadata: unknown, ...keys: string[]): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const record = metadata as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }
  return null
}

/**
 * Ringkasan log yang bisa dibaca manusia.
 * Memakai metadata bila ada (username, title, revoked, dsb),
 * fallback ke pola ACTION + entitas.
 */
export function formatLogSummary(log: LogSummaryInput): string {
  const { action, entity } = log
  const meta = log.metadata

  const username = metaValue(meta, "username", "oldUsername")
  const title = metaValue(meta, "title")
  const email = metaValue(meta, "email")

  switch (`${action}:${entity}`) {
    case "CREATE:User":
      return `Membuat user ${username ? `"${username}"` : email ? email : ""}`.trim()
    case "UPDATE:User":
      return `Memperbarui user ${username ? `"${username}"` : ""}`.trim()
    case "DELETE:User":
      return `Menghapus user ${username ? `"${username}"` : ""}`.trim()
    case "CREATE:Role":
      return `Membuat role "${metaValue(meta, "name") ?? ""}"`.trim()
    case "UPDATE:Profile":
      return "Memperbarui profil sendiri"
    case "UPDATE:Password": {
      const meta = log.metadata as Record<string, unknown> | null
      if (meta && meta.byAdmin === true) return "Mereset password user"
      return "Mengubah password sendiri"
    }
    case "CREATE:NotificationBroadcast":
      return `Broadcast ke ${metaValue(meta, "sent") ?? "?"} user${title ? `: "${title}"` : ""}`
    case "DELETE:Session": {
      const meta = log.metadata as Record<string, unknown> | null
      const revoked = metaValue(log.metadata, "revoked")
      const target = metaValue(log.metadata, "revokedUserId")
      if (meta && meta.bulk === true)
        return `Mencabut ${revoked ?? "semua"} sesi${target ? " user" : ""}`
      return "Mencabut 1 sesi login"
    }
    case "CREATE:Calendar":
      return `Membuat event "${title ?? ""}"`.trim()
    case "UPDATE:Calendar":
      return "Memperbarui event kalender"
    case "DELETE:Calendar":
      return "Menghapus event kalender"
    case "ERROR:User":
    case "ERROR:Profile":
    case "ERROR:Session":
      return `Error pada ${entity}: ${metaValue(meta, "error")?.slice(0, 80) ?? ""}`.trim()
    default: {
      const detail = title || username || email || ""
      return `${action} ${entity}${detail ? ` — ${detail}` : ""}`
    }
  }
}

/** ID pendek untuk tampilan, ID penuh via tooltip. */
export function shortId(id: string | null | undefined, length = 8): string | null {
  if (!id || id === "all" || id === "unknown") return null
  return id.length > length ? id.slice(0, length) : id
}
