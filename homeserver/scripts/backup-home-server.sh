#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: homeserver/scripts/backup-home-server.sh

Environment variables:
  ENV_FILE                 Runtime env file. Default: $HOME/cubing-hub-runtime/homeserver.env
  BACKUP_ROOT              Backup root. Default: $HOME/backups/cubing-hub
  MYSQL_CONTAINER          MySQL container name. Default: cubing_hub_mysql
  BACKUP_RETENTION_COUNT   Keep the newest N successful backups. 0 disables deletion. Default: 0
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 0 ]]; then
  usage >&2
  exit 64
fi

ENV_FILE="${ENV_FILE:-$HOME/cubing-hub-runtime/homeserver.env}"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups/cubing-hub}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-cubing_hub_mysql}"
BACKUP_RETENTION_COUNT="${BACKUP_RETENTION_COUNT:-0}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
WORK_DIR="$BACKUP_ROOT/.in-progress-$TIMESTAMP-$$"
FINAL_DIR="$BACKUP_ROOT/$TIMESTAMP"
DB_DUMP_FILE="$WORK_DIR/db.sql"
POST_IMAGES_BACKUP_DIR="$WORK_DIR/post-images"
POST_IMAGES_FILE_LIST="$WORK_DIR/post-images-files.txt"
OBJECT_KEYS_FILE="$WORK_DIR/post-attachment-object-keys.txt"
MISSING_FILES_FILE="$WORK_DIR/missing-post-image-files.txt"
INVALID_KEYS_FILE="$WORK_DIR/invalid-post-image-object-keys.txt"

fail() {
  echo "Backup failed: $*" >&2
  exit 1
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

load_env_file() {
  local env_file="$1"
  local line
  local key
  local value

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == *"="* ]] || continue

    key="${line%%=*}"
    value="${line#*=}"
    key="$(printf '%s' "$key" | tr -d '[:space:]')"

    if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      fail "invalid env key in $env_file: $key"
    fi

    if [[ "${#value}" -ge 2 ]]; then
      if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
        value="${value:1:${#value}-2}"
      fi
    fi

    export "$key=$value"
  done < "$env_file"
}

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail "$name is required"
  fi
}

cleanup() {
  local status=$?
  if [[ $status -ne 0 && -d "$WORK_DIR" ]]; then
    echo "Partial backup was left at: $WORK_DIR" >&2
  fi
}
trap cleanup EXIT

if [[ ! -f "$ENV_FILE" ]]; then
  fail "missing env file: $ENV_FILE"
fi

load_env_file "$ENV_FILE"

require_var DB_NAME
require_var MYSQL_ROOT_PASSWORD
require_var POST_IMAGES_HOST_DIR

if [[ ! "$BACKUP_RETENTION_COUNT" =~ ^[0-9]+$ ]]; then
  fail "BACKUP_RETENTION_COUNT must be a non-negative integer"
fi

if [[ ! -d "$POST_IMAGES_HOST_DIR" ]]; then
  fail "POST_IMAGES_HOST_DIR does not exist: $POST_IMAGES_HOST_DIR"
fi

if [[ -e "$FINAL_DIR" || -e "$WORK_DIR" ]]; then
  fail "backup directory already exists for timestamp: $TIMESTAMP"
fi

mkdir -p "$POST_IMAGES_BACKUP_DIR"

if ! docker inspect "$MYSQL_CONTAINER" >/dev/null 2>&1; then
  fail "MySQL container does not exist: $MYSQL_CONTAINER"
fi

if [[ "$(docker inspect "$MYSQL_CONTAINER" --format '{{.State.Running}}')" != "true" ]]; then
  fail "MySQL container is not running: $MYSQL_CONTAINER"
fi

echo "Creating MySQL dump..."
docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$MYSQL_CONTAINER" \
  mysqldump \
  -uroot \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "$DB_NAME" > "$DB_DUMP_FILE"

if [[ ! -s "$DB_DUMP_FILE" ]]; then
  fail "DB dump is empty"
fi

echo "Copying post image files..."
rsync -a "$POST_IMAGES_HOST_DIR"/ "$POST_IMAGES_BACKUP_DIR"/

(
  cd "$POST_IMAGES_BACKUP_DIR"
  find . -type f | sed 's#^\./##' | LC_ALL=C sort > "$POST_IMAGES_FILE_LIST"
)

echo "Reading post attachment metadata..."
docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$MYSQL_CONTAINER" \
  mysql -uroot -N -B "$DB_NAME" \
  -e "SELECT object_key FROM post_attachments WHERE object_key IS NOT NULL AND object_key <> '' ORDER BY object_key;" \
  > "$OBJECT_KEYS_FILE"

: > "$MISSING_FILES_FILE"
: > "$INVALID_KEYS_FILE"

while IFS= read -r object_key; do
  [[ -z "$object_key" ]] && continue

  if [[ "$object_key" == /* || "$object_key" == *".."* ]]; then
    printf '%s\n' "$object_key" >> "$INVALID_KEYS_FILE"
    continue
  fi

  if [[ ! -f "$POST_IMAGES_BACKUP_DIR/$object_key" ]]; then
    printf '%s\n' "$object_key" >> "$MISSING_FILES_FILE"
  fi
done < "$OBJECT_KEYS_FILE"

if [[ -s "$INVALID_KEYS_FILE" ]]; then
  fail "DB contains invalid post image object keys: $INVALID_KEYS_FILE"
fi

if [[ -s "$MISSING_FILES_FILE" ]]; then
  fail "post image files referenced by DB are missing from backup: $MISSING_FILES_FILE"
fi

DB_DUMP_BYTES="$(wc -c < "$DB_DUMP_FILE" | tr -d ' ')"
POST_IMAGE_FILE_COUNT="$(wc -l < "$POST_IMAGES_FILE_LIST" | tr -d ' ')"
ATTACHMENT_OBJECT_KEY_COUNT="$(wc -l < "$OBJECT_KEYS_FILE" | tr -d ' ')"

cat > "$WORK_DIR/manifest.json" <<MANIFEST
{
  "status": "ok",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "dbName": "$(json_escape "$DB_NAME")",
  "mysqlContainer": "$(json_escape "$MYSQL_CONTAINER")",
  "dbDumpFile": "db.sql",
  "dbDumpBytes": $DB_DUMP_BYTES,
  "postImagesSource": "$(json_escape "$POST_IMAGES_HOST_DIR")",
  "postImagesDirectory": "post-images",
  "postImageFileCount": $POST_IMAGE_FILE_COUNT,
  "postAttachmentObjectKeyCount": $ATTACHMENT_OBJECT_KEY_COUNT
}
MANIFEST

mv "$WORK_DIR" "$FINAL_DIR"
echo "Backup completed: $FINAL_DIR"

if (( BACKUP_RETENTION_COUNT > 0 )); then
  kept=0
  while IFS= read -r backup_dir; do
    kept=$((kept + 1))
    if (( kept > BACKUP_RETENTION_COUNT )); then
      echo "Removing old backup: $backup_dir"
      rm -rf -- "$backup_dir"
    fi
  done < <(
    find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
      -name '20[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]' \
      | LC_ALL=C sort -r
  )
fi
