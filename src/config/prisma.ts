import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { settings } from "@/config/settings"
import { PrismaClient } from "@/generated/client/client"

// Satu-satunya pintu Prisma: semua tipe client lewat sini,
// jangan import langsung dari "@/generated/client/client" di lib/seeder/route.
export type { Prisma, PrismaClient } from "@/generated/client/client"

// Postgres-only. TLS dikontrol penuh oleh DATABASE_URL
// (tambah ?sslmode=verify-full untuk managed Postgres,
// ?sslmode=disable untuk Postgres lokal tanpa TLS).
const connectionString = settings.DATABASE_URL

// Handle pool errors to prevent crashes
const pgPool = new pg.Pool({
  connectionString,
  max: 10,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
})

pgPool.on("error", (err) => {
  console.error("Unexpected database pool error:", err)
})
pgPool.on("connect", () => {
  console.log("Database connection established")
})
pgPool.on("remove", () => {
  console.log("Database connection removed")
})

const adapter = new PrismaPg(pgPool)

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

/** Tutup koneksi DB sepenuhnya (client + pool). Wajib dipakai script sekali-jalan
 *  (seed, dsb) agar proses benar-benar exit — $disconnect saja tidak menutup pool. */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
  await pgPool.end()
}

export default prisma
