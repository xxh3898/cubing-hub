#!/bin/bash

set -Eeuo pipefail

umask 077

readonly DOCKER_BIN=/usr/local/bin/docker
readonly PYTHON_BIN=/usr/bin/python3
readonly AGE_BIN=/opt/homebrew/bin/age
readonly CURL_BIN=/usr/bin/curl
readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub
readonly PROJECT_NAME=cubing-hub
readonly LEGACY_COMPOSE_FILE="${APP_DIR}/compose.yaml"
readonly ENV_FILE="${APP_DIR}/.env"
readonly BACKUP_ROOT=/Users/homeserver/Server/backups/cubing-hub/data
readonly OFFSITE_STAGING_ROOT=/Users/homeserver/Server/backups/cubing-hub/offsite
readonly ICLOUD_ROOT='/Users/homeserver/Library/Mobile Documents/com~apple~CloudDocs/HomeServerBackups/cubing-hub'
readonly AGE_RECIPIENT_FILE="${APP_DIR}/backup-age-recipient-v1.txt"
readonly HEARTBEAT_CONFIG_FILE="${APP_DIR}/backup-heartbeats.conf"
readonly RUNTIME_CONFIG_ROOT="${APP_DIR}/runtime-config"
readonly RUNTIME_CONFIG_RELEASES="${RUNTIME_CONFIG_ROOT}/releases"
readonly RUNTIME_CONFIG_STATE="${RUNTIME_CONFIG_ROOT}/state"
readonly RUNTIME_CONFIG_CURRENT="${RUNTIME_CONFIG_ROOT}/current"
readonly RUNTIME_CONFIG_INITIALIZED="${APP_DIR}/.runtime-config-v2-initialized"
readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000

work_dir=
final_dir=
active_compose_file=
offsite_partial=
offsite_staged=false
local_heartbeat_url=
icloud_stage_heartbeat_url=
trigger=scheduled

usage() {
  printf 'Usage: backup-cubing-hub.sh [--trigger scheduled|predeploy]\n' >&2
}

fail() {
  printf 'Cubing Hub backup failed: %s\n' "$1" >&2
  exit 1
}

private_file_mode() {
  "${PYTHON_BIN}" - "$1" <<'PY'
import os
import stat
import sys

print(oct(stat.S_IMODE(os.stat(sys.argv[1]).st_mode))[2:])
PY
}

prepare_private_directory() {
  local directory="$1"

  if [[ -L "${directory}" ]] \
    || { [[ -e "${directory}" ]] && [[ ! -d "${directory}" ]]; }
  then
    fail "backup directory is unsafe"
  fi
  /bin/mkdir -p "${directory}"
  if [[ -L "${directory}" || ! -d "${directory}" ]]; then
    fail "backup directory is unsafe"
  fi
  /bin/chmod 700 "${directory}"
}

cleanup() {
  if [[ -n "${offsite_partial}" && -f "${offsite_partial}" ]]; then
    /bin/unlink "${offsite_partial}" || true
  fi
  if [[ -n "${work_dir}" && -d "${work_dir}" ]]; then
    printf 'Partial backup remains for inspection: %s\n' "${work_dir}" >&2
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --trigger)
      if [[ "$#" -lt 2 ]]; then
        usage
        exit 64
      fi
      trigger="$2"
      shift 2
      ;;
    *)
      usage
      exit 64
      ;;
  esac
done

if [[ "${trigger}" != scheduled && "${trigger}" != predeploy ]]; then
  usage
  exit 64
fi

if [[ ! -x "${DOCKER_BIN}" ]]; then
  fail "Docker CLI is not executable: ${DOCKER_BIN}"
fi

if [[ ! -x "${PYTHON_BIN}" ]]; then
  fail "Python is not executable: ${PYTHON_BIN}"
fi

validate_heartbeat_url() {
  local value="$1"

  if printf '%s' "${value}" | /usr/bin/grep -q '[[:space:]]'; then
    return 1
  fi
  case "${value}" in
    https://*/api/push/*|http://127.0.0.1:*/api/push/*|http://localhost:*/api/push/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

load_heartbeat_config() {
  local file_mode
  local line
  local local_seen=false
  local icloud_seen=false

  if [[ ! -e "${HEARTBEAT_CONFIG_FILE}" && ! -L "${HEARTBEAT_CONFIG_FILE}" ]]; then
    return 0
  fi
  if [[ ! -f "${HEARTBEAT_CONFIG_FILE}" || -L "${HEARTBEAT_CONFIG_FILE}" ]]; then
    fail "backup heartbeat configuration is missing or unsafe"
  fi
  file_mode="$(private_file_mode "${HEARTBEAT_CONFIG_FILE}")"
  if [[ "${file_mode}" != 600 ]]; then
    fail "backup heartbeat configuration mode must be 600"
  fi

  while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
      LOCAL_HEARTBEAT_URL=*)
        if [[ "${local_seen}" == true ]]; then
          fail "backup heartbeat configuration contains duplicate keys"
        fi
        local_seen=true
        local_heartbeat_url="${line#LOCAL_HEARTBEAT_URL=}"
        ;;
      ICLOUD_STAGE_HEARTBEAT_URL=*)
        if [[ "${icloud_seen}" == true ]]; then
          fail "backup heartbeat configuration contains duplicate keys"
        fi
        icloud_seen=true
        icloud_stage_heartbeat_url="${line#ICLOUD_STAGE_HEARTBEAT_URL=}"
        ;;
      *)
        fail "backup heartbeat configuration contains unexpected content"
        ;;
    esac
  done <"${HEARTBEAT_CONFIG_FILE}"

  if [[ "${local_seen}" != true || "${icloud_seen}" != true ]] \
    || ! validate_heartbeat_url "${local_heartbeat_url}" \
    || ! validate_heartbeat_url "${icloud_stage_heartbeat_url}"
  then
    fail "backup heartbeat configuration is incomplete or invalid"
  fi
}

send_heartbeat() {
  local channel="$1"
  local url

  case "${channel}" in
    local)
      url="${local_heartbeat_url}"
      ;;
    icloud-stage)
      url="${icloud_stage_heartbeat_url}"
      ;;
    *)
      return 64
      ;;
  esac
  if [[ -z "${url}" ]]; then
    return 0
  fi
  if [[ ! -x "${CURL_BIN}" ]] \
    || ! "${CURL_BIN}" \
      --fail \
      --silent \
      --connect-timeout 3 \
      --max-time 10 \
      "${url}" \
      >/dev/null 2>&1
  then
    printf 'Backup heartbeat delivery failed: %s\n' "${channel}" >&2
    return 1
  fi
}

load_heartbeat_config

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

prepare_private_directory "${BACKUP_ROOT}"

started_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"
timestamp="$(/bin/date -u '+%Y%m%dT%H%M%SZ')"
work_dir="$(
  /usr/bin/mktemp -d "${BACKUP_ROOT}/.cubing-hub-backup.XXXXXX"
)"
final_dir="${BACKUP_ROOT}/cubing-hub-production-${timestamp}"
db_dump_file="${work_dir}/database/dump"
db_version_file="${work_dir}/database/version.txt"
record_counts_file="${work_dir}/database/record-counts.tsv"
post_images_backup_dir="${work_dir}/files/post-images"
post_images_manifest="${work_dir}/files/sha256.txt"
post_images_stats="${work_dir}/files/stats.json"
database_references_file="${work_dir}/files/database-references.txt"

if [[ -e "${final_dir}" ]]; then
  fail "backup with the same timestamp already exists"
fi

/bin/mkdir -p "${work_dir}/database" "${post_images_backup_dir}"

# 첫 번째 copy는 dump와 동시에 삭제되는 image도 보존한다. 두 번째 copy는
# dump가 끝날 때까지 생성된 image를 추가하며 --delete는 사용하지 않는다.
/usr/bin/rsync -a "${post_images_host_dir}/" "${post_images_backup_dir}/"

# Variables expand inside the database container, not in this host shell.
# shellcheck disable=SC2016
compose exec -T db /bin/sh -ceu '
  # BACKUP_QUERY=dump
  export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
  exec mysqldump \
    --user=root \
    --default-character-set=utf8mb4 \
    --single-transaction \
    --quick \
    --complete-insert \
    --skip-extended-insert \
    --hex-blob \
    --routines \
    --triggers \
    "${MYSQL_DATABASE}"
' >"${db_dump_file}"

if [[ ! -s "${db_dump_file}" ]]; then
  fail "generated MySQL dump is empty"
fi
if ! /usr/bin/grep -q '^CREATE TABLE ' "${db_dump_file}" \
  || ! /usr/bin/grep -q '^-- Dump completed on ' "${db_dump_file}"
then
  fail "generated MySQL dump did not pass structural validation"
fi

/usr/bin/rsync -a "${post_images_host_dir}/" "${post_images_backup_dir}/"

# Row counts and file references must come from the exact transaction snapshot
# in database/dump. The restricted dump grammar fails closed instead of
# consulting a newer live database state after mysqldump has completed.
"${PYTHON_BIN}" - \
  "${db_dump_file}" \
  "${record_counts_file}" \
  "${database_references_file}" \
  "${post_images_backup_dir}" <<'PY'
import os
import pathlib
import re
import sys

dump_path = pathlib.Path(sys.argv[1])
record_counts_path = pathlib.Path(sys.argv[2])
references_path = pathlib.Path(sys.argv[3])
post_images_root = pathlib.Path(sys.argv[4])

safe_name_pattern = r"[A-Za-z0-9_]+"
structure_header = re.compile(
    rf"^-- Table structure for table `({safe_name_pattern})`$"
)
data_header = re.compile(
    rf"^-- Dumping data for table `({safe_name_pattern})`$"
)
create_table = re.compile(rf"^CREATE TABLE `({safe_name_pattern})` \(")
insert_row = re.compile(
    rf"^INSERT INTO `({safe_name_pattern})` \(([^)]*)\) VALUES \((.*)\);$"
)


def split_single_row_values(value_text):
    values = []
    start = 0
    index = 0
    in_string = False

    while index < len(value_text):
        character = value_text[index]
        if in_string:
            if character == "\\":
                index += 2
                if index > len(value_text):
                    raise ValueError("truncated MySQL string escape")
                continue
            if character == "'":
                if index + 1 < len(value_text) and value_text[index + 1] == "'":
                    index += 2
                    continue
                in_string = False
            index += 1
            continue

        if character == "'":
            in_string = True
        elif character == ",":
            values.append(value_text[start:index].strip())
            start = index + 1
        elif character in "()":
            raise ValueError("unexpected multi-row or expression grammar")
        index += 1

    if in_string:
        raise ValueError("unterminated MySQL string literal")
    values.append(value_text[start:].strip())
    if any(value == "" for value in values):
        raise ValueError("empty value in MySQL INSERT")
    return values


def decode_mysql_string(token):
    if len(token) < 2 or token[0] != "'" or token[-1] != "'":
        raise ValueError("object_key must be a MySQL string literal")

    body = token[1:-1]
    decoded = []
    escapes = {
        "0": "\0",
        "b": "\b",
        "n": "\n",
        "r": "\r",
        "t": "\t",
        "Z": "\x1a",
        "\\": "\\",
        "'": "'",
        '"': '"',
    }
    index = 0
    while index < len(body):
        character = body[index]
        if character == "\\":
            if index + 1 >= len(body):
                raise ValueError("truncated MySQL string escape")
            escaped = body[index + 1]
            decoded.append(escapes.get(escaped, escaped))
            index += 2
            continue
        if character == "'":
            if index + 1 < len(body) and body[index + 1] == "'":
                decoded.append("'")
                index += 2
                continue
            raise ValueError("unescaped quote in MySQL string literal")
        decoded.append(character)
        index += 1
    return "".join(decoded)


def validate_reference(value):
    if not value or value.startswith("/"):
        raise ValueError("post image object key is not relative")
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError("post image object key contains a control character")
    segments = value.split("/")
    if any(segment in ("", ".", "..") for segment in segments):
        raise ValueError("post image object key contains an unsafe path segment")
    return segments


base_tables = set()
created_tables = set()
record_counts = {}
references = []
data_sections = set()
current_data_table = None
current_create_table = None
post_attachment_object_key_declared = False

with dump_path.open("r", encoding="utf-8", newline="") as dump:
    for line_number, raw_line in enumerate(dump, start=1):
        line = raw_line.rstrip("\r\n")

        match = structure_header.fullmatch(line)
        if match:
            table_name = match.group(1)
            if table_name in base_tables:
                raise SystemExit(f"duplicate table structure at line {line_number}")
            base_tables.add(table_name)
            record_counts[table_name] = 0
            current_data_table = None
            continue
        if line.startswith("-- Table structure for table "):
            raise SystemExit(f"unsupported table name at line {line_number}")

        match = data_header.fullmatch(line)
        if match:
            table_name = match.group(1)
            if table_name not in base_tables:
                raise SystemExit(f"data section precedes structure at line {line_number}")
            if table_name in data_sections:
                raise SystemExit(f"duplicate data section at line {line_number}")
            data_sections.add(table_name)
            current_data_table = table_name
            continue
        if line.startswith("-- Dumping data for table "):
            raise SystemExit(f"unsupported data table name at line {line_number}")
        if line.startswith("-- "):
            current_data_table = None

        match = create_table.match(line)
        if match and match.group(1) in base_tables:
            current_create_table = match.group(1)
            created_tables.add(current_create_table)
        if current_create_table == "post_attachments" and re.match(
            r"^\s*`object_key`\s+", line
        ):
            post_attachment_object_key_declared = True
        if current_create_table is not None and line.endswith(";"):
            current_create_table = None

        if current_data_table is not None and line.startswith("INSERT INTO "):
            match = insert_row.fullmatch(line)
            if not match or match.group(1) != current_data_table:
                raise SystemExit(f"unsupported INSERT grammar at line {line_number}")
            columns = []
            for raw_column in match.group(2).split(","):
                raw_column = raw_column.strip()
                if not re.fullmatch(rf"`({safe_name_pattern})`", raw_column):
                    raise SystemExit(f"unsupported INSERT column at line {line_number}")
                columns.append(raw_column[1:-1])
            if len(columns) != len(set(columns)):
                raise SystemExit(f"duplicate INSERT column at line {line_number}")
            try:
                values = split_single_row_values(match.group(3))
            except ValueError as error:
                raise SystemExit(f"{error} at line {line_number}") from error
            if len(columns) != len(values):
                raise SystemExit(f"INSERT column/value mismatch at line {line_number}")

            record_counts[current_data_table] += 1
            if current_data_table == "post_attachments":
                if "object_key" not in columns:
                    raise SystemExit(
                        f"post_attachments INSERT lacks object_key at line {line_number}"
                    )
                try:
                    object_key = decode_mysql_string(
                        values[columns.index("object_key")]
                    )
                    validate_reference(object_key)
                except ValueError as error:
                    raise SystemExit(f"{error} at line {line_number}") from error
                references.append(object_key)

        if line == "UNLOCK TABLES;":
            current_data_table = None

if (
    not base_tables
    or base_tables != created_tables
    or base_tables != data_sections
):
    raise SystemExit("mysqldump base-table structure inventory is incomplete")
if "post_attachments" not in base_tables or not post_attachment_object_key_declared:
    raise SystemExit("post_attachments.object_key is missing from mysqldump structure")
if len(references) != record_counts["post_attachments"]:
    raise SystemExit("post attachment row and reference counts disagree")

record_counts_text = "".join(
    f"{table_name}\t{record_counts[table_name]}\n"
    for table_name in sorted(record_counts)
)
references_text = "".join(f"{reference}\n" for reference in sorted(references))
for target, content in (
    (record_counts_path, record_counts_text),
    (references_path, references_text),
):
    temporary = target.with_name(f".{target.name}.tmp")
    temporary.write_text(content, encoding="utf-8")
    os.replace(temporary, target)

missing = 0
for reference in references:
    candidate = post_images_root.joinpath(*validate_reference(reference))
    if not candidate.is_file() or candidate.is_symlink():
        missing += 1
if missing:
    raise SystemExit(
        f"{missing} post image file(s) referenced by database/dump are missing"
    )
PY

"${PYTHON_BIN}" - \
  "${post_images_backup_dir}" \
  "${post_images_manifest}" \
  "${post_images_stats}" <<'PY'
import hashlib
import json
import os
import pathlib
import stat
import sys

root = pathlib.Path(sys.argv[1])
manifest_path = pathlib.Path(sys.argv[2])
stats_path = pathlib.Path(sys.argv[3])
entries = []
total_bytes = 0

for path in sorted(root.rglob("*")):
    relative = path.relative_to(root).as_posix()
    if "\n" in relative or "\r" in relative:
        raise SystemExit("post image path contains a line break")
    mode = path.lstat().st_mode
    if stat.S_ISDIR(mode):
        continue
    if not stat.S_ISREG(mode):
        raise SystemExit("post image tree contains an unsupported file type")
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    size = path.stat().st_size
    entries.append((relative, digest.hexdigest(), size))
    total_bytes += size

with manifest_path.open("w", encoding="utf-8", newline="\n") as target:
    for relative, digest, _ in entries:
        target.write(f"{digest}  {relative}\n")

stats_path.write_text(
    json.dumps(
        {"count": len(entries), "bytes": total_bytes},
        sort_keys=True,
    ) + "\n",
    encoding="utf-8",
)
PY

# Variables expand inside the database container, not in this host shell.
# shellcheck disable=SC2016
compose exec -T db /bin/sh -ceu '
  # BACKUP_QUERY=version
  export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
  exec mysql \
    --user=root \
    --batch \
    --skip-column-names \
    "${MYSQL_DATABASE}" \
    --execute "SELECT VERSION()"
' >"${db_version_file}"

application_sha=unknown
runtime_config_digest=unknown
if [[ -f "${RUNTIME_CONFIG_STATE}" && ! -L "${RUNTIME_CONFIG_STATE}" ]]; then
  application_sha="$(read_state_value APPLICATION_REVISION)"
  runtime_config_digest="$(read_state_value RUNTIME_CONFIG_DIGEST)"
fi
completed_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"

"${PYTHON_BIN}" - \
  "${work_dir}" \
  "${trigger}" \
  "${started_at}" \
  "${completed_at}" \
  "${application_sha}" \
  "${runtime_config_digest}" \
  "${db_version_file}" \
  "${record_counts_file}" \
  "${post_images_stats}" \
  "${database_references_file}" <<'PY'
import hashlib
import json
import pathlib
import re
import sys

(
    work_dir_value,
    trigger,
    started_at,
    completed_at,
    application_sha,
    runtime_config_digest,
    version_file_value,
    record_counts_file_value,
    file_stats_value,
    database_references_file_value,
) = sys.argv[1:]
work_dir = pathlib.Path(work_dir_value)
dump_file = work_dir / "database" / "dump"
if not dump_file.is_file() or dump_file.is_symlink():
    raise SystemExit("database dump is missing or unsafe")

if application_sha != "unknown" and not re.fullmatch(r"[0-9a-f]{40}", application_sha):
    raise SystemExit("application revision has an unexpected format")
if runtime_config_digest != "unknown" and not re.fullmatch(
    r"sha256:[0-9a-f]{64}", runtime_config_digest
):
    raise SystemExit("runtime config digest has an unexpected format")

record_counts = {}
for raw_line in pathlib.Path(record_counts_file_value).read_text(encoding="utf-8").splitlines():
    table_name, separator, count_value = raw_line.partition("\t")
    if separator != "\t" or not re.fullmatch(r"[A-Za-z0-9_]+", table_name):
        raise SystemExit("database record count inventory is invalid")
    if table_name in record_counts or not count_value.isdigit():
        raise SystemExit("database record count inventory is invalid")
    record_counts[table_name] = int(count_value)
if not record_counts:
    raise SystemExit("database record count inventory is empty")

file_stats = json.loads(pathlib.Path(file_stats_value).read_text(encoding="utf-8"))
database_references_file = pathlib.Path(database_references_file_value)
if not database_references_file.is_file() or database_references_file.is_symlink():
    raise SystemExit("database reference manifest is missing or unsafe")
database_references = database_references_file.read_text(
    encoding="utf-8"
).splitlines()
if len(database_references) != record_counts.get("post_attachments"):
    raise SystemExit("database reference and post attachment counts disagree")


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

manifest = {
    "schemaVersion": 1,
    "status": "success",
    "project": "cubing-hub",
    "environment": "production",
    "trigger": trigger,
    "startedAt": started_at,
    "completedAt": completed_at,
    "source": {
        "applicationSha": application_sha,
        "runtimeConfigDigest": runtime_config_digest,
    },
    "database": {
        "engine": "mysql",
        "version": pathlib.Path(version_file_value).read_text(encoding="utf-8").strip(),
        "dumpFile": "database/dump",
        "bytes": dump_file.stat().st_size,
        "sha256": sha256(dump_file),
        "validator": "mysqldump structure and completion marker",
        "recordCounts": dict(sorted(record_counts.items())),
        "recordCountsSource": "database/dump",
    },
    "files": {
        "enabled": True,
        "directory": "files/post-images",
        "count": int(file_stats["count"]),
        "bytes": int(file_stats["bytes"]),
        "manifest": "files/sha256.txt",
        "databaseReferences": {
            "source": "database/dump",
            "manifest": "files/database-references.txt",
            "count": len(database_references),
            "sha256": sha256(database_references_file),
        },
    },
    "redis": {
        "included": False,
        "recovery": "rebuild rankings from MySQL",
    },
}
if not manifest["database"]["version"]:
    raise SystemExit("database version is empty")
(work_dir / "manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
)
PY

# SUCCESS는 모든 payload와 manifest 검증이 끝난 뒤 마지막으로 생성한다.
printf 'snapshot complete\n' >"${work_dir}/SUCCESS"

/bin/mv "${work_dir}" "${final_dir}"
work_dir=

"${PYTHON_BIN}" - "${BACKUP_ROOT}" <<'PY'
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import stat
import tempfile
import sys

root = pathlib.Path(sys.argv[1])
pattern = re.compile(r"cubing-hub-production-(\d{8}T\d{6}Z)")
valid = []
invalid = []

def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def safe_relative(value):
    if not isinstance(value, str) or not value or value.startswith("/"):
        raise ValueError("unsafe relative path")
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError("relative path contains a control character")
    if any(segment in ("", ".", "..") for segment in value.split("/")):
        raise ValueError("unsafe relative path segment")
    return value

for candidate in sorted(root.iterdir()):
    match = pattern.fullmatch(candidate.name)
    if not match:
        continue
    try:
        if candidate.is_symlink() or not candidate.is_dir():
            continue
        success = candidate / "SUCCESS"
        manifest_path = candidate / "manifest.json"
        if (
            not success.is_file()
            or success.is_symlink()
            or not manifest_path.is_file()
            or manifest_path.is_symlink()
        ):
            raise ValueError("marker or manifest missing")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if (
            manifest.get("schemaVersion") != 1
            or manifest.get("status") != "success"
            or manifest.get("project") != "cubing-hub"
            or manifest.get("environment") != "production"
        ):
            raise ValueError("manifest identity mismatch")
        database = manifest.get("database")
        if not isinstance(database, dict):
            raise ValueError("database contract missing")
        if (
            database.get("engine") != "mysql"
            or not isinstance(database.get("version"), str)
            or not database["version"]
            or database.get("validator")
            != "mysqldump structure and completion marker"
            or database.get("dumpFile") != "database/dump"
            or type(database.get("bytes")) is not int
            or database["bytes"] < 1
        ):
            raise ValueError("database contract mismatch")
        if database.get("recordCountsSource") != "database/dump":
            raise ValueError("record count source mismatch")
        record_counts = database.get("recordCounts")
        if not isinstance(record_counts, dict) or not record_counts:
            raise ValueError("record count inventory missing")
        for table_name, row_count in record_counts.items():
            if (
                not re.fullmatch(r"[A-Za-z0-9_]+", table_name)
                or type(row_count) is not int
                or row_count < 0
            ):
                raise ValueError("record count inventory invalid")
        if "post_attachments" not in record_counts:
            raise ValueError("post attachment count missing")

        dump = candidate / database["dumpFile"]
        if not dump.is_file() or dump.is_symlink():
            raise ValueError("dump missing")
        if dump.stat().st_size != database["bytes"]:
            raise ValueError("dump size mismatch")
        if sha256(dump) != database["sha256"]:
            raise ValueError("dump checksum mismatch")
        files = manifest.get("files")
        if not isinstance(files, dict):
            raise ValueError("file contract missing")
        if (
            files.get("enabled") is not True
            or files.get("directory") != "files/post-images"
            or files.get("manifest") != "files/sha256.txt"
            or type(files.get("count")) is not int
            or files["count"] < 0
            or type(files.get("bytes")) is not int
            or files["bytes"] < 0
        ):
            raise ValueError("file contract mismatch")
        file_root = candidate / files["directory"]
        checksum_file = candidate / files["manifest"]
        if not file_root.is_dir() or file_root.is_symlink():
            raise ValueError("file root missing")
        if not checksum_file.is_file() or checksum_file.is_symlink():
            raise ValueError("file checksum manifest missing")
        listed = {}
        for line in checksum_file.read_text(encoding="utf-8").splitlines():
            digest, separator, relative = line.partition("  ")
            if separator != "  " or not re.fullmatch(r"[0-9a-f]{64}", digest):
                raise ValueError("file checksum entry invalid")
            relative = safe_relative(relative)
            if relative in listed:
                raise ValueError("duplicate file checksum entry")
            path = file_root / relative
            if not path.is_file() or path.is_symlink() or sha256(path) != digest:
                raise ValueError("file checksum mismatch")
            listed[relative] = path.stat().st_size
        actual = {}
        for path in file_root.rglob("*"):
            mode = path.lstat().st_mode
            if stat.S_ISDIR(mode):
                continue
            if not stat.S_ISREG(mode):
                raise ValueError("file tree contains an unsupported entry")
            relative = safe_relative(path.relative_to(file_root).as_posix())
            actual[relative] = path.stat().st_size
        if listed != actual:
            raise ValueError("file inventory mismatch")
        if len(actual) != files["count"] or sum(actual.values()) != files["bytes"]:
            raise ValueError("file aggregate mismatch")

        references = files.get("databaseReferences")
        if (
            not isinstance(references, dict)
            or references.get("source") != "database/dump"
            or references.get("manifest") != "files/database-references.txt"
            or type(references.get("count")) is not int
            or references["count"] < 0
            or not re.fullmatch(r"[0-9a-f]{64}", references.get("sha256", ""))
        ):
            raise ValueError("database reference contract mismatch")
        reference_file = candidate / references["manifest"]
        if not reference_file.is_file() or reference_file.is_symlink():
            raise ValueError("database reference manifest missing")
        if sha256(reference_file) != references["sha256"]:
            raise ValueError("database reference checksum mismatch")
        reference_lines = [
            safe_relative(line)
            for line in reference_file.read_text(encoding="utf-8").splitlines()
        ]
        if (
            len(reference_lines) != references["count"]
            or references["count"] != record_counts["post_attachments"]
        ):
            raise ValueError("database reference count mismatch")
        if any(relative not in actual for relative in reference_lines):
            raise ValueError("database reference target missing")
        timestamp = dt.datetime.strptime(match.group(1), "%Y%m%dT%H%M%SZ").replace(
            tzinfo=dt.timezone.utc
        )
        valid.append((timestamp, candidate.name))
    except (KeyError, TypeError, ValueError, json.JSONDecodeError, OSError):
        invalid.append(candidate.name)

valid.sort(reverse=True)
keep = {name for _, name in valid[:4]}
kst = dt.timezone(dt.timedelta(hours=9))
today = dt.datetime.now(dt.timezone.utc).astimezone(kst).date()
for offset in range(1, 8):
    target_date = today - dt.timedelta(days=offset)
    eligible = [
        (timestamp, name)
        for timestamp, name in valid
        if timestamp.astimezone(kst).date() == target_date
        and timestamp.astimezone(kst).time() >= dt.time(6, 0)
    ]
    if eligible:
        keep.add(min(eligible)[1])

plan = {
    "schemaVersion": 1,
    "project": "cubing-hub",
    "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
    "mode": "dry-run",
    "policy": {"recent": 4, "dailyAtOrAfterKst": "06:00", "dailyDays": 7},
    "keep": sorted(keep),
    "pruneCandidates": sorted(name for _, name in valid if name not in keep),
    "invalidIgnored": sorted(invalid),
}
handle = tempfile.NamedTemporaryFile(
    mode="w",
    encoding="utf-8",
    dir=root,
    prefix=".retention-plan.",
    delete=False,
)
try:
    json.dump(plan, handle, ensure_ascii=False, indent=2, sort_keys=True)
    handle.write("\n")
    handle.flush()
    os.fchmod(handle.fileno(), 0o600)
    handle.close()
    os.replace(handle.name, root / "retention-plan.json")
except BaseException:
    handle.close()
    pathlib.Path(handle.name).unlink(missing_ok=True)
    raise
PY

stage_offsite_snapshot() {
  local ciphertext
  local ciphertext_sha
  local icloud_final
  local icloud_final_sha
  local local_partial
  local offsite_copy_sha
  local snapshot_name

  if [[ ! -x "${AGE_BIN}" ]] \
    || [[ ! -f "${AGE_RECIPIENT_FILE}" ]] \
    || [[ -L "${AGE_RECIPIENT_FILE}" ]]
  then
    printf 'Offsite stage skipped: age recipient is not installed\n' >&2
    return 0
  fi
  if ! /usr/bin/grep -Eq '^age1[0-9a-z]+$' "${AGE_RECIPIENT_FILE}" \
    || [[ "$(/usr/bin/wc -l <"${AGE_RECIPIENT_FILE}" | /usr/bin/tr -d ' ')" != 1 ]]
  then
    printf 'Offsite stage failed: age recipient file is invalid\n' >&2
    return 1
  fi
  if [[ "$(private_file_mode "${AGE_RECIPIENT_FILE}")" != 600 ]]; then
    printf 'Offsite stage failed: age recipient file mode must be 600\n' >&2
    return 1
  fi

  for directory in "${OFFSITE_STAGING_ROOT}" "${ICLOUD_ROOT}"; do
    if [[ -L "${directory}" ]] \
      || { [[ -e "${directory}" ]] && [[ ! -d "${directory}" ]]; }
    then
      printf 'Offsite stage failed: target directory is unsafe\n' >&2
      return 1
    fi
    if ! /bin/mkdir -p "${directory}" \
      || [[ -L "${directory}" ]] \
      || [[ ! -d "${directory}" ]] \
      || ! /bin/chmod 700 "${directory}"
    then
      printf 'Offsite stage failed: target directory preparation failed\n' >&2
      return 1
    fi
  done

  if ! snapshot_name="$(/usr/bin/basename "${final_dir}")" \
    || [[ -z "${snapshot_name}" ]]
  then
    printf 'Offsite stage failed: snapshot name resolution failed\n' >&2
    return 1
  fi
  ciphertext="${OFFSITE_STAGING_ROOT}/${snapshot_name}.tar.age"
  icloud_final="${ICLOUD_ROOT}/${snapshot_name}.tar.age"
  if [[ -e "${ciphertext}" || -L "${ciphertext}" ]]; then
    printf 'Offsite stage failed: local ciphertext already exists\n' >&2
    return 1
  fi

  if ! local_partial="$(
    /usr/bin/mktemp "${OFFSITE_STAGING_ROOT}/.${snapshot_name}.XXXXXX.partial"
  )"
  then
    printf 'Offsite stage failed: local ciphertext staging failed\n' >&2
    return 1
  fi
  if [[ ! -f "${local_partial}" || -L "${local_partial}" ]] \
    || ! /bin/chmod 600 "${local_partial}"
  then
    if [[ -f "${local_partial}" && ! -L "${local_partial}" ]]; then
      /bin/unlink "${local_partial}" || true
    fi
    printf 'Offsite stage failed: local ciphertext staging failed\n' >&2
    return 1
  fi
  if ! /usr/bin/tar -C "${BACKUP_ROOT}" -cf - "${snapshot_name}" \
    | "${AGE_BIN}" -R "${AGE_RECIPIENT_FILE}" >"${local_partial}"
  then
    /bin/unlink "${local_partial}" || true
    printf 'Offsite stage failed: age encryption failed\n' >&2
    return 1
  fi
  if [[ ! -s "${local_partial}" ]] \
    || ! /usr/bin/head -n 1 "${local_partial}" \
      | /usr/bin/grep -Fqx 'age-encryption.org/v1'
  then
    /bin/unlink "${local_partial}" || true
    printf 'Offsite stage failed: ciphertext validation failed\n' >&2
    return 1
  fi
  if ! /bin/mv "${local_partial}" "${ciphertext}"; then
    /bin/unlink "${local_partial}" || true
    printf 'Offsite stage failed: local ciphertext publish failed\n' >&2
    return 1
  fi
  local_partial=
  if [[ ! -f "${ciphertext}" || -L "${ciphertext}" ]]; then
    printf 'Offsite stage failed: local ciphertext publish validation failed\n' >&2
    return 1
  fi

  if ! ciphertext_sha="$(
    /usr/bin/shasum -a 256 "${ciphertext}" | /usr/bin/awk '{print $1}'
  )" \
    || [[ -z "${ciphertext_sha}" ]]
  then
    printf 'Offsite stage failed: local ciphertext checksum unavailable\n' >&2
    return 1
  fi
  if [[ -e "${icloud_final}" || -L "${icloud_final}" ]]; then
    if [[ ! -f "${icloud_final}" || -L "${icloud_final}" ]]; then
      printf 'Offsite stage failed: iCloud target collision\n' >&2
      return 1
    fi
    if ! icloud_final_sha="$(
      /usr/bin/shasum -a 256 "${icloud_final}" | /usr/bin/awk '{print $1}'
    )" \
      || [[ -z "${icloud_final_sha}" ]]
    then
      printf 'Offsite stage failed: iCloud final checksum unavailable\n' >&2
      return 1
    fi
    if [[ "${icloud_final_sha}" != "${ciphertext_sha}" ]]; then
      printf 'Offsite stage failed: iCloud target collision\n' >&2
      return 1
    fi
  else
    if ! offsite_partial="$(
      /usr/bin/mktemp "${ICLOUD_ROOT}/.${snapshot_name}.XXXXXX.partial"
    )"
    then
      printf 'Offsite stage failed: iCloud partial creation failed\n' >&2
      return 1
    fi
    if [[ ! -f "${offsite_partial}" || -L "${offsite_partial}" ]] \
      || ! /bin/cp "${ciphertext}" "${offsite_partial}" \
      || ! /bin/chmod 600 "${offsite_partial}"
    then
      printf 'Offsite stage failed: iCloud partial staging failed\n' >&2
      return 1
    fi
    if ! offsite_copy_sha="$(
      /usr/bin/shasum -a 256 "${offsite_partial}" | /usr/bin/awk '{print $1}'
    )" \
      || [[ -z "${offsite_copy_sha}" ]] \
      || [[ "${offsite_copy_sha}" != "${ciphertext_sha}" ]]
    then
      printf 'Offsite stage failed: iCloud handoff checksum mismatch\n' >&2
      return 1
    fi
    if ! /bin/mv "${offsite_partial}" "${icloud_final}"; then
      printf 'Offsite stage failed: iCloud final publish failed\n' >&2
      return 1
    fi
    offsite_partial=
    if [[ ! -f "${icloud_final}" || -L "${icloud_final}" ]]; then
      printf 'Offsite stage failed: iCloud final validation failed\n' >&2
      return 1
    fi
    if ! icloud_final_sha="$(
      /usr/bin/shasum -a 256 "${icloud_final}" | /usr/bin/awk '{print $1}'
    )" \
      || [[ -z "${icloud_final_sha}" ]] \
      || [[ "${icloud_final_sha}" != "${ciphertext_sha}" ]]
    then
      printf 'Offsite stage failed: iCloud final checksum mismatch\n' >&2
      return 1
    fi
  fi

  if ! /bin/unlink "${ciphertext}"; then
    printf 'Offsite stage warning: local ciphertext cleanup failed\n' >&2
  fi
  offsite_staged=true
  printf 'OFFSITE_QUEUED=%s\n' "${icloud_final}"
  return 0
}

printf 'Backup completed: %s\n' "${final_dir}"
printf 'Retention dry-run plan: %s\n' "${BACKUP_ROOT}/retention-plan.json"
send_heartbeat local || true
if ! stage_offsite_snapshot; then
  if [[ "${trigger}" == predeploy ]]; then
    printf 'Predeploy continues because the verified local snapshot succeeded\n' >&2
  else
    fail "local snapshot succeeded but offsite staging failed"
  fi
fi
if [[ "${offsite_staged}" == true ]]; then
  send_heartbeat icloud-stage || true
fi
