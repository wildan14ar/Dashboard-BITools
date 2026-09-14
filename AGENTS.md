# Dashboard-BITools AGENTS.md — pola PortoNext-Base

Next.js 16 (App Router, TypeScript) BI dashboard + Python gRPC query engine.
Design pattern disamakan dengan PortoNext-Base boilerplate.

## Commands (use `bun`, never npm — bun.lock, Docker builds frozen)

- `bun run dev` — dev server
- `bun run build` — typecheck gate. Must pass before committing.
- `bun run lint` — Biome lint/format (`bunx biome check src/ prisma/`)
- DB (Prisma 7, PostgreSQL): `db:generate` `db:push` `db:migrate` `db:studio` `db:seed` `db:reset`
- Engine standalone: `cd engine; python -m engine.src.server` — gRPC `:50051`
- Engine tests: `cd engine; uv run pytest` — sanitizer, executor, cache/stale-serve, connectors (31 tes)
- Frontend tests: `bun run test` — `test/hash.test.ts`, `test/validations.test.ts`, `test/response.test.ts`
- CI: `.github/workflows/ci.yaml` — install → generate → lint → typecheck → test → build → pytest
- `docker compose up -d` — redis, postgres, engine gRPC, dashboard

## Pre-commit (husky)

- `pre-commit` → `lint:staged`: Biome --fix + `tsc --noEmit`
- `commit-msg` → commitlint Conventional Commits; types: `feat fix chore docs style refactor perf test build ci revert`; header ≤72 chars.

## Env & DB

- `.env` required, gitignored. `prisma.config.ts` supplies `DATABASE_URL`.
- Required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (`AUTH_SECRET` fallback), `BETTER_AUTH_URL`, `QUERY_ENGINE_HOST`, `REDIS_URL`
- Seed creds via `SEED_ADMIN_*` / `SEED_USER_*` (lihat `.env.example`)

## Architecture

- `src/app/api/*` route handlers; pages: `/` dashboards, `/sources`, `/datasets`, `/users`, `/(auth)/login`
- `src/proxy.ts` = Edge middleware. Guards all kecuali `/login`, `/bi/public`, `/bi/embed` via Better Auth session cookie.
- Auth: Better Auth v1.7 (credentials + username plugin), RBAC (Role/UserRole/RolePermission), Argon2id (`src/lib/hash.ts`)
- Query engine: Python gRPC `:50051` (SQLAlchemy, bound params `:name` via `bind_params`). Frontend → `src/lib/engine.ts` → Engine → source DBs. Prisma hanya untuk meta DB.
- Run routes dilindungi rate limit 30/menit/user (`src/lib/rate-limit.ts`); health di `GET /api/health`
- Backup meta DB: `./scripts/backup.sh` (pg_dump harian, retensi 7)
- Audit: `ActivityLog` + `Notification`, via `src/lib/activity.ts` fire-and-forget.
- Key Prisma models: User (+Session/Account/Verification), Role, BiDashboard, BiDataset, BiSource, BiPanel, BiFilter, BiDashboardMember

## Conventions

- Path alias `@/*` → `src/*`
- Tailwind v4 + shadcn/ui, `tw-animate-css`, `sonner` toasts
- Forms: React Hook Form + Zod v4
- State: TanStack Query v5 (`src/components/Providers.tsx` — stale 5m, gc 10m), no global store
- Validations: `src/validations/*` + barrel `index.ts`
- Prisma: `src/config/prisma.ts` default export singleton (adapter dibuat dari connection string, bukan `pg.Pool` instance — beda copy `pg` bikin `instanceof` gagal → fallback `127.0.0.1:5432`/P1001). `src/lib/prisma.ts` hanya re-export backward-compat.
- Settings: `src/config/settings.ts` terpusat
- IDs: ULID (`ulid()`) untuk semua model baru; Role tetap `uuid()`
- API client: `src/lib/api.ts` envelope `{success,message,data}` (standar). `src/lib/axios.ts` legacy.

## Permission Catalog (prisma/seed/permissions.ts — FEATURE_REGISTRY)

```
BI:    dashboards:read/create/update/delete/admin
       datasets:read/create/update/delete/admin
       sources:read/create/update/delete/admin
Users: users:create/update/delete/admin, roles:read/create/update/delete/admin,
       permissions:read, sessions:view/revoke, logs:view
```
Super Admin (`isSuperAdmin: true`) bypasses all checks (`src/middlewares/rbac.ts`, cache 30s).

## Adding Features

1. **New API route** — ikuti `src/app/api/dashboards/route.ts`: `RequestHandler.validateRequest` + `requireAuth({permissions})` + `ResponseHandler` + `logActivity`
2. **New permission** — tambah ke `prisma/seed/permissions.ts` → `bun run db:seed`
3. **New page** — bungkus aksi dengan `<Protected permissions={["dashboards:create"]}>`
4. **New UI component** — `components/ui/` (shadcn) atau `components/shared/`; atom ke `components/atoms/`

## Common gotchas

- Engine requires Redis; cache features fail without it
- `bun run db:generate` must run after schema changes
- gRPC `QUERY_ENGINE_HOST` harus reachable (`engine:50051` di compose, `localhost:50051` lokal)
- Old NextAuth (`next-auth`, `bcrypt`, `auth.config.ts`) sudah dihapus — pakai `authClient` dari `@/lib/auth-client`
- User fields kini `username/fullname` (lowercase Porto), bukan `userName/fullName`
