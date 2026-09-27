# Contributing ke Dashboard-BITools

Terima kasih sudah tertarik ikut itchy. Repo ini masih muda, jadi CONTRIBUTING
yang jelas sangat membantu.

## Isi

- [Development](#development)
- [Alur kerja PR](#alur-kerja-pr)
- [Check wajib](#check-wajib)
- [Panduan commit](#panduan-commit)
- [Menambah permission](#menambah-permission)
- [Menambah API route](#menambah-api-route)
- [Menambah halaman](#menambah-halaman)
- [Menambah tipe source](#menambah-tipe-source)
- [Mock data untuk lokal](#mock-data-untuk-lokal)
- [Melaporkan bug](#melaporkan-bug)

## Development

Prasyarat: [Bun](https://bun.sh), [uv](https://docs.astral.sh/uv/), dan
PostgreSQL (atau SQLite untuk coba-coba cepat).

```bash
bun install
cp .env.example .env          # lalu isi DATABASE_URL & BETTER_AUTH_SECRET
bun run db:generate
bun run db:push
bun run db:seed
bun run dev                   # http://localhost:3000
```

Query engine jalan terpisah di terminal lain:

```bash
cd engine
uv sync --frozen
uv run python -m src.server
```

> Redis untuk engine **opsional** — engine tetap jalan tanpa cache.

Test engine:

```bash
cd engine && uv run pytest
```

## Alur kerja PR

1. Buka issue dulu kalau PR-nya besar atau breaking change.
2. Buat branch dari `master`: `feat/…`, `fix/…`, `docs/…`, `refactor/…`.
3. Commit kecil & fokus (lihat [panduan commit](#panduan-commit)).
4. Pastikan [check wajib](#check-wajib) hijau lokal.
5. Buka PR ke `master` dan isi template-nya.

## Check wajib

Hook git sudah menjaga, tapi jalankan manual sebelum push:

```bash
bun run lint        # biome check src/ test/ prisma/
bun run typecheck   # tsc --noEmit
bun test            # suite di test/
bun run check-unused # knip — WAJIB bersih, hook pre-push memblokir
```

- **pre-commit** menjalankan `biome check --write` + `tsc --noEmit` pada file yang di-staging.
- **pre-push** menjalankan `knip`; push diblokir kalau ada devDep atau ekspor mati.
- **CI** (GitHub Actions) menjalankan `lint` + `build` pada setiap PR.

`knip` picky dengan sengaja. Kalau memang menambah API modul yang belum ada
konsumennya (mis. wrapper RPC yang memang sengaja disimpan), tambahkan ke
`ignoreIssues` **dengan komentar alasannya** di `knip.jsonc` — jangan diam-diam
menghapus, dan jangan asal disable aturannya.

## Panduan commit

Conventional Commits, divalidasi `commit-msg` hook:

```
feat: add pivot table mode to dashboard panel
fix: prevent infinite refetch when panel has no dataset
docs: clarify INTROSPECT_SCHEMAS setup
refactor(editor): extract chart config into sections
```

Tipe yang diizinkan: `feat fix chore docs style refactor perf test build ci revert`.
Tambahkan scope bila membantu: `fix(api): validasi run-batch items minimal 1`.

## Menambah permission

Katalog permission hidup di `prisma/seed/permissions.ts`:

1. Tambah entri ke `FEATURE_REGISTRY` (grup → feature → actions).
2. `bun run db:seed -- --only permissions`
3. Pakai di `requireAuth({ permissions: [...] })` dan `<Protected permissions={[...]}>`.

Konvensi nama aksi: `read/create/update/delete/admin/revoke/broadcast` — **jangan**
`view`/`edit`. Permission yang tak pernah dicek kode tidak masuk katalog.

## Menambah API route

Semua route memakai pola yang sama:

```ts
import { type NextRequest } from "next/server"
import { RequestHandler, ResponseHandler, requireAuth } from "@/middlewares"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth({ permissions: ["datasets:update"] })
  if (error) return error

  const validated = await RequestHandler.validateRequest(z.object({ body: mySchema }), req)
  if (validated instanceof NextResponse) return validated

  return ResponseHandler.success("OK", data, {
    requestId: req.headers.get("x-request-id") ?? undefined,
  })
}
```

- Body tervalidasi Zod di `src/validations/*.ts`, di-rekspor dari
  `src/validations/index.ts`.
- Endpoint lambat (schema/run) **wajib** set `timeoutMs` eksplisit di sisi client
  (`lib/api.ts`) — default 10 detik tidak cukup untuk DB remote.
- Jangan pernah membuat endpoint yang menjalankan SQL tanpa auth.

## Menambah halaman

- Taruh di dalam `src/app/(dashboard)/` agar otomatis dapat session guard,
  `Providers`, dan intl context.
- Halaman di luar route group (mis. `app/bi/`) **wajib** dibungkus
  `NextIntlClientProvider` sendiri di layout-nya — `Providers` memanggil
  `useLocale()` dan akan error "No intl context found" tanpa itu.
- Gate UI dengan `<Protected permissions={["datasets:create"]}>` (logika OR).
- Untuk komponen yang dipakai >1 halaman, taruh di `src/hooks/use-*.ts`
  (TanStack Query) — jangan tambah query di dalam komponen.

## Menambah tipe source

1. Tambah enum di `sourceTypeSchema` (`src/validations/source.ts`).
2. Tambah config schema-nya ke `CONFIG_SCHEMAS`.
3. Tambah field UI di `src/components/sources/source-form.tsx` bila tipe butuh
   input khusus (kredensial, database, options).
4. **Engine**: buat connector di `engine/src/conn/<tipe>.py`, daftarkan dengan
   dekorator `@register("<tipe>")` (dari `engine/src/conn/__init__.py`),
   dan implementasikan `fetch_all` + `list_tables`. Tambahkan kolom persistance
   di `schema.prisma` bila perlu (mis. kredensial), lalu `bun run db:generate`.
5. Tambahkan test di `engine/tests/`.

## Mock data untuk lokal

Buat source dengan `kind: "file"`, lalu unggah CSV lewat Database Explorer
(`/sources/[id]`). Upload memakai chunked 5 MB dan tidak butuh database
eksternal — cukup untuk mengembangkan grafik dan dashboard.

## Melaporkan bug

Lampirkan:

- Versi (commit hash), OS, dan runtime (`bun --version`).
- Langkah reproduksi minimal.
- Log yang relevan dari terminal Next.js **dan** terminal engine (engine
  menulis detail kegagalan query ke stdout — sangat membantu).
- Screenshot bila soal visual.

Kalau melibatkan kebocoran data atau celah keamanan, **jangan** buka issue
publik — lihat [SECURITY.md](SECURITY.md).

## Lisensi

Kontribusi Anda lisensikan di bawah [MIT](LICENSE) — dengan kontribusi Anda
bersifat royalty-free.
