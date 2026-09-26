# AGENTS.md — PortoNext Boilerplate

Next.js 16 (App Router, TypeScript) full-stack **boilerplate/template** for company profiles, portfolios, and admin dashboards. `package.json` name saat ini `nextjs-template` — ganti saat clone.

## Commands (use `bun`, never npm — bun.lock, Docker/CI frozen)

- `bun run dev` — dev server (Turbopack)
- `bun run build` — `next build` saja (BUKAN typecheck gate)
- `bun run typecheck` — `tsc --noEmit` (ini yang dipakai lint-staged)
- `bun run lint` / `lint:fix` — `biome check [--write] src/ test/ prisma/`
- `bun test` — Bun test, suite ADA di `test/` (fields, hash, idempotency, log-format, utils)
- `bun run analyze` — bundle-analyzer build
- DB (Prisma 7): `db:generate` `db:push` (dev) `db:migrate` `db:studio` `db:reset`; `db:seed -- [flags]` — parser + entry satu file `prisma/seed/index.ts` (logika di `platform.ts`/`permissions.ts`/`users.ts`, urutan platform → permissions → users). Nilai hardcoded di file seed (bukan env); flag override: `--platform|--permissions|--users`, `--only/--skip`, `--platform-*`, `--admin-*`, `--user-*`, `--force-platform`, `--no-system-user`, `--dry-run`, `--help`, `--list`. Prioritas: CLI > hardcoded.

## Pre-commit (husky)

- `pre-commit` → lint-staged: `biome check --write` untuk `*.{ts,tsx,mjs,css,json,md}` DAN `bunx tsc --noEmit` untuk `*.{ts,tsx}`. Bukan full `next build`.
- `commit-msg` → commitlint Conventional Commits; types: `feat fix chore docs style refactor perf test build ci revert` (tanpa batas panjang header).
- CI (`ci.yml`): install frozen → `db:generate` → `lint` → `build`. Deploy (`deploy.yml`): push `prod` → self-hosted `pm2 restart`.

## Env & DB

- `.env` required, gitignored. `prisma.config.ts` loads dotenv dan supply `DATABASE_URL` — `schema.prisma` datasource `sqlite` tanpa url; env only. `.env.example` = sumber kebenaran.
- Keys: `DATABASE_URL` (`file:` → SQLite/libsql dev, `postgresql:` → Postgres prod via `pg` pool, `sslmode=verify-full` auto-append), `BETTER_AUTH_SECRET/URL/TRUSTED_ORIGINS`, `NEXT_PUBLIC_ALLOW_REGISTER`, `RATE_LIMIT_MAX/WINDOW_MS` (in-memory edge, single-instance only), `NEXT_PUBLIC_ENABLE_GOOGLE/GITHUB_AUTH` + `GOOGLE/GITHUB_CLIENT_ID/SECRET`, `NEXT_PUBLIC_GA_ID/GTM_ID/GOOGLE_VERIFICATION`. (Seed tidak pakai env — hardcoded di `prisma/seed/`.)
- `NEXT_PUBLIC_DEFAULT_LOCALE` TIDAK dipakai — default locale `en` hardcoded di `src/i18n/routing.ts` (locales `["id","en"]`, `localePrefix: always`).
- Seed: platform merge-only (hanya override field yg diisi CLI; `--force-platform` tulis ulang semua); permissions hapus legacy otomatis; users + user `system` (`id="system"`, lewati via `--no-system-user`). Password seed hardcoded di `users.ts` (min 6) — ganti setelah seed pertama di production.

## Architecture

- Pages: `/` → redirect `/{locale}`; publik `[locale]/` (home/about/contact/privacy/terms); auth tanpa locale `(auth)/login|register`; proteksi `dashboard/` (profile, calendar, api-keys) + route group `(admin)/` tanpa segmen URL (platform, users, roles, sessions, logging). URL lama `/dashboard/admin/*` di-redirect permanen di `next.config.ts`. SEO: `sitemap/robots/manifest/opengraph-image`.
- API path stabil `/api/*` tanpa versioning (sengaja dicabut). Envelope `{ success, message, data, code, requestId? }`, pagination `{ page, limit, total, total_pages, has_more }` + cursor `{ next_cursor, has_more }` (notifikasi), `?fields=`, `Idempotency-Key` (POST). Kontrak diuji di `test/api-contract.test.ts` (envelope, validasi, pagination, rate-limit, request-id).
- `src/proxy.ts` (Next 16: middleware → proxy, Edge): `/api/*` → suntik `x-request-id`, rate-limit per IP + header `X-RateLimit-*`; halaman → locale redirect (cookie `locale` → Accept-Language → default), guard `/dashboard` via session cookie, redirect user login dari `/login|/register`, toggle `NEXT_PUBLIC_ALLOW_REGISTER`. Matcher: `/api/:path*` + semua halaman kecuali `_next`/file statis.
- Auth (`src/middlewares/auth.ts`): Better Auth v1.7, adapter Prisma (`sqlite`/`postgresql` dari prefix `file:`), email+password (Argon2id `@node-rs/argon2` override, min 6), plugin `username` + `customSession` (inject `roles/permissions/isSuperAdmin` ke sesi — spread full object balik, query inline hindari cycle auth↔rbac) + `nextCookies()` WAJIB terakhir; `accountLinking.allowDifferentEmails: false`; sesi 30 hari; `generateId: ulid()`; `databaseHooks` log CREATE user + notif welcome.
- RBAC (`middlewares/rbac.ts`): `requireAuth({ permissions })` — cek OR (satu cukup), cache Map per-proses 30 dtk (`fetchAndCachePermissions`), tolak user non-aktif/soft-deleted, superadmin bypass. Tanpa cookie tapi ada `X-API-Key` → `requireApiKey()`: verifikasi `argon2id(salt + raw)`, lookup prefix 8 char, tolak expired/non-aktif/`isRestfull=false`, hak = permission pemilik, `touchApiKey` fire-and-forget.
- API Keys (`src/middlewares/apikeys.ts`): format `sk_<64 hex>` (`pk_` legacy diterima), tampil sekali saat create; flag `isRestfull`/`isMCP`.
- Models: `Platform(singleton "default")+Social(orderable)`, `User(Session,Account,UserRole)`, `Role-ULID/UserRole-ULID/RolePermission-ULID(katalog roleId null + grant per-role)`, `ApiKey(prefix/keyHash/keySalt, soft-delete)`, `Notification(+calendarId)`, `Calendar(+assignments)`, `ActivityLog(action/entity/entityId/metadata/ip/userAgent)`, soft-delete `User/ApiKey.deletedAt`.
- `RequestHandler.validateRequest(schema, req, params)`: envelope `{ params?, query?, body? }` (JSON + multipart), error → `400 { details: [{field,message,code}], ...legacy }`. `ResponseHandler`: `success/paginated/created/noContent/badRequest/unprocessable/unauthorized/forbidden/notFound/conflict/tooManyRequests/internalError` (stack hanya non-prod).
- Frontend: `lib/api.ts` → `/api`, timeout 10s, toast sonner utk non-GET, event `auth:unauthorized/forbidden` + clear storage (kecuali theme) saat 401; `Providers.tsx` (QueryClient + ThemeProvider + sonner); `<Protected permissions>` OR-gate client. Tema via `components/theme-provider.tsx` (custom, tanpa `<script>` — next-themes sengaja tidak dipakai karena memicu React 19 error "script tag while rendering"; anti-FOUC oleh script `<head>` di `app/layout.tsx`).

## Conventions

- Path alias `@/*` → `src/*` (+ `prisma/generated/client/*`).
- Tailwind v4 + shadcn/ui New York (`components.json`, css `src/styles/globals.css`), `tw-animate-css`.
- Forms: React Hook Form + Zod v4. State: TanStack Query v5 (`src/hooks/use-*`), no client global store.
- Schema change: edit `prisma/schema.prisma` → `bun run db:generate` (+ `db:push`/`db:migrate` sesuai env).
- IDs: ULID default (`ulid()`) untuk semua model; `Account/Session/Verification` dari Better Auth (`generateId: ulid()`).
- Security headers di `next.config.ts` (nosniff, referrer, permissions-policy), `removeConsole` prod, `optimizePackageImports`, image remote `https: **`, redirects (favicon, manifest, sessions/logging lama).
- Dockerfile multi-stage Bun: `ARG DATABASE_URL` utk generate+build; runner non-root `nextjs`, copy `.next/public/node_modules/prisma`.

## Permission Catalog (seeded — `prisma/seed/permissions.ts`)

```
Platform: platform:read, platform:update,
          social:create, social:update, social:delete
Users:    users:create, users:update, users:delete, users:admin
Roles:    roles:read, roles:create, roles:update, roles:delete
Permissions: permissions:read
Sessions: sessions:read, sessions:revoke
Logs:     logs:read
Notifications: notifications:broadcast
API Keys: keys:read, keys:create, keys:update, keys:delete
```
Konvensi aksi: `read/update` (jangan `view/edit`). Permission yang tak pernah
dicek kode tidak dimasukkan katalog; seed menghapus legacy
(`sessions:view`, `logs:view`, `platform:admin`, `roles:admin`, `users:read`) otomatis.
Super Admin (`isSuperAdmin: true`) bypasses all checks.

## Adding Features

1. **New API route** — `src/app/api/*/route.ts`: `RequestHandler.validateRequest` (return langsung jika `NextResponse`) + `requireAuth({ permissions })` + `ResponseHandler.*` (teruskan `requestId` dari header).
2. **New permission** — tambah ke `FEATURE_REGISTRY` di `prisma/seed/permissions.ts` → `bun run db:seed` → pakai di `requireAuth` dan `<Protected permissions>`.
3. **New page** — publik di `src/app/[locale]/`, auth di `src/app/(auth)/`, proteksi di `src/app/dashboard/`; gate UI dengan `<Protected permissions={["perm:name"]}>` (OR logic).
4. **New UI component** — `components/ui/` (shadcn) atau `components/atoms|shared/`; fetch via `hooks/use-*.ts` (TanStack Query) ke `lib/api.ts` (`/api`).
