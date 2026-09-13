# Dashboard-BITools AGENTS.md

## Quickstart
- `bun dev` or `npm run dev` — starts Next.js at http://localhost:3000
- `bun run build` / `bun run start` — production build/start
- `docker compose up -d` — starts all services (redis, postgres, engine gRPC, dashboard)
- Dashboard at http://localhost:3000, engine at localhost:50051

## Commands (critical)
- `prisma migrate dev` — create/migrations PostgreSQL schema
- `prisma generate` — generates Prisma Client at `src/lib/prisma/`
- Engine standalone: `cd engine; python -m engine.src.server` — starts gRPC on port 50051
- Required service: Redis must be running for engine features

## Architecture
- **Frontend**: Next.js + React Compiler + TypeScript + Tailwind CSS v4
- **Backend**: Python gRPC engine (port 50051) with SQLAlchemy, supports Postgres/MySQL/MongoDB/Redis/SQLite
- **Data flow**: Frontend → gRPC → Engine → Databases → Results
- **Key Prisma models**: User, Role, UserRole, RolePermission, BiDashboard, BiDataset, BiSource, BiPanel, BiFilter
- **Path aliases**: `@/*` → `./src/*` (tsconfig.json)

## Testing
- **Engine tests**: `cd engine; pytest` — covers query execution, pagination, caching, stale-serve logic, MongoDB/REST API
- **Frontend**: No dedicated test framework; relies on manual development
- Tests use `factory.get()` for cached engines; mocks Redis (`cache_get`, `cache_set`, `cache_try_lock`, `cache_invalidate_pattern`)

## Configuration
- `.env`: DATABASE_URL, AUTH_SECRET, QUERY_ENGINE_HOST, REDIS_URL, cache TTL/timeout
- `proto/engine.proto` — gRPC service def (TestConnection, GetSchema, Execute, ExecuteStream, InvalidateCache)
- `postcss.config.mj` — Tailwind CSS v4 plugin config
- `eslint.config.mjs` — extends next/core-web-vitals + typescript

## Common gotchas
- No frontend test framework configured — don't assume vitest/jest is available
- Engine requires Redis running; cache-dependent features will fail without it
- `prisma generate` must run after schema changes for Prisma Client to pick up changes
- gRPC engine port 50051 must be reachable from the Next.js app