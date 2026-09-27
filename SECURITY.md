# Security Policy

## Melaporkan kerentanan

**Jangan buka issue publik untuk celah keamanan.** Report ke maintainer lewat
GitHub [private vulnerability reporting](https://docs.github.com/en/communities/maintaining-your-safety-on-github/reporting-abuse-or-spam)
(repo ini → Security → Report a vulnerability).

Sertakan yang bisa Anda(printipkan):

- Langkah reproduksi
- Dampak yang diharapkan (data yang bisa bocor, privilege escalation, dst.)
- Versi/commit yang affected
- Log dari terminal Next.js **dan** terminal engine

Kami akan mengonfirmasi penerimaan dalam 7 hari dan memberikan jadwal perbaikan
atau rencana mitigasi. Mohon beri kami waktu sebelum di-publikasikan.

##SPACE Cakupan

- Kode di repo ini (Next.js app + Python query engine).
- Konfigurasi default yang dibagikan bersama repo.

Tidak dalam cakup: masalah pada dependensi pihak ketiga — laporkan ke maintainer
paket tersebut (lihat dependabot/audit log).

## Model keamanan yang perlu Anda ketahui

### Query engine hanya baca

Engine menjalankan query **read-only** secara berlapis:

1. Sanitizer berbasis parser SQL menolak DML/DDL dan multi-statement
   (`engine/src/sanitizer.py`, ditegakkan di `engine/src/executor.py`).
2. Penguncian tambahan per-konektor di `engine/src/conn/*.py`:
   `SET TRANSACTION READ ONLY` (Postgres, MySQL/MariaDB), `PRAGMA query_only`
   (SQLite), `SET readonly=1` (ClickHouse).
3. `rollback()` eksplisit setelah setiap query, dan tidak pernah `commit()`.

Query yang lolos sanitizer tetap tidak bisa menulis. Detail error driver mentah
(host, user, potongan connection string) **tidak pernah** diteruskan ke klien —
hanya pesan aman yang dikembalikan.

> **MSSQL adalah pengecualian:** T-SQL tidak punya mode transaksi
> `READ ONLY` level sesi, jadi konektor `mssql.py` hanya mengandalkan sanitizer
> + tanpa commit + `rollback()` + `LOCK_TIMEOUT`. Kalau Anda menambah konektor
> baru, pertahankan pola ini dan jangan menambahkan jalur `commit()`.

Parameter dinamis memakai placeholder bernama `{{nama}}` yang di-bind sebagai
parameter driver, bukan di-interpolasi ke string SQL. Ini yang membuatnya kebal
SQL injection.

### Viewer dashboard publik

`GET /api/public/dashboards/[id]` adalah **satu-satunya** endpoint tanpa
`requireAuth`. Endpoint ini sengaja dibuat sempit:

- Hanya dashboard dengan `isPublic: true`; selain itu **404** (bukan 403),
  supaya id yang tidak publik tidak bisa dipetakan lewat perbedaan status.
- Hanya panel yang punya `dataSetId`; field yang dikembalikan dibatasi eksplisit
  (tanpa `userId`/`members`).

Endpoint yang mengeksekusi SQL (`run`, `run-batch`, `schema`) **tetap** di-guard
`requireAuth` + permission. Pengunjung anonim hanya melihat layout dan judul
panel. **Jangan pernah** membuat endpoint run publik — itu akan membuka jalur
exfiltrasi data langsung dari database sumber.

### Autentikasi & kunci

- Password di-hash Argon2id (`@node-rs/argon2`).
- API key disimpan sebagai `argon2id(salt + raw)`, ditampilkan **sekali** saat
  pembuatan, dibandingkan lewat prefix 8 karakter.
- Rate limit in-memory di Edge (single instance). Untuk multi-instance, ganti
  dengan Redis/Upstash.
- API key punya scope = permission pemilik saat key dibuat; mencabut permission
  owner tidak otomatis mencabut key lama.

### Rahasia

- `.env` masuk `.gitignore` dan **tidak boleh** di-commit. Gunakan `.env.example`
  sebagai acuan.
- Password seed (`admin123` / `user123`) hardcoded di `prisma/seed/users.ts` —
  **ganti setelah seed pertama di production**.
- `BETTER_AUTH_SECRET` wajib diganti: `openssl rand -base64 32`.

## Hardening untuk production

- `NODE_ENV=production` (script `removeConsole` di `next.config.ts` aktif).
- Database Postgres dengan `sslmode=verify-full` yang Anda tulis sendiri di
  `DATABASE_URL` — TLS sepenuhnya dikontrol connection string, kode tidak
  menambahkan parameter apa pun.
- Arahkan `DATA_DIR` ke volume persisten yang tidak di-expose lewat web.
- Nyalakan Redis untuk engine bila instance-nya lebih dari satu, atau di belakang
  load balancer.
- Set `INTROSPECT_SCHEMAS` bila DB punya banyak schema (lihat README).
