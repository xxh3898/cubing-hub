#!/bin/bash

set -Eeuo pipefail

umask 077

readonly DOCKER_BIN=/usr/local/bin/docker
readonly PYTHON_BIN=/usr/bin/python3
readonly HOMEOPS_EVENT_REPORTER=/Users/homeserver/Server/apps/homeops/runtime-config/current/scripts/report-homeops-event.py
readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub
readonly PROJECT_NAME=cubing-hub
readonly LEGACY_COMPOSE_FILE="${APP_DIR}/compose.yaml"
readonly ENV_FILE="${APP_DIR}/.env"
readonly BACKUP_ROOT=/Users/homeserver/Server/backups/cubing-hub/data
readonly RUNTIME_CONFIG_ROOT="${APP_DIR}/runtime-config"
readonly RUNTIME_CONFIG_RELEASES="${RUNTIME_CONFIG_ROOT}/releases"
readonly RUNTIME_CONFIG_STATE="${RUNTIME_CONFIG_ROOT}/state"
readonly RUNTIME_CONFIG_CURRENT="${RUNTIME_CONFIG_ROOT}/current"
readonly RUNTIME_CONFIG_INITIALIZED="${APP_DIR}/.runtime-config-v2-initialized"
readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000
readonly BACKUP_RETENTION_COUNT=3

work_dir=
final_dir=
active_compose_file=
homeops_backup_started_at=
homeops_backup_event_key=

report_homeops_backup() {
  local status="$1"
  local finished_at="$2"
  local logical_location="${3:-}"
  local size_bytes="${4:-}"
  local payload

  if [[ -z "${homeops_backup_event_key}" ]]; then
    return
  fi
  if [[ ! -f "${HOMEOPS_EVENT_REPORTER}" || -L "${HOMEOPS_EVENT_REPORTER}" || ! -x "${HOMEOPS_EVENT_REPORTER}" ]]; then
    printf 'HomeOps backup event reporter is unavailable\n' >&2
    return
  fi
  payload="$(
    "${PYTHON_BIN}" - \
      "${homeops_backup_event_key}" "${status}" "${homeops_backup_started_at}" \
      "${finished_at}" "${logical_location}" "${size_bytes}" <<'PY'
import json, sys
event_key, status, started_at, finished_at, logical_location, size_bytes = sys.argv[1:]
print(json.dumps({
    "eventKey": event_key,
    "project": "cubing-hub",
    "databaseType": "MYSQL",
    "logicalLocation": logical_location or None,
    "status": status,
    "startedAt": started_at,
    "finishedAt": finished_at or None,
    "sizeBytes": int(size_bytes) if size_bytes else None,
    "failureSummary": "backup worker exited unsuccessfully" if status == "FAILED" else None,
}, separators=(",", ":")))
PY
  )" || {
    printf 'HomeOps backup event payload could not be generated\n' >&2
    return
  }
  if ! printf '%s' "${payload}" | "${HOMEOPS_EVENT_REPORTER}" backups; then
    printf 'HomeOps backup event could not be retained\n' >&2
  fi
}

usage() {
  printf 'Usage: backup-cubing-hub.sh\n' >&2
}

fail() {
  printf 'Cubing Hub backup failed: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  local exit_status="$?"
  local finished_at
  local logical_location=
  local size_bytes=

  if [[ -n "${homeops_backup_event_key}" ]]; then
    finished_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"
    if [[ "${exit_status}" -eq 0 && -n "${final_dir}" && -d "${final_dir}" ]]; then
      logical_location="cubing-hub/data/$(/usr/bin/basename "${final_dir}")"
      size_bytes="$(/usr/bin/du -sk "${final_dir}" | /usr/bin/awk '{ print $1 * 1024 }')"
      report_homeops_backup SUCCESS "${finished_at}" "${logical_location}" "${size_bytes}"
    else
      report_homeops_backup FAILED "${finished_at}" "" ""
    fi
  fi
  if [[ -n "${work_dir}" && -d "${work_dir}" ]]; then
    printf 'Partial backup remains for inspection: %s\n' "${work_dir}" >&2
  fi
  return "${exit_status}"
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

if [[ ! -x "${PYTHON_BIN}" ]]; then
  fail "Python is not executable: ${PYTHON_BIN}"
fi

if [[ ! -f "${ENV_FILE}" || -L "${ENV_FILE}" ]]; then
  fail "production environment configuration is missing or unsafe"
fi

is_digest() {
  [[ "$1" =~ ^sha256:[0-9a-f]{64}$ ]] && [[ "$1" != "${ZERO_DIGEST}" ]]
}

read_state_value() {
  local key="$1"

  /usr/bin/sed -n "s/^${key}=//p" "${RUNTIME_CONFIG_STATE}" \
    | /usr/bin/tail -n 1
}

validate_state_file() {
  local application_revision
  local keys
  local previous_revision
  local previous_digest
  local runtime_content_sha
  local runtime_digest
  local runtime_revision

  if [[ ! -f "${RUNTIME_CONFIG_STATE}" || -L "${RUNTIME_CONFIG_STATE}" ]]; then
    fail "runtime config state must be a regular non-symlink file"
  fi

  keys="$(
    /usr/bin/awk -F= 'NF >= 2 { print $1 }' "${RUNTIME_CONFIG_STATE}" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${keys}" != $'APPLICATION_REVISION\nPREVIOUS_APPLICATION_REVISION\nPREVIOUS_RUNTIME_CONFIG_DIGEST\nRUNTIME_CONFIG_CONTENT_SHA256\nRUNTIME_CONFIG_DIGEST\nRUNTIME_CONFIG_REVISION' ]]; then
    fail "runtime config state keys are invalid"
  fi

  application_revision="$(read_state_value APPLICATION_REVISION)"
  previous_revision="$(read_state_value PREVIOUS_APPLICATION_REVISION)"
  previous_digest="$(read_state_value PREVIOUS_RUNTIME_CONFIG_DIGEST)"
  runtime_content_sha="$(read_state_value RUNTIME_CONFIG_CONTENT_SHA256)"
  runtime_digest="$(read_state_value RUNTIME_CONFIG_DIGEST)"
  runtime_revision="$(read_state_value RUNTIME_CONFIG_REVISION)"

  if [[ ! "${application_revision}" =~ ^[0-9a-f]{40}$ ]] \
    || [[ "${application_revision}" == "${ZERO_SHA}" ]] \
    || [[ ! "${previous_revision}" =~ ^[0-9a-f]{40}$ ]] \
    || { [[ "${previous_digest}" != "${ZERO_DIGEST}" ]] && ! is_digest "${previous_digest}"; } \
    || [[ ! "${runtime_content_sha}" =~ ^[0-9a-f]{64}$ ]] \
    || ! is_digest "${runtime_digest}" \
    || [[ ! "${runtime_revision}" =~ ^[0-9a-f]{40}$ ]] \
    || [[ "${runtime_revision}" == "${ZERO_SHA}" ]]
  then
    fail "runtime config state values are invalid"
  fi
}

validate_release_files() {
  local release_dir="$1"
  local entries
  local unexpected

  if [[ ! -d "${release_dir}" || -L "${release_dir}" ]]; then
    fail "verified runtime config release is missing or unsafe"
  fi

  unexpected="$(
    /usr/bin/find "${release_dir}" ! -type d ! -type f -print
  )"
  if [[ -n "${unexpected}" ]]; then
    fail "runtime config contains unsupported file types"
  fi

  entries="$(
    /usr/bin/find "${release_dir}" -mindepth 1 -print \
      | /usr/bin/sed "s#^${release_dir}/##" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${entries}" == $'compose.yaml\nnginx\nnginx/cloudflare-edge-real-ip.conf' ]]; then
    return
  fi
  if [[ "${entries}" != $'compose.yaml\nnginx\nnginx/cloudflare-edge-real-ip.conf\nscripts\nscripts/backup-cubing-hub.sh\nscripts/deploy-cubing-hub.sh' ]]; then
    fail "runtime config entry allowlist does not match"
  fi
  validate_release_scripts "${release_dir}"
}

release_has_synced_scripts() {
  local release_dir="$1"

  [[ -f "${release_dir}/scripts/backup-cubing-hub.sh" ]] \
    && [[ ! -L "${release_dir}/scripts/backup-cubing-hub.sh" ]] \
    && [[ -f "${release_dir}/scripts/deploy-cubing-hub.sh" ]] \
    && [[ ! -L "${release_dir}/scripts/deploy-cubing-hub.sh" ]]
}

validate_release_scripts() {
  local release_dir="$1"
  local script

  for script in \
    "${release_dir}/scripts/backup-cubing-hub.sh" \
    "${release_dir}/scripts/deploy-cubing-hub.sh"
  do
    if [[ ! -x "${script}" ]]; then
      fail "runtime config script is not executable"
    fi
    if ! "${PYTHON_BIN}" -c \
      'import os, stat, sys; raise SystemExit(0 if stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == 0o700 else 1)' \
      "${script}"
    then
      fail "runtime config script mode must be 700"
    fi
    if ! /bin/bash -n "${script}"; then
      fail "runtime config script syntax is invalid"
    fi
  done
}

runtime_config_content_sha256() {
  local release_dir="$1"

  {
    /usr/bin/shasum -a 256 "${release_dir}/compose.yaml"
    /usr/bin/shasum -a 256 \
      "${release_dir}/nginx/cloudflare-edge-real-ip.conf"
    if release_has_synced_scripts "${release_dir}"; then
      /usr/bin/shasum -a 256 \
        "${release_dir}/scripts/backup-cubing-hub.sh"
      /usr/bin/shasum -a 256 \
        "${release_dir}/scripts/deploy-cubing-hub.sh"
    fi
  } | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
}

validate_initialization_marker() {
  if [[ ! -f "${RUNTIME_CONFIG_INITIALIZED}" ]] \
    || [[ -L "${RUNTIME_CONFIG_INITIALIZED}" ]] \
    || [[ "$(/bin/cat "${RUNTIME_CONFIG_INITIALIZED}")" != RUNTIME_CONFIG_V2=initialized ]]
  then
    fail "runtime config initialization marker is invalid"
  fi
}

select_compose_file() {
  local current_target
  local expected_current_target
  local release_dir
  local runtime_content_sha
  local runtime_digest

  if [[ ! -e "${RUNTIME_CONFIG_STATE}" && ! -L "${RUNTIME_CONFIG_STATE}" ]]; then
    if [[ -e "${RUNTIME_CONFIG_CURRENT}" || -L "${RUNTIME_CONFIG_CURRENT}" ]]; then
      fail "runtime config current pointer exists without verified state"
    fi
    if [[ -e "${RUNTIME_CONFIG_INITIALIZED}" || -L "${RUNTIME_CONFIG_INITIALIZED}" ]]; then
      validate_initialization_marker
      fail "initialized runtime config state is missing"
    fi
    if [[ ! -f "${LEGACY_COMPOSE_FILE}" || -L "${LEGACY_COMPOSE_FILE}" ]]; then
      fail "legacy production Compose configuration is missing or unsafe"
    fi
    printf '%s' "${LEGACY_COMPOSE_FILE}"
    return
  fi

  if [[ ! -e "${RUNTIME_CONFIG_INITIALIZED}" && ! -L "${RUNTIME_CONFIG_INITIALIZED}" ]]; then
    fail "runtime config state exists without initialization marker"
  fi
  validate_initialization_marker
  validate_state_file
  runtime_digest="$(read_state_value RUNTIME_CONFIG_DIGEST)"
  runtime_content_sha="$(read_state_value RUNTIME_CONFIG_CONTENT_SHA256)"
  release_dir="${RUNTIME_CONFIG_RELEASES}/${runtime_digest#sha256:}"
  expected_current_target="releases/${runtime_digest#sha256:}"

  if [[ ! -L "${RUNTIME_CONFIG_CURRENT}" ]]; then
    fail "verified runtime config current pointer is missing"
  fi
  current_target="$(/usr/bin/readlink "${RUNTIME_CONFIG_CURRENT}")"
  if [[ "${current_target}" != "${expected_current_target}" ]]; then
    fail "runtime config current pointer does not match verified state"
  fi

  validate_release_files "${release_dir}"
  if [[ "$(runtime_config_content_sha256 "${release_dir}")" != "${runtime_content_sha}" ]]; then
    fail "runtime config release integrity check failed"
  fi

  printf '%s/compose.yaml' "${release_dir}"
}

active_compose_file="$(select_compose_file)"

compose() {
  "${DOCKER_BIN}" \
    compose \
    --project-name "${PROJECT_NAME}" \
    --project-directory "$(/usr/bin/dirname "${active_compose_file}")" \
    --env-file "${ENV_FILE}" \
    --file "${active_compose_file}" \
    "$@"
}

resolve_post_images_host_dir() {
  local rendered

  rendered="$(
    unset POST_IMAGES_HOST_DIR
    compose config --format json
  )"
  printf '%s' "${rendered}" \
    | "${PYTHON_BIN}" -c '
import json
import sys

config = json.load(sys.stdin)
sources = []
for service_name in ("api", "web"):
    service = config.get("services", {}).get(service_name, {})
    volumes = service.get("volumes", [])
    matches = [
        volume
        for volume in volumes
        if isinstance(volume, dict)
        and volume.get("type") == "bind"
        and volume.get("target") == "/data/post-images"
        and isinstance(volume.get("source"), str)
        and volume["source"]
    ]
    if len(matches) != 1:
        raise SystemExit(
            f"{service_name} must have exactly one post image bind mount"
        )
    sources.append(matches[0]["source"])
if sources[0] != sources[1]:
    raise SystemExit("API and web post image bind sources must match")
print(sources[0], end="")
'
}

post_images_host_dir="$(resolve_post_images_host_dir)"
if [[ ! -d "${post_images_host_dir}" ]]; then
  fail "post image directory does not exist: ${post_images_host_dir}"
fi

running_services="$(compose ps --status running --services)"
if ! /usr/bin/grep -qx db <<<"${running_services}"; then
  fail "production db service is not running"
fi

/bin/mkdir -p "${BACKUP_ROOT}"

timestamp="$(/bin/date -u '+%Y%m%dT%H%M%SZ')"
homeops_backup_started_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"
homeops_backup_event_key="cubing-hub:backup:${timestamp}"
report_homeops_backup RUNNING "" "cubing-hub/data/cubing-hub-production-${timestamp}" ""
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
