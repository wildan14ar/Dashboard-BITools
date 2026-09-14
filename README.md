# Dashboard-BITools

Platform Business Intelligence self-hosted: daftarkan koneksi database (**Source**) → simpan query SQL (**Dataset**) → visualisasikan sebagai panel grafik di atas (**Dashboard**). Dibangun dengan Next.js 16 + Python gRPC query engine, pola kode mengikuti `PortoNext-Base` (lihat `AGENTS.md`).

```
Browser ──▶ Next.js (src/app + src/app/api)
                │  gRPC (src/lib/engine.ts)
                ▼
         Python Query Engine :50051 ──▶ Source DB user (PG/MySQL/Mongo/API…)
                │                              ▲
                └─ cache hasil ─▶ Redis        │ definisi (SQL, koneksi,
                                               │ dashboard) ◀── Prisma ◀── meta DB
```

## Stack

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16, React 19, TypeScript, Tailwind v4 + shadcn/ui |
| Auth | Better Auth v1.7 (credentials + username) + Argon2id, RBAC |
| Meta DB | PostgreSQL + Prisma 7 |
| Query engine | Python gRPC (`engine/`), SQLAlchemy, Redis cache |
| State/forms | TanStack Query v5, React Hook Form + Zod v4 |
| Quality gate | Biome, `tsc`, `bun test`, `pytest`, Husky + commitlint |

## Quick Start

```bash
bun install
cp .env.example .env   # isi DATABASE_URL, BETTER_AUTH_SECRET, dst.

bun run db:generate
bun run db:push         # atau: bun run db:migrate
bun run db:seed         # permissions + admin@bi.com / password123

# Terminal 1 — engine (butuh Redis jalan)
cd engine && uv sync --frozen && uv run python -m src.server

# Terminal 2 — dashboard
bun run dev             # http://localhost:3000
```

Atau semuanya via Docker: `docker compose up -d` (dashboard `:3000`, engine `:50051`).

## Alur Pakai

1. **Sources** (`/sources`) — tambah koneksi DB → *Test* → lihat *Schema* (tabel/kolom + ERD).
2. **Datasets** (`/datasets`) — tulis SQL (editor Monaco) dengan variabel filter `{{nama}}`, mis. `WHERE kota = {{kota}}` → *Run* → simpan.
3. **Dashboards** (`/`) — buat dashboard → tambah panel (pilih dataset + tipe chart + susun grid drag-and-drop) → tambah filter → share publik / ke member (Viewer/Editor) / embed via `/bi/public`, `/bi/embed`.
4. Badge tiap panel menunjukkan **live/cached + waktu eksekusi** dari engine.

## Commands

```bash
bun run dev | build | start
bun run lint | lint:fix | typecheck | test
bun run db:generate | db:push | db:migrate | db:studio | db:seed | db:reset
cd engine && pytest                       # 17 tes: sanitizer, executor, cache, nosql
./scripts/backup.sh                       # dump Postgres ke ./backups (simpan 7)
```

## Environment

Lihat `.env.example`. Kunci: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `QUERY_ENGINE_HOST` (`engine:50051` di compose), `REDIS_URL`, `QUERY_CACHE_TTL_SEC`, `SEED_ADMIN_*`/`SEED_USER_*` untuk akun awal.

## Konvensi (ringkas)

- API: `RequestHandler.validateRequest` + `requireAuth({permissions})` + `ResponseHandler` + `logActivity`; envelope `{success, message, data}`.
- Permission: `dashboards|datasets|sources:read/create/update/delete/admin`, `users:*`, `roles:*` (`prisma/seed/permissions.ts`). Superadmin bypass.
- Validasi di `src/validations/`; Prisma client dari `src/config/prisma.ts`; ID = ULID.
- Health: `GET /api/health` (cek Postgres + engine TCP). Rate limit 30 query/menit/user di route run.
