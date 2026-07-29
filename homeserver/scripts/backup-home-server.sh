#!/bin/bash

set -Eeuo pipefail

umask 077

readonly DOCKER_BIN=/usr/local/bin/docker
readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub
readonly COMPOSE_FILE="${APP_DIR}/compose.yaml"
readonly ENV_FILE="${APP_DIR}/.env"
readonly BACKUP_ROOT=/Users/homeserver/Server/backups/cubing-hub
readonly BACKUP_RETENTION_COUNT=3

work_dir=
final_dir=

usage() {
  printf 'Usage: backup-cubing-hub.sh\n' >&2
}

fail() {
  printf 'Cubing Hub backup failed: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [[ -n "${work_dir}" && -d "${work_dir}" ]]; then
    printf 'Partial backup remains for inspection: %s\n' "${work_dir}" >&2
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "$#" -ne 0 ]]; then
  usage
  exit 64
fi

if [[ ! -x "${DOCKER_BIN}" ]]; then
  fail "Docker CLI is not executable: ${DOCKER_BIN}"
fi

if [[ ! -f "${COMPOSE_FILE}" || ! -f "${ENV_FILE}" ]]; then
  fail "production Compose configuration is incomplete"
fi

compose() {
  "${DOCKER_BIN}" \
    compose \
    --project-directory "${APP_DIR}" \
    --env-file "${ENV_FILE}" \
    --file "${COMPOSE_FILE}" \
    "$@"
}

read_env_value() {
  local key="$1"
  local value

  value="$(
    /usr/bin/awk -F= -v key="${key}" '
      $1 == key {
        value = substr($0, index($0, "=") + 1)
        count += 1
      }
      END {
        if (count != 1 || value == "") {
          exit 1
        }
        print value
      }
    ' "${ENV_FILE}"
  )" || fail "${key} must appear exactly once and be non-empty in ${ENV_FILE}"

  printf '%s' "${value}"
}

post_images_host_dir="$(read_env_value POST_IMAGES_HOST_DIR)"
if [[ ! -d "${post_images_host_dir}" ]]; then
  fail "post image directory does not exist: ${post_images_host_dir}"
fi

running_services="$(compose ps --status running --services)"
if ! /usr/bin/grep -qx db <<<"${running_services}"; then
  fail "production db service is not running"
fi

/bin/mkdir -p "${BACKUP_ROOT}"

timestamp="$(/bin/date -u '+%Y%m%dT%H%M%SZ')"
work_dir="$(
  /usr/bin/mktemp -d "${BACKUP_ROOT}/.cubing-hub-backup.XXXXXX"
)"
final_dir="${BACKUP_ROOT}/cubing-hub-production-${timestamp}"
db_dump_file="${work_dir}/db.sql"
post_images_backup_dir="${work_dir}/post-images"
post_images_file_list="${work_dir}/post-images-files.txt"
object_keys_file="${work_dir}/post-attachment-object-keys.txt"
missing_files_file="${work_dir}/missing-post-image-files.txt"
invalid_keys_file="${work_dir}/invalid-post-image-object-keys.txt"

if [[ -e "${final_dir}" ]]; then
  fail "backup with the same timestamp already exists"
fi

/bin/mkdir "${post_images_backup_dir}"

# Variables expand inside the database container, not in this host shell.
# shellcheck disable=SC2016
compose exec -T db /bin/sh -ceu '
  export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
  exec mysqldump \
    --user=root \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    "${MYSQL_DATABASE}"
' >"${db_dump_file}"

if [[ ! -s "${db_dump_file}" ]]; then
  fail "generated MySQL dump is empty"
fi

/usr/bin/rsync -a "${post_images_host_dir}/" "${post_images_backup_dir}/"

(
  cd "${post_images_backup_dir}"
  /usr/bin/find . -type f \
    | /usr/bin/sed 's#^\./##' \
    | LC_ALL=C /usr/bin/sort \
    >"${post_images_file_list}"
)

# Variables expand inside the database container, not in this host shell.
# shellcheck disable=SC2016
compose exec -T db /bin/sh -ceu '
  export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
  exec mysql \
    --user=root \
    --batch \
    --skip-column-names \
    "${MYSQL_DATABASE}" \
    --execute "SELECT object_key FROM post_attachments WHERE object_key IS NOT NULL AND CHAR_LENGTH(object_key) > 0 ORDER BY object_key"
' >"${object_keys_file}"

: >"${missing_files_file}"
: >"${invalid_keys_file}"

while IFS= read -r object_key; do
  [[ -z "${object_key}" ]] && continue

  if [[ "${object_key}" == /* || "${object_key}" == *".."* ]]; then
    printf '%s\n' "${object_key}" >>"${invalid_keys_file}"
    continue
  fi

  if [[ ! -f "${post_images_backup_dir}/${object_key}" ]]; then
    printf '%s\n' "${object_key}" >>"${missing_files_file}"
  fi
done <"${object_keys_file}"

if [[ -s "${invalid_keys_file}" ]]; then
  fail "database contains invalid post image object keys"
fi

if [[ -s "${missing_files_file}" ]]; then
  fail "post image files referenced by the database are missing"
fi

db_dump_bytes="$(/usr/bin/wc -c <"${db_dump_file}" | /usr/bin/tr -d ' ')"
post_image_file_count="$(/usr/bin/wc -l <"${post_images_file_list}" | /usr/bin/tr -d ' ')"
attachment_object_key_count="$(/usr/bin/wc -l <"${object_keys_file}" | /usr/bin/tr -d ' ')"

{
  printf '{\n'
  printf '  "status": "ok",\n'
  printf '  "createdAt": "%s",\n' "$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf '  "dbDumpFile": "db.sql",\n'
  printf '  "dbDumpBytes": %s,\n' "${db_dump_bytes}"
  printf '  "postImagesDirectory": "post-images",\n'
  printf '  "postImageFileCount": %s,\n' "${post_image_file_count}"
  printf '  "postAttachmentObjectKeyCount": %s\n' "${attachment_object_key_count}"
  printf '}\n'
} >"${work_dir}/manifest.json"

/bin/mv "${work_dir}" "${final_dir}"
work_dir=

kept=0
while IFS= read -r backup_dir; do
  kept=$((kept + 1))
  if ((kept <= BACKUP_RETENTION_COUNT)); then
    continue
  fi

  backup_name="$(/usr/bin/basename "${backup_dir}")"
  if [[ ! "${backup_name}" =~ ^cubing-hub-production-[0-9]{8}T[0-9]{6}Z$ ]]; then
    fail "refusing to remove unexpected backup path"
  fi

  /bin/rm -rf -- "${backup_dir}"
  printf 'Old backup removed: %s\n' "${backup_dir}"
done < <(
  /usr/bin/find "${BACKUP_ROOT}" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    -name 'cubing-hub-production-20??????T??????Z' \
    | LC_ALL=C /usr/bin/sort -r
)

printf 'Backup completed: %s\n' "${final_dir}"
