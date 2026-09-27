## Deskripsi

<!-- Apa yang diubah dan kenapa. -->

Closes #

## Jenis perubahan

- [ ] Bug fix
- [ ] Fitur baru
- [ ] Refactor (tanpa perubahan perilaku)
- [ ] Dokumentasi
- [ ] Infrastruktur / CI

## Verifikasi

- [ ] `bun run lint` bersih
- [ ] `bun run typecheck` bersih
- [ ] `bun test` lulus
- [ ] `bun run check-unused` bersih (knip)
- [ ] Kalau menyentuh engine: `cd engine && uv run pytest` lulus
- [ ] Sudah diuji manual di browser (jika relevan)

## Area yang tersentuh

<!-- Centang yang relevan -->

- [ ] Query engine (Python)
- [ ] Auth / permission / RBAC
- [ ] API route
- [ ] Halaman / komponen UI
- [ ] Hooks (TanStack Query)
- [ ] Validasi (Zod / Prisma schema)
- [ ] Docs / config

## Catatan untuk reviewer

<!-- Bagian yang rawan, keputusan desain yang diambil, atau hal yang perlu
     perhatian khusus saat review. -->

## Checklist sebelum merge

- [ ] Tidak ada secret/kredensial yang ikut ter-commit
- [ ] Export baru punya konsumen, atau tercatat di `knip.jsonc` dengan alasan
- [ ] Env var baru didokumentasikan di README + `.env.example`
- [ ] Permission baru didokumentasikan di katalog README + AGENTS.md
