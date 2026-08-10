#!/bin/sh
# BOR-81/82: periodic pg_dump of the Brooks database with retention pruning.
#
# Runs inside a postgres:16-alpine sidecar (see docker-compose.prod.yml `db-backup`), dumping to
# the `brooks-postgres-backups` named volume on a fixed interval and pruning old dumps.
#
# SCOPE: this is ON-VM local backup — it survives container recreation (named volume) and gives
# point-in-time restore of the last N days. It does NOT survive VM/disk loss on its own; for real
# durability, sync /backups off-box (e.g. to GCS: `gsutil rsync /backups gs://…`) or mount a
# managed volume. Restore: `gunzip -c <file>.sql.gz | psql -U "$PGUSER" -d "$PGDATABASE"`.
set -eu

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"   # default: daily
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
DIR=/backups

mkdir -p "$DIR"
echo "[db-backup] starting; interval=${INTERVAL}s retention=${RETENTION_DAYS}d db=${PGDATABASE} host=${PGHOST}"

while true; do
  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  OUT="${DIR}/${PGDATABASE}-${TS}.sql.gz"
  TMP="${OUT}.partial"
  echo "[db-backup] dumping ${PGDATABASE} -> ${OUT}"
  # --no-owner/--no-privileges so the dump restores cleanly into a fresh role on any host.
  if pg_dump --no-owner --no-privileges "${PGDATABASE}" | gzip -c > "${TMP}"; then
    mv "${TMP}" "${OUT}"
    echo "[db-backup] ok: $(du -h "${OUT}" | cut -f1) ${OUT}"
  else
    echo "[db-backup] ERROR: pg_dump failed for ${PGDATABASE}" >&2
    rm -f "${TMP}"
  fi
  # Prune dumps older than the retention window (write a .partial-free listing first).
  find "${DIR}" -name "${PGDATABASE}-*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete || true
  sleep "${INTERVAL}"
done
