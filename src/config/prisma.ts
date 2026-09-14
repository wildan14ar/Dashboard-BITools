import { PrismaPg } from "@prisma/adapter-pg"
import { settings } from "@/config/settings"
import { PrismaClient } from "@/lib/prisma/client"

// BI tetap PostgreSQL-only (engine query ke source DB lain lewat gRPC, bukan Prisma).
// NOTE: jangan pass pg.Pool instance ke PrismaPg — adapter cek
// `instanceof` dengan copy `pg` miliknya sendiri; beda copy = Pool
// dianggap config object = fallback ke 127.0.0.1:5432 (P1001).
// Pass connection string agar adapter bikin pool internal yang konsisten.
const connectionString = `${settings.DATABASE_URL}`

const adapter = new PrismaPg(connectionString, {
  onPoolError: (err) => {
    console.error("Unexpected database pool error:", err)
  },
})

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Singleton untuk mencegah multiple connections saat hot reload (development)
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: settings.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (settings.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
