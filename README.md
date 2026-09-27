# Dashboard-BITools

[![CI](https://github.com/wildan14ar/Dashboard-BITools/actions/workflows/ci.yml/badge.svg)](https://github.com/wildan14ar/Dashboard-BITools/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Full-stack **Business Intelligence dashboard**: hubungkan database/API/file, tulis query tersimpan, lalu rakit menjadi dashboard visual yang bisa dibagikan lewat link publik.

Next.js 16 (App Router, RSC, Edge proxy) + TypeScript + Bun, dengan **query engine** Python di atas gRPC.

> Catatan nama paket: `package.json` masih bernama `nextjs-template` — ganti `name` saat clone untuk proyek baru.

## Kontribusi

Kontribusi sangat welcome — baik PR, issue, maupun perbaikan dokumentasi. Mulai dari
[CONTRIBUTING.md](CONTRIBUTING.md). Interaksi tunduk pada
[Code of Conduct](CODE_OF_CONDUCT.md). Kerentanan keamanan dilaporkan lewat
[SECURITY.md](SECURITY.md), **bukan** issue publik.

## Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.3, React 19, TypeScript 5.9, App Router |
| **Runtime** | Bun (package manager + runtime, `bun.lock`) |
| **Database** | Prisma 7 — SQLite (dev) / PostgreSQL (prod, `pg` pool) |
| **Query Engine** | Python 3.14 + `uv`, gRPC (`grpcio` + `SQLAlchemy`) |
| **Auth** | Better Auth v1.7 (credentials + OAuth Google/GitHub) + Argon2id |
| **UI** | Tailwind v4 + shadcn/ui (New York) + Radix, `sonner`, `motion`, `lucide-react` |
| **Charts/Grid** | `echarts` + `echarts-for-react`, `react-grid-layout`, `@xyflow/react` (ERD) |
| **SQL Editor** | `@monaco-editor/react` (Ctrl+Enter run) |
| **State** | TanStack Query v5 (server state, tanpa global store) |
| **Forms** | React Hook Form + Zod v4 |
| **i18n** | next-intl v4 (`id`, `en`) |
| **Lint/Format** | Biome v2 + Knip (dead-code gate saat push) |
| **Git Hooks** | Husky + lint-staged + commitlint |

## Features

### BI Tools

- **Sources** — 10 tipe koneksi: PostgreSQL, MySQL, MariaDB, SQL Server, SQLite, ClickHouse, BigQuery, MongoDB, REST API, dan File (CSV/XLSX/Google Sheets). Config divalidasi per tipe via Zod. Test koneksi sebelum simpan.
- **Database Explorer** (`/sources/[id]`) — sidebar schema searchable, Monaco SQL editor dengan **Ctrl+Enter** untuk run, sistem tab (tab tabel auto-run / query bebas / ERD), drag-drop dataset ke kanvas, dan upload file **chunked 5 MB**.
- **ERD** — diagram relasi React Flow; node tabel menampilkan kolom + tipe + badge PK/FK, garis panah untuk setiap foreign key.
- **Datasets** — query tersimpan di atas sebuah source, lengkap dengan editor split (SQL ↔ hasil) dan toggle cache.
- **Dashboards** — visual editor drag-drop (12 kolom grid) dengan 7 tipe chart: Text, KPI, Table, Table (pivot), Bar, Line, Pie, plus panel Filter. Konfigurasi per panel: judul (posisi/align/style/warna/ukuran), padding, orientasi bar, donut thickness, kolom tabel, sumbu pivot, dan agregasi.
- **Panel filter** — `date_range` & `enum`, diteruskan ke dataset sebagai params (backend wajib pakai `{{COLUMN}}` binding).
- **Dashboard publik** (`/bi/[id]`) — bisa dibagikan tanpa login; dilindungi flag `isPublic` (bukan publik → 404).
- **Rate limit khusus run** — `RUN_RATE_LIMIT_MAX` per user, terpisah dari limit global API.

### Platform

- **Authentication** — Email/password + username (plugin `username`), OAuth Google/GitHub, account linking, sesi 30 hari, reset password, kelola social accounts.
- **RBAC** — katalog permission yang di-seed; Super Admin bypass semua cek; cek OR; cache 30 detik per proses.
- **API Keys (server-to-server)** — format `sk_<64 hex>`, header `X-API-Key`, hash `argon2id(salt + raw)`, lookup via prefix 8 char; hak key = permission pemilik.
- **File & Storage** — attachment (kuota ukuran per env) + backend S3-compatible opsional.
- **Kalender & Notifikasi** — event (all-day, repeat, warna, holiday), assignment per user, broadcast notifikasi.
- **Audit Trail** — `ActivityLog` + `Notification` (fire-and-forget, ada user `system` agar FK log sistem valid).
- **API konvensi Postman** — envelope `{ success, message, data, code, requestId? }`, `code` stabil, pagination + cursor, `?fields=` sparse fieldset, `Idempotency-Key` untuk POST, path stabil tanpa versioning, rate-limit edge per IP, `x-request-id` end-to-end, HSTS + CSP di production.

## Quick Start

```bash
# 1. Install deps (jangan npm — Dockerfile & CI pakai frozen lockfile Bun)
bun install

# 2. Setup env
cp .env.example .env          # isi DATABASE_URL & BETTER_AUTH_SECRET
bun run db:generate
bun run db:push
bun run db:seed
```

Akun seed: `admin` / `admin@example.com` dengan password `admin123` (Super Admin).
Override tanpa mengedit kode:

```bash
bun run db:seed -- --admin-password "S3cret!" --user-password "An0ther!"
```

**Ganti password seed sebelum production.**

```bash
# 4. Jalankan query engine (terminal terpisah, wajib untuk fitur BI)
cd engine
uv sync --frozen
uv run python -m src.server     # gRPC di :50051

# 5. Dev server
bun run dev
```

> Redis untuk engine bersifat **opsional**. Kalau tidak jalan, engine tetap serve
> query — hanya cache schema/result yang nonaktif (log: `Redis unavailable, cache
> disabled`). Nyalakan agar load berikutnya instan di sisi server juga.

## Commands

```bash
bun run dev            # Dev server (Turbopack)
bun run build          # next build
bun run typecheck      # tsc --noEmit (dijalankan lint-staged)
bun run lint / lint:fix
bun run check-unused   # knip — WAJIB bersih, hook pre-push memblokir
bun test               # suite di test/
bun run analyze        # bundle-analyzer build

# Database
bun run db:generate / db:push / db:migrate / db:studio / db:reset
bun run db:seed                                  # permissions → users
bun run db:seed -- --only permissions            # sync katalog permission saja
bun run db:seed -- --admin-password "S3cret!"    # override user admin
bun run db:seed -- --help                        # semua flag

# Query engine
cd engine && uv sync --frozen && uv run python -m src.server
```

## Project Structure

```
src/app/
├── layout.tsx                  # <html>/<body> + Script beforeInteractive (anti-FOUC theme)
├── (auth)/login/register      # auth, tanpa prefix locale
├── (dashboard)/                # route group privat (session guard + intl + Providers)
│   ├── page.tsx profile/ calendar/ api-keys/ attachment/
│   ├── (admin)/users roles sessions logging storage
│   ├── sources/                # + [id] = Database Explorer
│   ├── datasets/               # + new + [id] editor SQL
│   └── dashboards/             # + new + [id] + [id]/edit
├── bi/[id]/                    # viewer dashboard PUBLIK (tanpa session)
└── api/
    ├── auth/ users/ calendar/ notifications/ api-keys/ attachments/
    ├── sources/                # CRUD + test, schema, run, upload chunked
    ├── datasets/               # CRUD + run + run-batch
    ├── dashboards/             # CRUD + panels, filters, members, public
    └── public/dashboards/[id]  # SATU-SATUNYA endpoint tanpa requireAuth

src/components/
├── ui/                         # shadcn/ui (New York)
├── charts/                     # EChart, KPI, Table, TablePivot, Text, Filter
├── dashboard/                  # grid drag-drop, viewer publik, panel-title, run-meta
├── editor/                     # sidebar config chart, palet dataset, axis-drop, preview
├── sources/                    # query-editor (Monaco), schema-sidebar, schema-erd, source-form
├── bi/                         # ResultTable
├── atoms/ shared/              # ButtonLogout, ButtonTheme, ConfirmDialog, dll
├── Sidebar.tsx DashboardShell.tsx NotificationBell.tsx Protected.tsx Providers.tsx

src/hooks/                      # use-sources use-datasets use-dashboards use-panel-data
                                # use-panel-editor use-dashboard-filters + use-auth dll
src/lib/
├── api.ts                      # fetch client: timeoutMs per-request, toast, 401/403/429
├── engine.ts                   # Klien gRPC (execute/getSchema/testConnection/invalidateCache)
├── chart.ts                    # buildChartOption + aggregate (ECharts option)
├── rate-limit.ts               # rate limit khusus endpoint run
└── grpc/                       # TIPE GENERATE proto-loader (biome + knip ignore)

engine/                         # Query engine (Python 3.14, uv)
├── src/server.py               # Servicer gRPC
├── src/introspector.py         # GetSchema (skip schema sistem, allowlist, batas objek)
├── src/executor.py src/sanitizer.py src/cache.py src/factory.py
├── src/conn/                   # postgres mysql mssql sqlite clickhouse bigquery mongodb file restfull
└── tests/                      # pytest

proto/engine.proto              # Kontrak gRPC
prisma/schema.prisma            # + BiSource BiDataset BiDashboard BiPanel BiFilter BiDashboardMember
test/                           # bun test
```

## Query Engine

Engine adalah service gRPC terpisah yang mengeksekusi query baca-only terhadap
source yang dikonfigurasi di dashboard. Alasannya dipisah: introspeksi schema dan
eksekusi query bisa berjalan **puluhan detik** pada database remote, dan
prosesnya butuh manage connection pool sendiri.

```bash
cd engine
uv sync --frozen
uv run python -m src.server
# → QueryEngine gRPC server running on port 50051
```

Docker (sendiri, tanpa compose):

```bash
# WAJIB context = ./engine (pyproject.toml & generated/ ada di sana,
# sedangkan proto/engine.proto berada di root repo dan tidak dipakai saat runtime)
docker build -f engine/Dockerfile -t bi-engine engine
docker run --rm -p 50051:50051 -v ./data:/data -e DATA_DIR=/data bi-engine
```

Stack lengkap (Postgres + Redis + engine + dashboard):

```bash
cp .env.example .env && $EDITOR .env   # isi POSTGRES_PASSWORD & BETTER_AUTH_SECRET
docker compose up -d --build
docker compose exec app bun run db:push
docker compose exec app bun run db:seed
```

`app` dan `engine` **share volume `data`** karena app menulis upload ke
`DATA_DIR` dan engine membacanya dari folder yang sama. Kalau dipisah, source
bertipe `file` gagal dengan `Path upload di luar DATA_DIR`. Profile `dev`
(HMR) dan `test` tersedia lewat `docker compose --profile dev|test`.

**Keamanan:** engine hanya menerima query baca. Setiap eksekusi melewati
sanitizer (parser SQL, menolak DML/DDL) **dan** transaksi `READ ONLY` di level
database, lalu `rollback()` eksplisit — jadi lolos sanitizer pun tetap tak bisa
menulis. Detail error driver mentah tidak pernah diteruskan ke client.

**Kenapa `GetSchema` butuh waktu:** introspeksi = ~3 query katalog per objek.
View di `information_schema` dihitung ulang tiap query sehingga ~1,7 detik per
objek; karena itu engine **selalu melewati** schema sistem. Persempit lagi dengan
`INTROSPECT_SCHEMAS=public,reporting`.

**Cache:** `REDIS_URL` untuk cache schema + hasil query. Tanpanya, engine tetap
berfungsi tanpa cache, dan sisi dashboard memakai cache 5 menit untuk schema.

## API Overview

Semua respons memakai envelope `ResponseHandler`:

```json
{ "success": true, "message": "OK", "data": {}, "code": "OK", "requestId": "..." }
```

- **Auth** — `POST /api/auth/*`, `GET /api/auth/me`, `POST /api/auth/reset-password`, `/auth/social-accounts/[id]`
- **Users** — CRUD + `?search=&sort=&order=`, reset password, `/users/logs`, `/users/roles/*`, `/users/sessions/*`
- **Sources** — `GET/POST /api/sources` (`sources:read/create`), `GET/PUT/DELETE /api/sources/[id]`, `POST /api/sources/test` (config adhoc), `POST /api/sources/[id]/test`, `GET /api/sources/[id]/schema`, `POST /api/sources/[id]/run`, `POST /api/sources/upload` (chunked)
- **Datasets** — `GET/POST /api/datasets`, `GET/PUT/DELETE /api/datasets/[id]`, `POST /api/datasets/[id]/run`, `POST /api/datasets/run-batch` (satu round-trip untuk N dataset, error terisolasi per item)
- **Dashboards** — `GET/POST /api/dashboards`, `GET/PUT/DELETE /api/dashboards/[id]`, `+ /panels`, `/panels/[panelId]`, `/panels/reorder`, `/filters`, `/filters/[filterId]`, `/members`, `/public`
- **Public** — `GET /api/public/dashboards/[id]` — **satu-satunya** endpoint tanpa `requireAuth`; hanya dashboard `isPublic: true`, hanya panel ber-dataset, field dibatasi eksplisit
- **Platform** — Calendar, Notifications, API Keys, Attachments

> **Data panel publik tetap butuh autentikasi.** `/api/datasets/run-batch`
> mengeksekusi SQL, jadi tetap di-guard `datasets:read`. Pengunjung anonim
> melihat layout + judul panel, tetapi data memerlukan sesi login atau API key.
> Jangan pernah membuat endpoint run publik.

## Permission Catalog (seeded)

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

Konvensi aksi: `read/update` (jangan `view/edit`). Katalog = baris
`RolePermission` dengan `roleId NULL`; grant per-role menunjuk `roleId`.
`dashboards` **tidak punya `:read`** — list/detail hanya butuh login, mutasi butuh
`dashboards:update`, publikasi & member butuh `dashboards:admin`. Role non-superadmin
perlu diberi permission BI lewat halaman Roles agar tidak kena 403.

## Environment Variables

Salin `.env.example` — semua key sudah terdaftar di sana dengan nilai default
yang aman untuk development. Tabel di bawah menjelaskan tiap key.

| Key | Keterangan |
|-----|------------|
| `DATABASE_URL` | `file:./prisma/dev.db` (SQLite) atau `postgresql://...` (adapter dipilih dari prefix `file:`) |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `BETTER_AUTH_TRUSTED_ORIGINS` | Secret, base URL, origins tambahan (comma-separated) |
| `NEXT_PUBLIC_ALLOW_REGISTER` | `"false"` mematikan `/register` |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | Rate limit edge per IP (default `120`/`60000`). In-memory — multi-instance butuh Redis/Upstash |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH`, `GOOGLE_CLIENT_ID/SECRET` | Toggle + kredensial OAuth Google |
| `NEXT_PUBLIC_ENABLE_GITHUB_AUTH`, `GITHUB_CLIENT_ID/SECRET` | Toggle + kredensial OAuth GitHub |
| `S3_*`, `ATTACHMENTS_MAX_SIZE` | Backend S3 opsional + kuota attachment (default 10 MB) |
| `QUERY_ENGINE_HOST` | Host:port engine (default `localhost:50051`) |
| `QUERY_MAX_ROWS` / `QUERY_TIMEOUT_SEC` | Batas default eksekusi query (1000 / 30) |
| `RUN_RATE_LIMIT_MAX` / `RUN_RATE_LIMIT_WINDOW_MS` | Rate limit endpoint run (30 / 60000) |
| `DATA_DIR` / `UPLOADS_MAX_BYTES` | Folder upload bersama engine (default `./data`) + batas ukuran (10 MB) |

Engine (`engine/src/config.py`): `QUERY_ENGINE_PORT` (50051) · `REDIS_URL` ·
`INTROSPECT_SCHEMAS` · `INTROSPECT_MAX_OBJECTS` (500) · `DB_POOL_SIZE`/`DB_MAX_OVERFLOW` ·
`FETCH_MAX_BYTES` · `QUERY_CACHE_MAX_BYTES` · `FILE_*` · `SHEETS_PAGE_ROWS`.

`NEXT_PUBLIC_DEFAULT_LOCALE` **tidak dipakai** — default locale `en` di-hardcode di
`src/i18n/routing.ts`.

## Git Hooks & CI

- `pre-commit` → lint-staged: `biome check --write` + **`bunx tsc --noEmit`** untuk `*.{ts,tsx}`
- `pre-push` → **`bun run check-unused` (knip)** — push diblokir kalau ada devDep/ekspor mati
- `commit-msg` → commitlint Conventional Commits
- CI: `bun install --frozen-lockfile` → `db:generate` → `lint` → `build`. Deploy: push ke `prod` → build → `pm2 restart`

## Deployment

**Docker** (multi-stage Bun, runner non-root `bun`):

```bash
docker build --build-arg DATABASE_URL="postgresql://..." -t bitools .
docker run -p 3000:3000 --env-file .env bitools
```

> `ARG DATABASE_URL` dibutuhkan saat build karena `db:generate`/build Next membaca env.

Jalankan engine sebagai service terpisah (port 50051) lalu set `QUERY_ENGINE_HOST`
ke host engine. Untuk Postgres (Neon/Supabase) pastikan `DATABASE_URL` memakai
Tambahkan `?sslmode=verify-full` sendiri ke `DATABASE_URL` untuk Postgres
managed (TLS dikontrol sepenuhnya oleh connection string — tidak ada default
TLS di kode).

## License

[MIT](LICENSE) — © 2026 <COPYRIGHT_HOLDER>

Ganti `<COPYRIGHT_HOLDER>` di `LICENSE` dengan nama Anda sebelum publish.
