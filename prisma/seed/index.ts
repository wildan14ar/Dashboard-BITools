import prisma, { disconnectDatabase } from "../../src/config/prisma"
import { seedPermissions } from "./permissions"
import type { UserCliOverrides } from "./users"
import { seedUsers } from "./users"

// Entry + CLI parser digabung satu file. Pakai:
//   bun run db:seed -- [flags]
// Nilai seed hardcoded di users.ts; flag CLI untuk override per-seed.

export const SEEDERS = ["permissions", "users"] as const

export type SeederName = (typeof SEEDERS)[number]

export interface SeedCliOptions {
  only: SeederName[]
  dryRun: boolean
  help: boolean
  list: boolean
  skipSystemUser: boolean
  admin: UserCliOverrides
  user: UserCliOverrides
}

// Flag boolean: cukup tulis "--dry-run" dst (tanpa nilai).
const BOOL_FLAGS = {
  "--dry-run": "dryRun",
  "--help": "help",
  "-h": "help",
  "--list": "list",
  "--no-system-user": "skipSystemUser",
} as const

// Flag bernilai: [bucket options, field] — dukung `--flag x` dan `--flag=x`.
const VALUE_FLAGS: Record<string, [bucket: "admin" | "user", field: string]> = {
  "--admin-email": ["admin", "email"],
  "--admin-username": ["admin", "username"],
  "--admin-name": ["admin", "fullname"],
  "--admin-password": ["admin", "password"],
  "--user-email": ["user", "email"],
  "--user-username": ["user", "username"],
  "--user-name": ["user", "fullname"],
  "--user-password": ["user", "password"],
}

function splitSeeders(raw: string, flag: string): SeederName[] {
  const names = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (names.length === 0) throw new Error(`${flag} butuh minimal satu seeder`)
  for (const name of names) {
    if (!(SEEDERS as readonly string[]).includes(name)) {
      throw new Error(`Seeder tidak dikenal: "${name}" (pilih: ${SEEDERS.join(", ")})`)
    }
  }
  return names as SeederName[]
}

export function seedHelpText(): string {
  return [
    "Usage: bun run db:seed -- [flags]",
    "",
    "Pilih seeder (default: semua):",
    "  --permissions --users   Jalankan seeder tersebut saja",
    "  --only=a,b | --only a b            Sama, eksplisit",
    "  --skip=a,b | --skip a b            Lewati seeder tersebut",
    "  --list                             Tampilkan daftar seeder lalu keluar",
    "",
    "Override users (ngalahin hardcoded):",
    "  --admin-email --admin-username --admin-name --admin-password",
    "  --user-email --user-username --user-name --user-password",
    '  --no-system-user                   Jangan seed user sistem (id "system")',
    "",
    "Lainnya:",
    "  --dry-run                          Tampilkan rencana tanpa menulis ke DB",
    "  --help, -h                         Tampilkan bantuan ini",
    "",
    "Contoh:",
    '  bun run db:seed -- --users --admin-password "S3cret!"',
  ].join("\n")
}

export function parseSeedArgs(argv: string[]): SeedCliOptions {
  // Buang path script (".../seed/index.ts") bila ikut terbawa argv.
  const args = argv[0]?.endsWith(".ts") ? argv.slice(1) : argv
  const options: SeedCliOptions = {
    only: [...SEEDERS],
    dryRun: false,
    help: false,
    list: false,
    skipSystemUser: false,
    admin: {},
    user: {},
  }
  const only = new Set<SeederName>()
  const skip = new Set<SeederName>()

  // Ambil nilai untuk flag di posisi i (bentuk `--flag x` atau `--flag=x`).
  const takeValue = (i: number): { value: string; next: number } => {
    const arg = args[i]
    const eq = arg.indexOf("=")
    if (eq !== -1) {
      const value = arg.slice(eq + 1).trim()
      if (!value) throw new Error(`${arg} butuh nilai`)
      return { value, next: i + 1 }
    }
    const value = args[i + 1]
    if (value === undefined || value.startsWith("-")) throw new Error(`${arg} butuh nilai`)
    return { value, next: i + 2 }
  }

  let i = 0
  while (i < args.length) {
    const flag = args[i].split("=")[0]

    if (flag in BOOL_FLAGS) {
      options[BOOL_FLAGS[flag as keyof typeof BOOL_FLAGS]] = true
      i += 1
    } else if (flag === "--permissions" || flag === "--users") {
      only.add(flag.slice(2) as SeederName)
      i += 1
    } else if (flag === "--only" || flag === "--skip") {
      const first = takeValue(i)
      // Bentuk `--only a b`: telan token non-flag berikutnya juga.
      const rest: string[] = []
      let next = first.next
      if (!args[i].includes("=")) {
        while (next < args.length && !args[next].startsWith("-")) rest.push(args[next++])
      }
      const names = splitSeeders([first.value, ...rest].join(","), flag)
      for (const name of names) (flag === "--only" ? only : skip).add(name)
      i = next
    } else if (flag in VALUE_FLAGS) {
      const { value, next } = takeValue(i)
      const [bucket, field] = VALUE_FLAGS[flag]
      ;(options[bucket] as Record<string, string>)[field] = value
      i = next
    } else {
      throw new Error(`Flag tidak dikenal: "${args[i]}"`)
    }
  }

  const base = only.size > 0 ? [...only] : [...SEEDERS]
  options.only = base.filter((s) => !skip.has(s))
  if (options.only.length === 0) throw new Error("Semua seeder di-skip, tidak ada yang dijalankan")
  return options
}

/** Urutan eksekusi kanonis: permissions → users. */
export function resolveSeeders(options: SeedCliOptions): SeederName[] {
  const selected = new Set(options.only)
  return SEEDERS.filter((s) => selected.has(s))
}

async function main() {
  let options: SeedCliOptions
  try {
    options = parseSeedArgs(process.argv.slice(2))
  } catch (err) {
    console.error(`❌ ${(err as Error).message}\n`)
    console.log(seedHelpText())
    process.exit(1)
  }

  if (options.help) {
    console.log(seedHelpText())
    return
  }
  if (options.list) {
    console.log(`Available seeders: ${SEEDERS.join(", ")}`)
    return
  }

  const selected = resolveSeeders(options)
  const dry = options.dryRun ? " [dry-run]" : ""
  console.log(`🌱 Seeding database (${selected.join(", ")})...${dry}`)

  const runners: Record<SeederName, () => Promise<void>> = {
    permissions: () => seedPermissions(prisma, { dryRun: options.dryRun }),
    users: () =>
      seedUsers(prisma, {
        admin: options.admin,
        user: options.user,
        skipSystemUser: options.skipSystemUser,
        dryRun: options.dryRun,
      }),
  }
  for (const name of selected) await runners[name]()

  console.log(`✅ Database seeding completed!${dry}`)
}

// Bun: hanya jalan saat file dieksekusi langsung, bukan saat di-import test.
if (import.meta.main) {
  main()
    .then(async () => {
      await disconnectDatabase()
    })
    .catch(async (e) => {
      const message = e instanceof Error ? e.message : String(e)
      // Salah input seed (password pendek): cukup satu baris pesan.
      console.error(`❌ ${message}`)
      if (!/minimal 6/.test(message)) console.error(e)
      await disconnectDatabase()
      process.exit(1)
    })
}
