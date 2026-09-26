# PortoNext — Next.js 16 Boilerplate

Production-ready full-stack template for company profiles, portfolios, and admin dashboards. Built with Next.js 16 (App Router, RSC, Edge proxy), TypeScript, and Bun.

> Catatan nama paket: `package.json` saat ini bernama `nextjs-template` — ganti `name` saat clone untuk proyek baru.

## Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.3, React 19, TypeScript 5.9, App Router |
| **Runtime** | Bun (package manager + runtime, `bun.lock`) |
| **Database** | Prisma 7 — SQLite (dev, libsql) / PostgreSQL (prod, `pg` pool) |
| **Auth** | Better Auth v1.7 (credentials + OAuth Google/GitHub) + Argon2id (`@node-rs/argon2`) |
| **UI** | Tailwind CSS v4 + shadcn/ui (New York) + Radix UI, `sonner`, `motion`, `lucide-react` |
| **State** | TanStack Query v5 (server state, tanpa global store) |
| **Forms** | React Hook Form + Zod v4 (`@hookform/resolvers`) |
| **i18n** | next-intl v4 (`id`, `en`; default `en`, `localePrefix: always`) |
| **Lint/Format** | Biome v2 |
| **Git Hooks** | Husky + lint-staged + commitlint |

## Features

- **Public Site** — Landing, About, Contact, Privacy/Terms (konten dari DB via `Platform`), SEO: `sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`, GA/verification via env
- **Authentication** — Email/password + username (plugin `username`), OAuth Google/GitHub (toggle env), account linking (email harus cocok), sesi 30 hari, reset password, kelola social accounts
- **Dashboard user** — Profile (biodata, avatar upload, quote), password, linked accounts, activity log sendiri, kalender pribadi, notifikasi, API keys milik sendiri
- **Admin Panel** — User/role/permission management, sessions, activity logs, platform settings (SEO, socials + drag-order via dnd-kit, favicon/logo, privacy/terms), broadcast notifikasi, kalender global, API keys
- **RBAC** — Role-based access dengan katalog permission yang di-seed; Super Admin (`isSuperAdmin`) bypass semua cek; cek OR (salah satu cukup); cache permission 30 detik per proses
- **API Keys (server-to-server)** — Format `sk_<64 hex>`, header `X-API-Key`, hash `argon2id(salt + raw)`, lookup via prefix 8 char; flag `isRestfull` / `isMCP`; hak key = permission pemilik saat request; tracking `lastUsedAt`/`usageCount`
- **Platform Config** — Singleton `Platform(id="default")`: branding, kontak, map, SEO, legal pages + relasi `Social[]` (orderable)
- **Calendar** — Event (all-day, repeat, warna, holiday), `CalendarAssignment` per user, notifikasi per event
- **Audit Trail** — `ActivityLog` + `Notification` (fire-and-forget, ada user `system` id `"system"` agar FK log sistem valid)
- **API konvensi Postman** — Envelope `{ success, message, data, code, requestId? }`, `code` stabil (`VALIDATION_ERROR`, `CONFLICT`, …), pagination `{ page, limit, total, total_pages, has_more }` + cursor `{ next_cursor, has_more }` untuk feed, `?fields=` sparse fieldset, `Idempotency-Key` untuk POST, path stabil tanpa versioning (`/api/*` tunggal), rate-limit edge per IP (`RATE_LIMIT_*`), `x-request-id` end-to-end, HSTS + CSP di production

## Quick Start

```bash
# Install deps (jangan npm — Dockerfile & CI pakai frozen lockfile Bun)
bun install

# Setup env
cp .env.example .env
# Edit .env dengan valoremu (lihat tabel Environment di bawah)

# Database
bun run db:generate
bun run db:push        # dev cepat; untuk prod pakai db:migrate
bun run db:seed

# Dev server
bun run dev
```

> Nilai seed hardcoded di `prisma/seed/platform.ts` (branding) & `prisma/seed/users.ts` (akun) — edit langsung untuk ganti permanen, atau override per-seed via flag CLI.
> Seed `platform` bersifat merge-only: seed ulang hanya meng-override field yang diisi via CLI, sehingga kustomisasi dashboard tidak tertimpa (`--force-platform` untuk tulis ulang semua).

Akun seed: `admin@example.com` / `admin123` (Super Admin), `user@example.com` / `user123`. Ganti passwordnya setelah seed pertama di production.

```bash
bun run db:seed -- --help                        # semua flag
bun run db:seed -- --users --admin-password "S3cret!"   # hanya users + override
bun run db:seed -- --only=platform --platform-name "Acme" --force-platform
bun run db:seed -- --skip=users --dry-run         # simulasi tanpa tulis DB
```

## Commands

```bash
bun run dev         # Dev server (Turbopack)
bun run build       # Next build (dipakai pre-commit? TIDAK — lihat Git Hooks)
bun run typecheck   # tsc --noEmit (ini yang dijalankan lint-staged)
bun run lint        # bunx biome check src/ test/ prisma/
bun run lint:fix    # biome check --write
bun test            # Bun test — suite ada di test/ (fields, hash, idempotency, log-format, utils, seed-args, api-contract)
bun run analyze     # ANALYZE=true next build (bundle-analyzer)
bun run db:generate # Prisma generate
bun run db:push     # Push schema to DB (dev)
bun run db:migrate  # prisma migrate dev (prod-like)
bun run db:studio   # Prisma Studio
bun run db:seed     # seed semua (platform → permissions → users); lihat flag di atas
bun run db:reset    # prisma migrate reset --force
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx manifest.ts robots.ts sitemap.ts opengraph-image.tsx
│   ├── (auth)/login/register      # Halaman auth (tanpa prefix locale)
│   ├── [locale]/                  # Halaman publik ber-locale: / about contact privacy terms
│   ├── dashboard/                 # Protected: page, profile, calendar, api-keys
│   │   └── (admin)/                 # Route group (tanpa segmen URL): platform, users, roles, sessions, logging
│   └── api/                       # Route handlers (path stabil /api/*, tanpa versioning)
│       ├── auth/[...all] me reset-password social-accounts/[id]
│       ├── users/route + [id]/ + [id]/reset-password + logs + roles/[id] + roles/permissions + sessions/[id]
│       ├── platform/route privacy terms social/[id] social/order
│       ├── calendar/route + [id]
│       ├── notifications/route + [id]/read + read-all + broadcast
│       ├── api-keys/route + [id]
├── components/
│   ├── ui/                        # shadcn/ui primitives (New York)
│   ├── atoms/ shared/             # Primitive & composite
│   ├── Navbar.tsx Footer.tsx Sidebar.tsx LayoutWrapper.tsx
│   ├── Providers.tsx              # QueryClient + ThemeProvider + sonner
│   ├── NotificationBell.tsx
│   └── Protected.tsx              # Permission gate client (OR logic, superadmin bypass)
├── config/settings.ts             # Env terpusat (auth, oauth, GA, trustedOrigins)
├── config/prisma.ts               # Singleton Prisma + dual adapter (libsql/pg pool, sslmode verify-full)
├── hooks/                         # use-auth use-users use-roles use-platform use-calendars use-notifications use-api-keys
├── lib/
│   ├── auth-client.ts             # Better Auth client (username + customSession)
│   ├── activity.ts notifications.ts  # Audit & notif helpers
│   ├── password.ts sessions.ts cookie.ts
│   ├── api.ts                     # Fetch client frontend → /api + toast + 401/403/429 handling
│   ├── metadata.ts socials.ts calendar.ts image-upload.ts
│   ├── pagination.ts fields.ts idempotency.ts request-id.ts
│   └── log-format.ts locale-server.ts utils.ts
├── middlewares/                   # index re-export
│   ├── auth.ts                    # Better Auth server, customSession roles+permissions
│   ├── apikeys.ts rate-limit.ts   # API key utils + Edge/proxy rate limiter
│   ├── rbac.ts                    # requireAuth() + requireApiKey() fallback, cache 30 dtk
│   ├── request-handler.ts         # Validasi Zod { params?, query?, body? } (JSON + multipart), details[]
│   └── response-handler.ts        # Envelope standar + paginated/created/422/dst.
├── validations/auth.ts platform.ts user.ts index.ts
├── i18n/routing.ts navigation.ts request.ts  # locales ["id","en"], default "en"
├── proxy.ts                       # Edge: /api request-id+rate-limit; locale redirect; guard /dashboard & /login|/register + REGISTER toggle
└── styles/globals.css
prisma/
├── schema.prisma                  # datasource sqlite tanpa url (URL dari prisma.config.ts); Platform Social User Session Account Verification Role UserRole RolePermission ApiKey Notification Calendar CalendarAssignment ActivityLog
└── seed/index.ts platform.ts permissions.ts users.ts
test/                               # bun test: fields hash idempotency log-format utils seed-args api-contract
```

## API Overview

Semua respons memakai envelope `ResponseHandler`:

```json
{ "success": true, "message": "OK", "data": { "items": [], "pagination": {} }, "code": "OK", "requestId": "..." }
```

- **Auth** — `POST /api/auth/*` (Better Auth handler), `GET /api/auth/me`, `POST /api/auth/reset-password`, `GET/DELETE /api/auth/social-accounts/[id]`
- **Users** — CRUD by id + `?search=&sort=&order=&isAdmin=` (butuh `users:admin` untuk field sensitif), `POST /users/[id]/reset-password`, `GET /users/logs` (`logs:read`), sessions (`sessions:read/revoke`)
- **Roles & Permissions** — CRUD role (`roles:*`), `GET /users/roles/permissions` katalog (`permissions:read`)
- **Platform** — `GET /platform` publik, `PUT` (`platform:update`), `GET/PUT /platform/privacy|terms`, CRUD `/platform/social` + `PUT /platform/social/order` (`social:create/update/delete`)
- **Calendar** — CRUD + assignment (`GET /calendar`, `POST/PUT/DELETE /calendar/[id]`)
- **Notifications** — `GET /notifications`, `PUT /notifications/[id]/read`, `PUT /notifications/read-all`, `POST /notifications/broadcast` (`notifications:broadcast`)
- **API Keys** — `GET/POST /api-keys` (`keys:read/create`), `PUT/DELETE /api-keys/[id]` (`keys:update/delete`); key mentah hanya terlihat sekali saat create

Pattern route handler baru:

```ts
const parsed = await RequestHandler.validateRequest(schema, req, params)
if (parsed instanceof NextResponse) return parsed
const { error, session } = await requireAuth({ permissions: ["users:update"] })
if (error) return error
return ResponseHandler.success("OK", data, { requestId: req.headers.get("x-request-id") })
```

## Permission Catalog (seeded, `prisma/seed/permissions.ts`)

```
Platform: platform:read, platform:update, social:create, social:update, social:delete
Users:    users:create, users:update, users:delete, users:admin
Roles:    roles:read, roles:create, roles:update, roles:delete
Permissions: permissions:read
Sessions: sessions:read, sessions:revoke
Logs:     logs:read
Notifications: notifications:broadcast
API Keys: keys:read, keys:create, keys:update, keys:delete
```

Konvensi aksi: `read/update` (jangan `view/edit`). Katalog = baris `RolePermission` dengan `roleId NULL`; grant per-role menunjuk `roleId`. Permission yang tak pernah dicek kode tidak masuk katalog; seed menghapus legacy (`sessions:view`, `logs:view`, `platform:admin`, `roles:admin`, `users:read`) otomatis.

## Environment Variables

| Key | Keterangan |
|-----|------------|
| `DATABASE_URL` | `file:./prisma/dev.db` (SQLite) atau `postgresql://...` (adapter dipilih dari prefix `file:`) |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `BETTER_AUTH_TRUSTED_ORIGINS` | Secret, base URL, origins tambahan (comma-separated, utk tunnel `*.trycloudflare.com,*.ngrok-free.app`) |
| `NEXT_PUBLIC_ALLOW_REGISTER` | `"false"` mematikan `/register` (redirect ke login). Default on |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | Rate limit edge per IP, default `120` / `60000`. In-memory — untuk prod multi-instance ganti Redis/Upstash |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH`, `GOOGLE_CLIENT_ID/SECRET` | Toggle + kredensial OAuth Google |
| `NEXT_PUBLIC_ENABLE_GITHUB_AUTH`, `GITHUB_CLIENT_ID/SECRET` | Toggle + kredensial OAuth GitHub |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GOOGLE_VERIFICATION` | SEO/analytics (`@next/third-parties`) |

Lihat `.env.example` sebagai sumber kebenaran. (Catatan: `NEXT_PUBLIC_DEFAULT_LOCALE` yang disebut di docs lama **tidak dipakai** — default locale `en` di-hardcode di `src/i18n/routing.ts`.)

## Git Hooks & CI

- `pre-commit` → lint-staged: `biome check --write` untuk `*.{ts,tsx,mjs,css,json,md}` + **`bunx tsc --noEmit`** untuk `*.{ts,tsx}` (bukan full `next build`)
- `commit-msg` → commitlint Conventional Commits (`feat fix chore docs style refactor perf test build ci revert`, tanpa batas panjang header)
- CI (`.github/workflows/ci.yml`): `bun install --frozen-lockfile` → `db:generate` → `lint` → `build`. Deploy (`deploy.yml`): push ke `prod` → pull + build + `pm2 restart` di self-hosted runner

## Deployment

**Docker** (multi-stage Bun, user non-root `nextjs`):

```bash
docker build --build-arg DATABASE_URL="postgresql://..." -t portonext .
docker run -p 3000:3000 --env-file .env portonext
```

> `ARG DATABASE_URL` dibutuhkan saat build karena `db:generate`/build Next membaca env.

**Vercel** — Connect repo, tambah env vars, deploy. Untuk Postgres (Neon/Supabase) pastikan `DATABASE_URL` memakai `sslmode=verify-full` (ditambahkan otomatis oleh `src/config/prisma.ts` jika belum ada).

## License

MIT — Use freely for your projects.
