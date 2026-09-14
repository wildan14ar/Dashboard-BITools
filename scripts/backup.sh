#!/usr/bin/env bash
# Backup meta DB (Postgres) ke ./backups dengan timestamp. Menyimpan 7 terbaru.
# Pakai:  ./scripts/backup.sh
# Cron harian: 0 2 * * * cd /path/Dashboard-BITools && ./scripts/backup.sh
set -euo pipefail

KEEP=${BACKUP_KEEP:-7}
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
mkdir -p "$OUT_DIR"

STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$OUT_DIR/fycdb-$STAMP.dump"

if docker compose ps -q postgres >/dev/null 2>&1 && [ -n "$(docker compose ps -q postgres)" ]; then
  docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-fycuser}" "${POSTGRES_DB:-fycdb}" > "$FILE"
else
  # Fallback: DATABASE_URL langsung (format postgresql://user:pass@host:port/db)
  URL="${DATABASE_URL:?DATABASE_URL tidak diset dan container postgres tidak jalan}"
  pg_dump "$URL" > "$FILE"
fi

gzip -f "$FILE"
ls -t "$OUT_DIR"/fycdb-*.dump.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "Backup tersimpan: $FILE.gz"
