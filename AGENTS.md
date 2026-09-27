# AGENTS.md — Dashboard-BITools

Next.js 16 (App Router, TypeScript) full-stack **BI dashboard**: admin panel + query engine (gRPC) + visual dashboard builder. Paket masih bernama `nextjs-template` — ganti saat clone.

## Commands (use `bun`, never npm — bun.lock, Docker/CI frozen)

- `bun run dev` — dev server (Turbopack)
- `bun run build` — `next build` saja (BUKAN typecheck gate)
- `bun run typecheck` — `tsc --noEmit` (dipakai lint-staged)
- `bun run lint` / `lint:fix` — `biome check [--write] src/ test/ prisma/`
- `bun run check-unused` — `knip` (dijalankan hook `pre-push`; WAJIB bersih)
- `bun test` — Bun test, suite di `test/` (api-contract, attachments, fields, hash, idempotency, log-format, sort, utils)
- `bun run analyze` — bundle-analyzer build
- DB (Prisma 7): `db:generate` `db:push` (dev) `db:migrate` `db:studio` `db:reset`; `db:seed -- [flags]` — parser + entry `prisma/seed/index.ts` (logika di `permissions.ts`/`users.ts`, urutan permissions → users). Nilai hardcoded di file seed; flag: `--permissions|--users`, `--only/--skip`, `--admin-*`, `--user-*`, `--no-system-user`, `--dry-run`, `--help`, `--list`.
- Engine (Python): `cd engine && uv sync --frozen && uv run python -m src.server` (gRPC, default port 50051)

## Git Hooks

- `pre-commit` → lint-staged: `biome check --write` untuk `*.{ts,tsx,mjs,css,json,md}` DAN `bunx tsc --noEmit` untuk `*.{ts,tsx}`.
- `pre-push` → `bun run check-unused` (knip). Tembolok push kalau ada devDep/ekspor mati.
- `commit-msg` → commitlint Conventional Commits; types: `feat fix chore docs style refactor perf test build ci revert`.
- CI: install frozen → `db:generate` → `lint` → `build`. Deploy: push `prod` → self-hosted `pm2 restart`.

## Env & DB

- `.env` required, gitignored. `.env.example` = sumber kebenaran daftar env (jangan tambah key baru hanya di docs — perbarui keduanya). `prisma.config.ts` load dotenv & supply `DATABASE_URL`; `schema.prisma` datasource tanpa url (env only).
- App: `DATABASE_URL` (`file:` → SQLite/libsql, `postgresql:` → pg pool; `sslmode` **tidak** di-auto-append — caller wajib tulis sendiri di connection string), `BETTER_AUTH_SECRET/URL/TRUSTED_ORIGINS`, `NEXT_PUBLIC_ALLOW_REGISTER`, `RATE_LIMIT_MAX/WINDOW_MS` (in-memory edge, single-instance), `NEXT_PUBLIC_ENABLE_GOOGLE/GITHUB_AUTH` + `GOOGLE/GITHUB_CLIENT_ID/SECRET`. `NEXT_PUBLIC_GA_ID/GTM_ID/GOOGLE_VERIFICATION` **tidak dibaca kode mana pun** — jangan set sia-sia.
- BI: `QUERY_ENGINE_HOST` (default `localhost:50051`), `QUERY_MAX_ROWS` (1000), `QUERY_TIMEOUT_SEC` (30), `RUN_RATE_LIMIT_MAX` (30), `RUN_RATE_LIMIT_WINDOW_MS` (60000), `DATA_DIR` (default `<cwd>/data`), `UPLOADS_MAX_BYTES` (10 MB), `ATTACHMENTS_MAX_SIZE`, `S3_*`.
- Engine (`engine/src/config.py`): `QUERY_ENGINE_PORT` (50051), `REDIS_URL`, `INTROSPECT_SCHEMAS` (comma; kosong = semua schema non-sistem), `INTROSPECT_MAX_OBJECTS` (500), `DB_POOL_SIZE/DB_MAX_OVERFLOW`, `FETCH_MAX_BYTES`, `QUERY_CACHE_MAX_BYTES`, `FILE_*`, `SHEETS_PAGE_ROWS`.
- `NEXT_PUBLIC_DEFAULT_LOCALE` TIDAK dipakai — default `en` hardcoded di `src/i18n/routing.ts`.
- Seed: user `system` (`id="system"`, lewati via `--no-system-user`). Password hardcoded di `users.ts` (min 6) — ganti setelah seed pertama di production.

## Architecture

- **Pages** (dashboard di root, TANPA prefix locale): `(auth)/login|register` · `(dashboard)/` = page, profile, calendar, api-keys, attachment, storage, users, roles, sessions, logging · `(dashboard)/sources|datasets|dashboards` (BI) · `(admin)/` route group tanpa segmen URL · `bi/[id]` viewer dashboard publik (**tanpa session**).
- `src/proxy.ts` (Next 16: middleware → proxy, Edge): `/api/*` → suntik `x-request-id` + rate-limit per IP + header `X-RateLimit-*`; halaman → suntik `x-locale`, exempt `/bi/*`, guard session untuk semua halaman lain kecuali `/login|/register`, redirect user login, toggle `NEXT_PUBLIC_ALLOW_REGISTER`.
- API path stabil `/api/*` tanpa versioning. Envelope `{ success, message, data, code, requestId? }`, pagination `{ page, limit, total, total_pages, has_more }`, `?fields=`, `Idempotency-Key` (POST). Kontrak di `test/api-contract.test.ts`.
- Auth (`src/middlewares/auth.ts`): Better Auth v1.7, adapter Prisma, email+password (Argon2id), plugin `username` + `customSession` (inject `roles/permissions/isSuperAdmin`) + `nextCookies()` terakhir; sesi 30 hari; `generateId: ulid()`.
- RBAC (`middlewares/rbac.ts`): `requireAuth({ permissions })` cek OR, cache 30 dtk, superadmin bypass. Tanpa cookie tapi ada `X-API-Key` → `requireApiKey()` (hash `argon2id(salt + raw)`, lookup prefix 8 char, hak = permission pemilik).
- `RequestHandler.validateRequest(schema, req, params)`: `{ params?, query?, body? }` (JSON + multipart), error → `400 { details: [{field,message,code}] }`. `ResponseHandler`: `success/paginated/created/noContent/badRequest/unprocessable/unauthorized/forbidden/notFound/conflict/tooManyRequests/internalError`.
- Frontend: `lib/api.ts` → `/api`, **timeout 10s default dengan override `timeoutMs` per-request**, toast sonner utk non-GET, event `auth:unauthorized/forbidden` saat 401/403; `Providers.tsx` (QueryClient + ThemeProvider + sonner + LanguageSync); `<Protected permissions>` OR-gate client.
- Tema: `components/theme-provider.tsx` (custom, next-themes sengaja tidak dipakai). Anti-FOUC pakai **`next/script` + `strategy="beforeInteractive"`** di `app/layout.tsx` — JANGAN balik ke `<script dangerouslySetInnerHTML>`, React 19 akan memunculkan "Encountered a script tag while rendering".

### Halaman yang BUKAN di route group dashboard → butuh `NextIntlClientProvider` sendiri

`Providers` memanggil `useLocale()`, jadi halaman yang render `Providers` di luar `(dashboard)`/`(auth)` **wajib** dibungkus provider (lihat `src/app/bi/layout.tsx`). Tanpa itu: runtime error "No intl context found".

## Modul BI

- **Engine** (Python, `engine/`): server gRPC `QueryEngine` di `proto/engine.proto` — `Execute`, `ExecuteStream`, `GetSchema`, `TestConnection`, `InvalidateCache`. Klien: `src/lib/engine.ts` + tipe generate `src/lib/grpc/**` (biome & knip **ignore** folder ini).
- **Introspeksi** (`engine/src/introspector.py`): schema sistem (`information_schema`/`pg_catalog`/`pg_toast`) **selalu dilewati** — view katalog di sana ~1,7s per objek sehingga `GetSchema` timeout pada DB besar. Persempit via `INTROSPECT_SCHEMAS`.
- **Tipe source** (`src/validations/source.ts`): `postgresql|mysql|mariadb|mssql|sqlite|clickhouse|bigquery|mongodb|api|file`, tiap tipe punya schema config sendiri (validasi via `superRefine`).
- **Hooks**: `use-sources` (CRUD, test, schema, upload chunked) · `use-datasets` (CRUD, run, run-batch) · `use-dashboards` (CRUD dashboard/panel/filter/member/public + `usePublicDashboard`) · `use-panel-data` (batch + fallback per-panel, hormati filter global) · `use-panel-editor` (state editor panel) · `use-dashboard-filters` (context filter dashboard).
- **Komponen**: `components/charts/` (EChart/KPI/Table/Pivot/Text/Filter) · `components/dashboard/` (grid drag-drop, viewer, panel-title, run-meta) · `components/editor/` (sidebar config chart, palet dataset, axis-drop, preview) · `components/sources/` (Database Explorer: Monaco query-editor, schema-sidebar, schema-erd, source-form) · `components/bi/ResultTable.tsx`.
- **Halaman**: `/sources` (tabel + form) · `/sources/[id]` (**Database Explorer**: sidebar schema + tab tabel/query/ERD, Monaco SQL dengan Ctrl+Enter, upload chunked) · `/datasets`, `/datasets/new`, `/datasets/[id]` (editor SQL + run) · `/dashboards`, `/dashboards/new`, `/dashboards/[id]`, `/dashboards/[id]/edit` (visual editor) · `/bi/[id]` (viewer publik).
- **Viewer publik**: `proxy.ts` exempt `/bi/*`; data diambil dari `GET /api/public/dashboards/[id]` (tanpa `requireAuth`, hanya `isPublic: true`, non-publik → **404** bukan 403, panel tanpa `dataSetId` difilter, field dibatasi eksplisit). **Data panel tetap butuh session/API key** karena `run-batch` mengeksekusi SQL — jangan pernah membuat endpoint run publik.
- **Editor publik & loop**: `dashboard-viewer`/`use-panel-data` wajib memoize array `panels` (dependensi efek `[panels]`) — identitas baru tiap render ⇒ request loop tanpa batas.

## Conventions

- Path alias `@/*` → `src/*` (+ `prisma/generated/client/*`).
- Tailwind v4 + shadcn/ui New York (`components.json`, `src/styles/globals.css`).
- Forms: React Hook Form + Zod v4. State: TanStack Query v5, no client global store.
- Schema change: edit `prisma/schema.prisma` → `bun run db:generate` (+ `db:push`/`db:migrate`).
- IDs: ULID default (`ulid()`) untuk semua model.
- Security headers di `next.config.ts`, `removeConsole` prod, `optimizePackageImports`.
- **knip harus bersih**: jangan tambah ekspor tanpa konsumen. `ignoreExportsUsedInFile: true` untuk query-key factory/helper internal; `ignore` untuk `components/ui/**` + `lib/grpc/**` (generate). Kalau sebuah ekspor memang API modul yang sengaja (mis. `engine.ts#executeStream` yang membungkus RPC), pakai `ignoreIssues` dengan komentar alasannya — jangan diam-diam dihapus.
- Dockerfile multi-stage Bun: `ARG DATABASE_URL` utk generate+build; runner non-root `bun` (uid 1000 — `oven/bun:1` tak punya `adduser`).
- `.dockerignore` root WAJIB ada: tanpa itu `node_modules`/`.next` ikut build context dan `.env` bisa ter-bake ke image. `engine/Dockerfile` build context **harus `./engine`**.
- Compose (`docker-compose.yml`): `db` + `redis` + `engine` + `app` (+ profile `dev`/`test`). `app` & `engine` **wajib share volume `data`** — app tulis upload ke `DATA_DIR`, engine baca dari folder sama dan validasi path di dalamnya. `QUERY_ENGINE_HOST=engine:50051` (bukan localhost).

## Permission Catalog (seeded — `prisma/seed/permissions.ts`)

```
BI Tools:   sources:read, sources:create, sources:update, sources:delete
            datasets:read, datasets:create, datasets:update, datasets:delete
            dashboards:create, dashboards:update, dashboards:delete, dashboards:admin
Storage:    attachments:read, attachments:create, attachments:update, attachments:delete, attachments:admin
Users:      users:create, users:update, users:delete, users:admin
Roles:      roles:read, roles:create, roles:update, roles:delete
Permissions: permissions:read
Sessions:   sessions:read, sessions:revoke
Logs:       logs:read
Notifications: notifications:broadcast
API Keys:   keys:read, keys:create, keys:update, keys:delete
```

Konvensi aksi: `read/update` (jangan `view/edit`). Katalog = baris `RolePermission` dengan `roleId NULL`; grant per-role menunjuk `roleId`. `dashboards` **tidak punya `:read`** — list/detail hanya butuh login (`requireAuth()` tanpa permission), mutasi butuh `dashboards:update`, publikasi & member butuh `dashboards:admin`. Seed menghapus legacy (`platform:*`, `social:*`, `sessions:view`, `logs:view`, `roles:admin`, `users:read`) otomatis. Super Admin (`isSuperAdmin: true`) bypass all checks.

## Adding Features

1. **New API route** — `src/app/api/*/route.ts`: `RequestHandler.validateRequest` (return langsung jika `NextResponse`) + `requireAuth({ permissions })` + `ResponseHandler.*` (teruskan `requestId` dari header).
2. **New permission** — tambah ke `FEATURE_REGISTRY` di `prisma/seed/permissions.ts` → `bun run db:seed -- --only permissions` → pakai di `requireAuth` dan `<Protected permissions>`.
3. **New page** — di dalam `src/app/(dashboard)/` (route group) agar dapat `Providers` + intl + guard session. Halaman di luar route group wajib bungkus `NextIntlClientProvider` sendiri.
4. **New UI component** — `components/ui/` (shadcn), `components/bi|dashboard|editor|charts|sources/` (domain BI), atau `components/atoms|shared/`; fetch via `hooks/use-*.ts`.
5. **Request lambat** — endpoint BI (schema/run) perlu `timeoutMs` eksplisit di `api.post/get`; default 10s tidak cukup untuk DB remote.
