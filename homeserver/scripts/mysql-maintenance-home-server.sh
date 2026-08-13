#!/bin/bash

set -Eeuo pipefail

readonly DOCKER_BIN=/usr/local/bin/docker
readonly LOCKF_BIN=/usr/bin/lockf
readonly PYTHON_BIN=/usr/bin/python3
readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub
readonly ENV_FILE="${APP_DIR}/.env"
readonly BACKUP_ROOT=/Users/homeserver/Server/backups/cubing-hub/data
readonly PROJECT_NAME=cubing-hub
readonly RUNTIME_CONFIG_ROOT="${APP_DIR}/runtime-config"
readonly RUNTIME_CONFIG_RELEASES="${RUNTIME_CONFIG_ROOT}/releases"
readonly RUNTIME_CONFIG_STATE="${RUNTIME_CONFIG_ROOT}/state"
readonly RUNTIME_CONFIG_PENDING="${RUNTIME_CONFIG_ROOT}/pending"
readonly RUNTIME_CONFIG_CURRENT="${RUNTIME_CONFIG_ROOT}/current"
readonly RUNTIME_CONFIG_INITIALIZED="${APP_DIR}/.runtime-config-v2-initialized"
readonly MAINTENANCE_ROOT="${RUNTIME_CONFIG_ROOT}/mysql-maintenance"
readonly MAINTENANCE_CANDIDATES="${MAINTENANCE_ROOT}/candidates"
readonly MAINTENANCE_RESTORES="${MAINTENANCE_ROOT}/restores"
readonly MAINTENANCE_STATE="${MAINTENANCE_ROOT}/state"
readonly OPERATION_LOCK="${APP_DIR}/.cubing-hub-operation.lock"
readonly RUNTIME_CONFIG_REPOSITORY=ghcr.io/xxh3898/cubing-hub-runtime-config
readonly API_IMAGE_REPOSITORY=ghcr.io/xxh3898/cubing-hub-api
readonly WEB_IMAGE_REPOSITORY=ghcr.io/xxh3898/cubing-hub-web
readonly SOURCE_DB_VERSION=8.0.46
readonly TARGET_DB_VERSION=8.4.11
readonly HEALTH_TIMEOUT_SECONDS=240
readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000

usage() {
  cat >&2 <<'USAGE'
Usage:
  mysql-maintenance-cubing-hub.sh prepare-upgrade <runtime-digest> <runtime-revision> <mysql:8.4.11@sha256:digest> <backup-id> <registry-user>
  mysql-maintenance-cubing-hub.sh verify-rollback-volume <upgrade-candidate-id> <rollback-volume> <validation-container>
  mysql-maintenance-cubing-hub.sh prepare-rollback <upgrade-candidate-id> <rollback-volume>
  mysql-maintenance-cubing-hub.sh apply <candidate-id> WRITE_STOP_CONFIRMED
  mysql-maintenance-cubing-hub.sh recover
USAGE
  exit 64
}

fail() {
  printf 'Cubing Hub MySQL maintenance failed: %s\n' "$1" >&2
  exit 1
}

is_digest() {
  [[ "$1" =~ ^sha256:[0-9a-f]{64}$ ]] && [[ "$1" != "${ZERO_DIGEST}" ]]
}

is_sha() {
  [[ "$1" =~ ^[0-9a-f]{40}$ ]] && [[ "$1" != "${ZERO_SHA}" ]]
}

is_image_id() {
  [[ "$1" =~ ^sha256:[0-9a-f]{64}$ ]]
}

is_candidate_id() {
  [[ "$1" =~ ^[0-9a-f]{64}$ ]]
}

is_volume_name() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]]
}

is_backup_id() {
  [[ "$1" =~ ^cubing-hub-production-[0-9]{8}T[0-9]{6}Z$ ]]
}

has_mode() {
  "${PYTHON_BIN}" -c \
    'import os, stat, sys; raise SystemExit(0 if stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == int(sys.argv[2], 8) else 1)' \
    "$1" "$2"
}

ensure_private_directory() {
  local directory="$1"

  if [[ -L "${directory}" ]] \
    || { [[ -e "${directory}" ]] && [[ ! -d "${directory}" ]]; }
  then
    fail "maintenance directory is unsafe: ${directory}"
  fi
  if [[ ! -d "${directory}" ]]; then
    /bin/mkdir "${directory}"
    /bin/chmod 700 "${directory}"
  fi
  has_mode "${directory}" 700 \
    || fail "maintenance directory mode must be 700: ${directory}"
}

acquire_operation_lock() {
  local lock_status

  if [[ ! -x "${PYTHON_BIN}" ]]; then
    fail "Python is not executable: ${PYTHON_BIN}"
  fi
  if [[ ! -x "${LOCKF_BIN}" ]]; then
    fail "lockf is not executable: ${LOCKF_BIN}"
  fi
  if [[ -L "${OPERATION_LOCK}" ]] \
    || { [[ -e "${OPERATION_LOCK}" ]] && [[ ! -f "${OPERATION_LOCK}" ]]; }
  then
    fail "operation lock path must be a regular non-symlink file"
  fi

  umask 077
  if ! exec 9>>"${OPERATION_LOCK}"; then
    fail "operation lock file could not be opened"
  fi
  /bin/chmod 600 "${OPERATION_LOCK}"
  if "${LOCKF_BIN}" -s -t 0 9; then
    return
  else
    lock_status="$?"
  fi
  exec 9>&-
  if [[ "${lock_status}" -eq 75 ]]; then
    printf 'Another Cubing Hub deploy, backup, or maintenance operation is already running\n' >&2
    exit 75
  fi
  fail "operation lock validation failed"
}

read_exact_value() {
  local file="$1"
  local key="$2"
  local value

  value="$(
    /usr/bin/awk -F= -v key="${key}" '
      $1 == key {
        value = substr($0, index($0, "=") + 1)
        count += 1
      }
      END {
        if (count != 1) {
          exit 1
        }
        print value
      }
    ' "${file}"
  )" || fail "${key} must appear exactly once in ${file}"
  if [[ "${value}" == *$'\n'* || "${value}" == *$'\r'* ]]; then
    fail "${key} contains an unsafe line break"
  fi
  printf '%s' "${value}"
}

read_env_value() {
  read_exact_value "${ENV_FILE}" "$1"
}

validate_initialization_marker() {
  if [[ ! -f "${RUNTIME_CONFIG_INITIALIZED}" ]] \
    || [[ -L "${RUNTIME_CONFIG_INITIALIZED}" ]] \
    || [[ "$(/bin/cat "${RUNTIME_CONFIG_INITIALIZED}")" != RUNTIME_CONFIG_V2=initialized ]]
  then
    fail "runtime config initialization marker is invalid"
  fi
}

validate_state_file() {
  local application_revision
  local keys
  local previous_digest
  local previous_revision
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

  application_revision="$(read_exact_value "${RUNTIME_CONFIG_STATE}" APPLICATION_REVISION)"
  previous_revision="$(read_exact_value "${RUNTIME_CONFIG_STATE}" PREVIOUS_APPLICATION_REVISION)"
  previous_digest="$(read_exact_value "${RUNTIME_CONFIG_STATE}" PREVIOUS_RUNTIME_CONFIG_DIGEST)"
  runtime_content_sha="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_CONTENT_SHA256)"
  runtime_digest="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_DIGEST)"
  runtime_revision="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_REVISION)"

  if ! is_sha "${application_revision}" \
    || [[ ! "${previous_revision}" =~ ^[0-9a-f]{40}$ ]] \
    || { [[ "${previous_digest}" != "${ZERO_DIGEST}" ]] && ! is_digest "${previous_digest}"; } \
    || [[ ! "${runtime_content_sha}" =~ ^[0-9a-f]{64}$ ]] \
    || ! is_digest "${runtime_digest}" \
    || ! is_sha "${runtime_revision}"
  then
    fail "runtime config state values are invalid"
  fi
}

validate_release_files() {
  local entries
  local release_dir="$1"
  local script
  local unexpected

  if [[ ! -d "${release_dir}" || -L "${release_dir}" ]]; then
    fail "runtime config release is missing or unsafe"
  fi
  unexpected="$(/usr/bin/find "${release_dir}" ! -type d ! -type f -print)"
  if [[ -n "${unexpected}" ]]; then
    fail "runtime config contains unsupported file types"
  fi
  entries="$(
    /usr/bin/find "${release_dir}" -mindepth 1 -print \
      | /usr/bin/sed "s#^${release_dir}/##" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${entries}" != $'compose.yaml\nnginx\nnginx/cloudflare-edge-real-ip.conf\nscripts\nscripts/backup-cubing-hub.sh\nscripts/deploy-cubing-hub.sh' ]]; then
    fail "runtime config entry allowlist does not match"
  fi
  for script in \
    "${release_dir}/scripts/backup-cubing-hub.sh" \
    "${release_dir}/scripts/deploy-cubing-hub.sh"
  do
    if [[ ! -x "${script}" || -L "${script}" ]]; then
      fail "runtime config script is missing, unsafe, or not executable"
    fi
    if ! "${PYTHON_BIN}" -c \
      'import os, stat, sys; raise SystemExit(0 if stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == 0o700 else 1)' \
      "${script}"
    then
      fail "runtime config script mode must be 700"
    fi
    /bin/bash -n "${script}" || fail "runtime config script syntax is invalid"
  done
}

runtime_config_content_sha256() {
  local release_dir="$1"

  {
    /usr/bin/shasum -a 256 "${release_dir}/compose.yaml"
    /usr/bin/shasum -a 256 "${release_dir}/nginx/cloudflare-edge-real-ip.conf"
    /usr/bin/shasum -a 256 "${release_dir}/scripts/backup-cubing-hub.sh"
    /usr/bin/shasum -a 256 "${release_dir}/scripts/deploy-cubing-hub.sh"
  } | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
}

load_current_runtime() {
  local expected_current

  validate_initialization_marker
  validate_state_file
  current_application_revision="$(read_exact_value "${RUNTIME_CONFIG_STATE}" APPLICATION_REVISION)"
  current_runtime_digest="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_DIGEST)"
  current_runtime_revision="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_REVISION)"
  current_runtime_content_sha="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_CONTENT_SHA256)"
  current_release="${RUNTIME_CONFIG_RELEASES}/${current_runtime_digest#sha256:}"
  expected_current="releases/${current_runtime_digest#sha256:}"
  if [[ ! -L "${RUNTIME_CONFIG_CURRENT}" ]] \
    || [[ "$(/usr/bin/readlink "${RUNTIME_CONFIG_CURRENT}")" != "${expected_current}" ]]
  then
    fail "runtime config current pointer does not match verified state"
  fi
  validate_release_files "${current_release}"
  if [[ "$(runtime_config_content_sha256 "${current_release}")" != "${current_runtime_content_sha}" ]]; then
    fail "runtime config release integrity check failed"
  fi

  current_api_image="$(read_env_value API_IMAGE)"
  current_web_image="$(read_env_value WEB_IMAGE)"
  if [[ "${current_api_image}" != "${API_IMAGE_REPOSITORY}:${current_application_revision}" ]] \
    || [[ "${current_web_image}" != "${WEB_IMAGE_REPOSITORY}:${current_application_revision}" ]]
  then
    fail "application images do not match verified runtime state"
  fi
}

render_compose_json() {
  local api_image="$2"
  local compose_file="$1"
  local db_image="${4:-}"
  local db_volume="${5:-}"
  local web_image="$3"

  if [[ -n "${db_image}" && -n "${db_volume}" ]]; then
    API_IMAGE="${api_image}" \
    WEB_IMAGE="${web_image}" \
    DB_IMAGE="${db_image}" \
    DB_VOLUME_NAME="${db_volume}" \
      "${DOCKER_BIN}" compose \
        --project-name "${PROJECT_NAME}" \
        --project-directory "$(/usr/bin/dirname "${compose_file}")" \
        --env-file "${ENV_FILE}" \
        --file "${compose_file}" \
        config --no-env-resolution --format json
    return
  fi

  API_IMAGE="${api_image}" \
  WEB_IMAGE="${web_image}" \
    "${DOCKER_BIN}" compose \
      --project-name "${PROJECT_NAME}" \
      --project-directory "$(/usr/bin/dirname "${compose_file}")" \
      --env-file "${ENV_FILE}" \
      --file "${compose_file}" \
      config --no-env-resolution --format json
}

extract_db_contract() {
  "${PYTHON_BIN}" -c '
import json
import re
import sys

config = json.load(sys.stdin)
db = config.get("services", {}).get("db", {})
image = db.get("image")
volume = config.get("volumes", {}).get("mysql-data", {})
volume_name = volume.get("name")
if not isinstance(image, str) or not image:
    raise SystemExit("MySQL image contract is invalid")
if not isinstance(volume_name, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", volume_name):
    raise SystemExit("MySQL volume contract is invalid")
print(f"{image}\t{volume_name}")
'
}

validate_maintenance_compose_contract() {
  local baseline_json="$1"
  local candidate_json="$2"
  local expected_db_image="$3"
  local expected_db_volume="$4"
  local candidate_release_dir="$5"

  printf '[%s,%s]' "${candidate_json}" "${baseline_json}" \
    | "${PYTHON_BIN}" -c '
import copy
import json
import pathlib
import sys

candidate, baseline = json.load(sys.stdin)
expected_db_image, expected_db_volume, candidate_release = sys.argv[1:4]
required = {"db", "redis", "api", "web"}

def fail(message):
    raise SystemExit(message)

candidate_services = candidate.get("services", {})
baseline_services = baseline.get("services", {})
if set(candidate_services) != required or set(baseline_services) != required:
    fail("maintenance runtime service set is invalid")
if candidate_services["api"].get("image") != baseline_services["api"].get("image"):
    fail("maintenance candidate changes the API image")
if candidate_services["web"].get("image") != baseline_services["web"].get("image"):
    fail("maintenance candidate changes the Web image")
if candidate_services["redis"] != baseline_services["redis"]:
    fail("maintenance candidate changes Redis")

candidate_db = copy.deepcopy(candidate_services["db"])
baseline_db = copy.deepcopy(baseline_services["db"])
if candidate_db.pop("image", None) != expected_db_image:
    fail("maintenance candidate DB image is not the exact target")
candidate_db.pop("volumes", None)
baseline_db.pop("image", None)
baseline_db.pop("volumes", None)
if candidate_db != baseline_db:
    fail("maintenance candidate changes the DB contract beyond image or volume")

def normalize_web(service):
    value = copy.deepcopy(service)
    for mount in value.get("volumes", []):
        if mount.get("target") == "/etc/nginx/conf.d/00-cloudflare-real-ip.conf":
            mount["source"] = "<verified-release>/nginx/cloudflare-edge-real-ip.conf"
    return value

if candidate_services["api"] != baseline_services["api"]:
    fail("maintenance candidate changes the API runtime contract")
if normalize_web(candidate_services["web"]) != normalize_web(baseline_services["web"]):
    fail("maintenance candidate changes the Web runtime contract")
if candidate.get("networks") != baseline.get("networks"):
    fail("maintenance candidate changes the network contract")

candidate_volumes = candidate.get("volumes", {})
baseline_volumes = baseline.get("volumes", {})
if set(candidate_volumes) != {"mysql-data", "redis-data"}:
    fail("maintenance candidate volume set is invalid")
if candidate_volumes.get("redis-data") != baseline_volumes.get("redis-data"):
    fail("maintenance candidate changes the Redis volume")
mysql_volume = candidate_volumes.get("mysql-data", {})
if (
    mysql_volume.get("name") != expected_db_volume
    or mysql_volume.get("external") is True
    or mysql_volume.get("driver") not in (None, "local")
    or mysql_volume.get("driver_opts")
):
    fail("maintenance candidate MySQL volume is invalid")

mounts = candidate_services["db"].get("volumes", [])
if len(mounts) != 1 or mounts[0].get("target") != "/var/lib/mysql":
    fail("maintenance candidate DB mount is invalid")
expected_real_ip = str(pathlib.Path(candidate_release) / "nginx" / "cloudflare-edge-real-ip.conf")
real_ip_mounts = [
    mount for mount in candidate_services["web"].get("volumes", [])
    if mount.get("target") == "/etc/nginx/conf.d/00-cloudflare-real-ip.conf"
]
if len(real_ip_mounts) != 1 or real_ip_mounts[0].get("source") != expected_real_ip:
    fail("maintenance candidate does not use its verified Nginx configuration")
' "${expected_db_image}" "${expected_db_volume}" "${candidate_release_dir}"
}

compose_for() {
  local db_image="$2"
  local db_volume="$3"
  local release_dir="$1"
  shift 3

  API_IMAGE="${current_api_image}" \
  WEB_IMAGE="${current_web_image}" \
  DB_IMAGE="${db_image}" \
  DB_VOLUME_NAME="${db_volume}" \
    "${DOCKER_BIN}" compose \
      --project-name "${PROJECT_NAME}" \
      --project-directory "${release_dir}" \
      --env-file "${ENV_FILE}" \
      --file "${release_dir}/compose.yaml" \
      "$@"
}

image_id_for() {
  local image_id

  image_id="$("${DOCKER_BIN}" image inspect --format '{{.Id}}' "$1")"
  is_image_id "${image_id}" || fail "Docker image ID is invalid for $1"
  printf '%s' "${image_id}"
}

exact_image_ref_for() {
  local image="$1"
  local repo_digests

  repo_digests="$("${DOCKER_BIN}" image inspect --format '{{json .RepoDigests}}' "${image}")"
  printf '%s' "${repo_digests}" \
    | "${PYTHON_BIN}" -c '
import json
import re
import sys

tag = sys.argv[1]
values = json.load(sys.stdin)
digests = []
for value in values:
    match = re.search(r"@(?P<digest>sha256:[0-9a-f]{64})$", value)
    if match:
        digests.append(match.group("digest"))
if len(set(digests)) != 1:
    raise SystemExit("image does not resolve to one exact repository digest")
print("{}@{}".format(tag.split("@", 1)[0], digests[0]), end="")
' "${image}"
}

validate_actual_db_identity() {
  local actual_health
  local actual_image_id
  local actual_project
  local actual_service
  local actual_volume
  local container_id
  local expected_image="$1"
  local expected_image_id="$2"
  local expected_volume="$3"
  local release_dir="$4"
  local volume_users

  container_id="$(compose_for "${release_dir}" "${expected_image}" "${expected_volume}" ps -q db)"
  if [[ -z "${container_id}" ]] \
    || [[ ! "${container_id}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]]
  then
    fail "running MySQL container identity is missing or invalid"
  fi
  actual_image_id="$("${DOCKER_BIN}" container inspect --format '{{.Image}}' "${container_id}")"
  actual_volume="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}' \
      "${container_id}"
  )"
  actual_project="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{ index .Config.Labels "com.docker.compose.project" }}' \
      "${container_id}"
  )"
  actual_service="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{ index .Config.Labels "com.docker.compose.service" }}' \
      "${container_id}"
  )"
  actual_health="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "${container_id}"
  )"
  volume_users="$(
    "${DOCKER_BIN}" ps -a --no-trunc \
      --filter "volume=${expected_volume}" \
      --format '{{.ID}}'
  )"
  [[ "${actual_image_id}" == "${expected_image_id}" ]] \
    || fail "actual MySQL image does not match the expected image ID"
  [[ "${actual_volume}" == "${expected_volume}" ]] \
    || fail "actual MySQL mount does not match the expected volume"
  [[ "${actual_project}" == "${PROJECT_NAME}" && "${actual_service}" == db ]] \
    || fail "actual MySQL container does not belong to the expected Compose service"
  [[ "${actual_health}" == healthy ]] \
    || fail "actual MySQL container is not healthy"
  [[ "${volume_users}" == "${container_id}" ]] \
    || fail "actual MySQL volume attachment set does not contain only the expected container"
}

validate_target_artifacts() {
  local attached
  local target_image_id
  local volume_backup_label
  local volume_driver
  local volume_name

  target_image_id="$(image_id_for "${candidate_target_db_image_exact}")"
  [[ "${target_image_id}" == "${candidate_target_db_image_id}" ]] \
    || fail "candidate target DB image ID has changed"
  volume_name="$(
    "${DOCKER_BIN}" volume inspect --format '{{.Name}}' "${candidate_target_db_volume}"
  )"
  volume_driver="$(
    "${DOCKER_BIN}" volume inspect --format '{{.Driver}}' "${candidate_target_db_volume}"
  )"
  [[ "${volume_name}" == "${candidate_target_db_volume}" ]] \
    && [[ "${volume_driver}" == local ]] \
    || fail "candidate target DB volume is missing or unsafe"
  if [[ "${candidate_operation}" == ROLLBACK ]]; then
    volume_backup_label="$(
      "${DOCKER_BIN}" volume inspect \
        --format '{{ index .Labels "io.chochiho.cubing-hub.mysql-restore-backup" }}' \
        "${candidate_target_db_volume}"
    )"
    [[ "${volume_backup_label}" == "${candidate_backup_id}" ]] \
      || fail "rollback target volume is not bound to the verified backup"
    attached="$(
      "${DOCKER_BIN}" ps -a \
        --filter "volume=${candidate_target_db_volume}" \
        --format '{{.ID}}'
    )"
    [[ -z "${attached}" ]] \
      || fail "rollback target volume is still attached to another container"
  fi
}

load_current_db_identity() {
  local contract
  local rendered

  rendered="$(
    render_compose_json \
      "${current_release}/compose.yaml" \
      "${current_api_image}" \
      "${current_web_image}"
  )"
  contract="$(printf '%s' "${rendered}" | extract_db_contract)"
  IFS=$'\t' read -r current_db_image current_db_volume <<<"${contract}"
  is_volume_name "${current_db_volume}" || fail "current MySQL volume name is invalid"
  current_db_image_id="$(image_id_for "${current_db_image}")"
  current_db_image_exact="$(exact_image_ref_for "${current_db_image}")"
  validate_actual_db_identity \
    "${current_db_image}" \
    "${current_db_image_id}" \
    "${current_db_volume}" \
    "${current_release}"
}

validate_backup() {
  local backup_id="$1"
  local backup_path="${BACKUP_ROOT}/${backup_id}"

  is_backup_id "${backup_id}" || fail "backup identifier is invalid"
  if [[ ! -d "${backup_path}" || -L "${backup_path}" ]]; then
    fail "verified backup directory is missing or unsafe"
  fi
  backup_manifest_sha="$(
    "${PYTHON_BIN}" - "${backup_path}" <<'PY'
import hashlib
import json
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
success = root / "SUCCESS"
manifest_path = root / "manifest.json"
if (
    not success.is_file()
    or success.is_symlink()
    or not manifest_path.is_file()
    or manifest_path.is_symlink()
):
    raise SystemExit("backup SUCCESS marker or manifest is missing")
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
database = manifest.get("database", {})
if (
    manifest.get("schemaVersion") != 1
    or manifest.get("status") != "success"
    or manifest.get("project") != "cubing-hub"
    or manifest.get("environment") != "production"
    or database.get("engine") != "mysql"
    or not re.fullmatch(r"8\.0\.46(?:[-+].*)?", database.get("version", ""))
    or database.get("dumpFile") != "database/dump"
    or database.get("recordCountsSource") != "database/dump"
    or not isinstance(database.get("recordCounts"), dict)
    or not database["recordCounts"]
):
    raise SystemExit("backup manifest is not an 8.0.46 production snapshot")
for table, count in database["recordCounts"].items():
    if not re.fullmatch(r"[A-Za-z0-9_]+", table) or type(count) is not int or count < 0:
        raise SystemExit("backup record count inventory is invalid")
dump = root / database["dumpFile"]
if not dump.is_file() or dump.is_symlink():
    raise SystemExit("backup dump is missing or unsafe")
hasher = hashlib.sha256()
with dump.open("rb") as handle:
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
        hasher.update(chunk)
digest = hasher.hexdigest()
if dump.stat().st_size != database.get("bytes") or digest != database.get("sha256"):
    raise SystemExit("backup dump size or checksum does not match the manifest")
print(hashlib.sha256(manifest_path.read_bytes()).hexdigest(), end="")
PY
  )" || fail "backup evidence validation failed"
  [[ "${backup_manifest_sha}" =~ ^[0-9a-f]{64}$ ]] \
    || fail "backup manifest digest is invalid"
}

prepare_runtime_release() {
  local actual_project
  local actual_revision
  local config_image="$1"
  local digest="$2"
  local expected_revision="$3"
  local release_dir

  "${DOCKER_BIN}" --config "${docker_config_dir}" pull "${config_image}" >/dev/null
  actual_revision="$(
    "${DOCKER_BIN}" image inspect \
      --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
      "${config_image}"
  )"
  actual_project="$(
    "${DOCKER_BIN}" image inspect \
      --format '{{ index .Config.Labels "io.chochiho.runtime-config.project" }}' \
      "${config_image}"
  )"
  [[ "${actual_revision}" == "${expected_revision}" ]] \
    || fail "runtime config revision label does not match"
  [[ "${actual_project}" == cubing-hub ]] \
    || fail "runtime config project label is invalid"

  /bin/mkdir -p "${RUNTIME_CONFIG_RELEASES}"
  release_dir="${RUNTIME_CONFIG_RELEASES}/${digest#sha256:}"
  release_temp="$(/usr/bin/mktemp -d "${RUNTIME_CONFIG_RELEASES}/.tmp.XXXXXX")"
  config_container_id="$("${DOCKER_BIN}" create "${config_image}")"
  "${DOCKER_BIN}" cp "${config_container_id}:/runtime/." "${release_temp}"
  "${DOCKER_BIN}" rm "${config_container_id}" >/dev/null
  config_container_id=
  validate_release_files "${release_temp}"
  /bin/chmod -R go-rwx "${release_temp}"
  validate_release_files "${release_temp}"
  if [[ -d "${release_dir}" ]]; then
    validate_release_files "${release_dir}"
    /usr/bin/diff -qr "${release_temp}" "${release_dir}" >/dev/null \
      || fail "existing release differs from the exact runtime artifact"
    /bin/rm -rf -- "${release_temp}"
    release_temp=
  else
    /bin/mv -- "${release_temp}" "${release_dir}"
    release_temp=
  fi
  prepared_release="${release_dir}"
}

candidate_file_for() {
  printf '%s/%s/candidate.env' "${MAINTENANCE_CANDIDATES}" "$1"
}

write_candidate() {
  local candidate_dir
  local candidate_file
  local candidate_id
  local candidate_temp
  local created_at

  ensure_private_directory "${MAINTENANCE_ROOT}"
  ensure_private_directory "${MAINTENANCE_CANDIDATES}"
  created_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"
  candidate_temp="$(/usr/bin/mktemp "${MAINTENANCE_ROOT}/.candidate.tmp.XXXXXX")"
  {
    printf 'SCHEMA_VERSION=1\n'
    printf 'OPERATION=%s\n' "${candidate_operation}"
    printf 'APPLICATION_REVISION=%s\n' "${candidate_application_revision}"
    printf 'API_IMAGE=%s\n' "${candidate_api_image}"
    printf 'WEB_IMAGE=%s\n' "${candidate_web_image}"
    printf 'SOURCE_RUNTIME_CONFIG_DIGEST=%s\n' "${candidate_source_runtime_digest}"
    printf 'TARGET_RUNTIME_CONFIG_DIGEST=%s\n' "${candidate_target_runtime_digest}"
    printf 'TARGET_RUNTIME_CONFIG_REVISION=%s\n' "${candidate_target_runtime_revision}"
    printf 'TARGET_RUNTIME_CONFIG_CONTENT_SHA256=%s\n' "${candidate_target_runtime_content_sha}"
    printf 'SOURCE_DB_IMAGE=%s\n' "${candidate_source_db_image}"
    printf 'SOURCE_DB_IMAGE_EXACT=%s\n' "${candidate_source_db_image_exact}"
    printf 'SOURCE_DB_IMAGE_ID=%s\n' "${candidate_source_db_image_id}"
    printf 'TARGET_DB_IMAGE=%s\n' "${candidate_target_db_image}"
    printf 'TARGET_DB_IMAGE_EXACT=%s\n' "${candidate_target_db_image_exact}"
    printf 'TARGET_DB_IMAGE_ID=%s\n' "${candidate_target_db_image_id}"
    printf 'SOURCE_DB_VOLUME=%s\n' "${candidate_source_db_volume}"
    printf 'TARGET_DB_VOLUME=%s\n' "${candidate_target_db_volume}"
    printf 'BACKUP_ID=%s\n' "${candidate_backup_id}"
    printf 'BACKUP_MANIFEST_SHA256=%s\n' "${candidate_backup_manifest_sha}"
    printf 'CREATED_AT=%s\n' "${created_at}"
  } >"${candidate_temp}"
  candidate_id="$(/usr/bin/shasum -a 256 "${candidate_temp}" | /usr/bin/awk '{print $1}')"
  printf 'CANDIDATE_ID=%s\n' "${candidate_id}" >>"${candidate_temp}"
  candidate_dir="${MAINTENANCE_CANDIDATES}/${candidate_id}"
  candidate_file="${candidate_dir}/candidate.env"
  if [[ -e "${candidate_dir}" || -L "${candidate_dir}" ]]; then
    if [[ ! -d "${candidate_dir}" || -L "${candidate_dir}" ]] \
      || [[ ! -f "${candidate_file}" || -L "${candidate_file}" ]] \
      || ! /usr/bin/cmp -s "${candidate_temp}" "${candidate_file}"
    then
      fail "existing maintenance candidate is unsafe or differs"
    fi
    /bin/rm -f -- "${candidate_temp}"
  else
    /bin/mkdir "${candidate_dir}"
    /bin/mv -- "${candidate_temp}" "${candidate_file}"
    /bin/chmod 400 "${candidate_file}"
    /bin/chmod 500 "${candidate_dir}"
  fi
  printf '%s\n' "${candidate_id}"
}

validate_candidate() {
  local candidate_id="$1"
  local candidate_file
  local computed_id
  local keys
  local release_dir

  is_candidate_id "${candidate_id}" || fail "maintenance candidate ID is invalid"
  candidate_file="$(candidate_file_for "${candidate_id}")"
  if [[ ! -d "${MAINTENANCE_CANDIDATES}" || -L "${MAINTENANCE_CANDIDATES}" ]] \
    || [[ ! -d "$(/usr/bin/dirname "${candidate_file}")" ]] \
    || [[ -L "$(/usr/bin/dirname "${candidate_file}")" ]] \
    || [[ ! -f "${candidate_file}" || -L "${candidate_file}" ]]
  then
    fail "maintenance candidate is missing or unsafe"
  fi
  has_mode "$(/usr/bin/dirname "${candidate_file}")" 500 \
    && has_mode "${candidate_file}" 400 \
    || fail "maintenance candidate permissions are invalid"
  keys="$(
    /usr/bin/awk -F= 'NF >= 2 { print $1 }' "${candidate_file}" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${keys}" != $'API_IMAGE\nAPPLICATION_REVISION\nBACKUP_ID\nBACKUP_MANIFEST_SHA256\nCANDIDATE_ID\nCREATED_AT\nOPERATION\nSCHEMA_VERSION\nSOURCE_DB_IMAGE\nSOURCE_DB_IMAGE_EXACT\nSOURCE_DB_IMAGE_ID\nSOURCE_DB_VOLUME\nSOURCE_RUNTIME_CONFIG_DIGEST\nTARGET_DB_IMAGE\nTARGET_DB_IMAGE_EXACT\nTARGET_DB_IMAGE_ID\nTARGET_DB_VOLUME\nTARGET_RUNTIME_CONFIG_CONTENT_SHA256\nTARGET_RUNTIME_CONFIG_DIGEST\nTARGET_RUNTIME_CONFIG_REVISION\nWEB_IMAGE' ]]; then
    fail "maintenance candidate keys are invalid"
  fi
  computed_id="$(
    /usr/bin/sed '/^CANDIDATE_ID=/d' "${candidate_file}" \
      | /usr/bin/shasum -a 256 \
      | /usr/bin/awk '{print $1}'
  )"
  [[ "${computed_id}" == "${candidate_id}" ]] \
    && [[ "$(read_exact_value "${candidate_file}" CANDIDATE_ID)" == "${candidate_id}" ]] \
    || fail "maintenance candidate integrity check failed"

  candidate_operation="$(read_exact_value "${candidate_file}" OPERATION)"
  candidate_application_revision="$(read_exact_value "${candidate_file}" APPLICATION_REVISION)"
  candidate_api_image="$(read_exact_value "${candidate_file}" API_IMAGE)"
  candidate_web_image="$(read_exact_value "${candidate_file}" WEB_IMAGE)"
  candidate_source_runtime_digest="$(read_exact_value "${candidate_file}" SOURCE_RUNTIME_CONFIG_DIGEST)"
  candidate_target_runtime_digest="$(read_exact_value "${candidate_file}" TARGET_RUNTIME_CONFIG_DIGEST)"
  candidate_target_runtime_revision="$(read_exact_value "${candidate_file}" TARGET_RUNTIME_CONFIG_REVISION)"
  candidate_target_runtime_content_sha="$(read_exact_value "${candidate_file}" TARGET_RUNTIME_CONFIG_CONTENT_SHA256)"
  candidate_source_db_image="$(read_exact_value "${candidate_file}" SOURCE_DB_IMAGE)"
  candidate_source_db_image_exact="$(read_exact_value "${candidate_file}" SOURCE_DB_IMAGE_EXACT)"
  candidate_source_db_image_id="$(read_exact_value "${candidate_file}" SOURCE_DB_IMAGE_ID)"
  candidate_target_db_image="$(read_exact_value "${candidate_file}" TARGET_DB_IMAGE)"
  candidate_target_db_image_exact="$(read_exact_value "${candidate_file}" TARGET_DB_IMAGE_EXACT)"
  candidate_target_db_image_id="$(read_exact_value "${candidate_file}" TARGET_DB_IMAGE_ID)"
  candidate_source_db_volume="$(read_exact_value "${candidate_file}" SOURCE_DB_VOLUME)"
  candidate_target_db_volume="$(read_exact_value "${candidate_file}" TARGET_DB_VOLUME)"
  candidate_backup_id="$(read_exact_value "${candidate_file}" BACKUP_ID)"
  candidate_backup_manifest_sha="$(read_exact_value "${candidate_file}" BACKUP_MANIFEST_SHA256)"

  if [[ "$(read_exact_value "${candidate_file}" SCHEMA_VERSION)" != 1 ]] \
    || { [[ "${candidate_operation}" != UPGRADE ]] && [[ "${candidate_operation}" != ROLLBACK ]]; } \
    || ! is_sha "${candidate_application_revision}" \
    || [[ "${candidate_api_image}" != "${API_IMAGE_REPOSITORY}:${candidate_application_revision}" ]] \
    || [[ "${candidate_web_image}" != "${WEB_IMAGE_REPOSITORY}:${candidate_application_revision}" ]] \
    || ! is_digest "${candidate_source_runtime_digest}" \
    || ! is_digest "${candidate_target_runtime_digest}" \
    || ! is_sha "${candidate_target_runtime_revision}" \
    || [[ ! "${candidate_target_runtime_content_sha}" =~ ^[0-9a-f]{64}$ ]] \
    || ! is_image_id "${candidate_source_db_image_id}" \
    || ! is_image_id "${candidate_target_db_image_id}" \
    || ! is_volume_name "${candidate_source_db_volume}" \
    || ! is_volume_name "${candidate_target_db_volume}" \
    || ! is_backup_id "${candidate_backup_id}" \
    || [[ ! "${candidate_backup_manifest_sha}" =~ ^[0-9a-f]{64}$ ]]
  then
    fail "maintenance candidate values are invalid"
  fi
  if [[ "${candidate_operation}" == UPGRADE ]]; then
    [[ "${candidate_source_db_image}" == "mysql:${SOURCE_DB_VERSION}" ]] \
      || fail "upgrade source must be mysql:${SOURCE_DB_VERSION}"
    [[ "${candidate_target_db_image}" == "mysql:${TARGET_DB_VERSION}" ]] \
      || fail "upgrade target must be mysql:${TARGET_DB_VERSION}"
    [[ "${candidate_source_db_volume}" == "${candidate_target_db_volume}" ]] \
      || fail "upgrade must retain the original MySQL volume"
    [[ "${candidate_source_db_image_exact}" =~ ^mysql:8\.0\.46@sha256:[0-9a-f]{64}$ ]] \
      && [[ "${candidate_target_db_image_exact}" =~ ^mysql:8\.4\.11@sha256:[0-9a-f]{64}$ ]] \
      || fail "upgrade DB images must use exact supported repository digests"
  else
    [[ "${candidate_source_db_image}" == "mysql:${TARGET_DB_VERSION}" ]] \
      || fail "rollback source must be mysql:${TARGET_DB_VERSION}"
    [[ "${candidate_target_db_image}" == "mysql:${SOURCE_DB_VERSION}" ]] \
      || fail "rollback target must be mysql:${SOURCE_DB_VERSION}"
    [[ "${candidate_source_db_volume}" != "${candidate_target_db_volume}" ]] \
      || fail "rollback must not attach MySQL 8.0 to the upgraded original volume"
    [[ "${candidate_source_db_image_exact}" =~ ^mysql:8\.4\.11@sha256:[0-9a-f]{64}$ ]] \
      && [[ "${candidate_target_db_image_exact}" =~ ^mysql:8\.0\.46@sha256:[0-9a-f]{64}$ ]] \
      || fail "rollback DB images must use exact supported repository digests"
  fi

  validate_backup "${candidate_backup_id}"
  [[ "${backup_manifest_sha}" == "${candidate_backup_manifest_sha}" ]] \
    || fail "candidate backup evidence has changed"
  release_dir="${RUNTIME_CONFIG_RELEASES}/${candidate_target_runtime_digest#sha256:}"
  validate_release_files "${release_dir}"
  [[ "$(runtime_config_content_sha256 "${release_dir}")" == "${candidate_target_runtime_content_sha}" ]] \
    || fail "candidate target runtime release integrity check failed"
  candidate_target_release="${release_dir}"
}

validate_completed_upgrade_state() {
  local expected_candidate_id="$1"
  local keys

  if [[ ! -f "${MAINTENANCE_STATE}" || -L "${MAINTENANCE_STATE}" ]]; then
    fail "completed upgrade maintenance state is missing or unsafe"
  fi
  keys="$(
    /usr/bin/awk -F= 'NF >= 2 { print $1 }' "${MAINTENANCE_STATE}" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${keys}" != $'APPLICATION_REVISION\nBACKUP_ID\nCANDIDATE_ID\nCOMPLETED_AT\nDB_IMAGE_EXACT\nDB_IMAGE_ID\nDB_VOLUME\nOPERATION\nRUNTIME_CONFIG_DIGEST\nSCHEMA_VERSION' ]]; then
    fail "completed upgrade maintenance state keys are invalid"
  fi
  [[ "$(read_exact_value "${MAINTENANCE_STATE}" SCHEMA_VERSION)" == 1 ]] \
    && [[ "$(read_exact_value "${MAINTENANCE_STATE}" CANDIDATE_ID)" == "${expected_candidate_id}" ]] \
    && [[ "$(read_exact_value "${MAINTENANCE_STATE}" OPERATION)" == UPGRADE ]] \
    && [[ "$(read_exact_value "${MAINTENANCE_STATE}" APPLICATION_REVISION)" == "${candidate_application_revision}" ]] \
    && [[ "$(read_exact_value "${MAINTENANCE_STATE}" RUNTIME_CONFIG_DIGEST)" == "${candidate_target_runtime_digest}" ]] \
    && [[ "$(read_exact_value "${MAINTENANCE_STATE}" DB_IMAGE_EXACT)" == "${candidate_target_db_image_exact}" ]] \
    && [[ "$(read_exact_value "${MAINTENANCE_STATE}" DB_IMAGE_ID)" == "${candidate_target_db_image_id}" ]] \
    && [[ "$(read_exact_value "${MAINTENANCE_STATE}" DB_VOLUME)" == "${candidate_target_db_volume}" ]] \
    && [[ "$(read_exact_value "${MAINTENANCE_STATE}" BACKUP_ID)" == "${candidate_backup_id}" ]] \
    || fail "completed upgrade maintenance state does not match the upgrade candidate"
}

write_restore_evidence() {
  local candidate_id="$1"
  local evidence_file="${MAINTENANCE_RESTORES}/${rollback_volume}.state"
  local evidence_id
  local evidence_temp
  local verified_at

  ensure_private_directory "${MAINTENANCE_ROOT}"
  ensure_private_directory "${MAINTENANCE_RESTORES}"
  verified_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"
  evidence_temp="$(/usr/bin/mktemp "${MAINTENANCE_ROOT}/.restore.tmp.XXXXXX")"
  {
    printf 'SCHEMA_VERSION=1\n'
    printf 'UPGRADE_CANDIDATE_ID=%s\n' "${candidate_id}"
    printf 'BACKUP_ID=%s\n' "${candidate_backup_id}"
    printf 'BACKUP_MANIFEST_SHA256=%s\n' "${candidate_backup_manifest_sha}"
    printf 'DB_IMAGE_EXACT=%s\n' "${candidate_source_db_image_exact}"
    printf 'DB_IMAGE_ID=%s\n' "${candidate_source_db_image_id}"
    printf 'DB_VOLUME=%s\n' "${rollback_volume}"
    printf 'VERIFIED_AT=%s\n' "${verified_at}"
  } >"${evidence_temp}"
  evidence_id="$(/usr/bin/shasum -a 256 "${evidence_temp}" | /usr/bin/awk '{print $1}')"
  printf 'EVIDENCE_ID=%s\n' "${evidence_id}" >>"${evidence_temp}"
  if [[ -e "${evidence_file}" || -L "${evidence_file}" ]]; then
    fail "rollback volume already has restore evidence"
  fi
  /bin/mv -- "${evidence_temp}" "${evidence_file}"
  /bin/chmod 400 "${evidence_file}"
}

validate_restore_evidence() {
  local candidate_id="$1"
  local expected_backup_id="$3"
  local expected_image_exact="$5"
  local expected_image_id="$6"
  local expected_manifest_sha="$4"
  local expected_volume="$2"
  local evidence_file="${MAINTENANCE_RESTORES}/${expected_volume}.state"
  local evidence_id
  local keys

  if [[ ! -f "${evidence_file}" || -L "${evidence_file}" ]]; then
    fail "verified rollback restore evidence is missing"
  fi
  if [[ ! -d "${MAINTENANCE_RESTORES}" || -L "${MAINTENANCE_RESTORES}" ]] \
    || ! has_mode "${MAINTENANCE_RESTORES}" 700 \
    || ! has_mode "${evidence_file}" 400
  then
    fail "rollback restore evidence permissions are invalid"
  fi
  keys="$(
    /usr/bin/awk -F= 'NF >= 2 { print $1 }' "${evidence_file}" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${keys}" != $'BACKUP_ID\nBACKUP_MANIFEST_SHA256\nDB_IMAGE_EXACT\nDB_IMAGE_ID\nDB_VOLUME\nEVIDENCE_ID\nSCHEMA_VERSION\nUPGRADE_CANDIDATE_ID\nVERIFIED_AT' ]]; then
    fail "rollback restore evidence keys are invalid"
  fi
  evidence_id="$(
    /usr/bin/sed '/^EVIDENCE_ID=/d' "${evidence_file}" \
      | /usr/bin/shasum -a 256 \
      | /usr/bin/awk '{print $1}'
  )"
  [[ "$(read_exact_value "${evidence_file}" EVIDENCE_ID)" == "${evidence_id}" ]] \
    && [[ "$(read_exact_value "${evidence_file}" SCHEMA_VERSION)" == 1 ]] \
    && [[ "$(read_exact_value "${evidence_file}" UPGRADE_CANDIDATE_ID)" == "${candidate_id}" ]] \
    && [[ "$(read_exact_value "${evidence_file}" BACKUP_ID)" == "${expected_backup_id}" ]] \
    && [[ "$(read_exact_value "${evidence_file}" BACKUP_MANIFEST_SHA256)" == "${expected_manifest_sha}" ]] \
    && [[ "$(read_exact_value "${evidence_file}" DB_IMAGE_EXACT)" == "${expected_image_exact}" ]] \
    && [[ "$(read_exact_value "${evidence_file}" DB_IMAGE_ID)" == "${expected_image_id}" ]] \
    && [[ "$(read_exact_value "${evidence_file}" DB_VOLUME)" == "${expected_volume}" ]] \
    || fail "rollback restore evidence does not match the candidate, backup, image, or volume"
}

write_pending() {
  local candidate_id="$1"
  local pending_temp
  local started_at

  started_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"
  pending_temp="$(/usr/bin/mktemp "${RUNTIME_CONFIG_ROOT}/.pending.tmp.XXXXXX")"
  {
    printf 'TRANSACTION_TYPE=MYSQL_MAINTENANCE\n'
    printf 'CANDIDATE_ID=%s\n' "${candidate_id}"
    printf 'OPERATION=%s\n' "${candidate_operation}"
    printf 'SOURCE_RUNTIME_CONFIG_DIGEST=%s\n' "${candidate_source_runtime_digest}"
    printf 'TARGET_RUNTIME_CONFIG_DIGEST=%s\n' "${candidate_target_runtime_digest}"
    printf 'SOURCE_DB_IMAGE_ID=%s\n' "${candidate_source_db_image_id}"
    printf 'TARGET_DB_IMAGE_ID=%s\n' "${candidate_target_db_image_id}"
    printf 'SOURCE_DB_VOLUME=%s\n' "${candidate_source_db_volume}"
    printf 'TARGET_DB_VOLUME=%s\n' "${candidate_target_db_volume}"
    printf 'BACKUP_ID=%s\n' "${candidate_backup_id}"
    printf 'STARTED_AT=%s\n' "${started_at}"
  } >"${pending_temp}"
  /bin/chmod 600 "${pending_temp}"
  /bin/mv -f -- "${pending_temp}" "${RUNTIME_CONFIG_PENDING}"
}

validate_maintenance_pending() {
  local candidate_id
  local keys

  if [[ ! -f "${RUNTIME_CONFIG_PENDING}" || -L "${RUNTIME_CONFIG_PENDING}" ]]; then
    fail "MySQL maintenance recovery requires a regular pending state"
  fi
  keys="$(
    /usr/bin/awk -F= 'NF >= 2 { print $1 }' "${RUNTIME_CONFIG_PENDING}" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${keys}" != $'BACKUP_ID\nCANDIDATE_ID\nOPERATION\nSOURCE_DB_IMAGE_ID\nSOURCE_DB_VOLUME\nSOURCE_RUNTIME_CONFIG_DIGEST\nSTARTED_AT\nTARGET_DB_IMAGE_ID\nTARGET_DB_VOLUME\nTARGET_RUNTIME_CONFIG_DIGEST\nTRANSACTION_TYPE' ]] \
    || [[ "$(read_exact_value "${RUNTIME_CONFIG_PENDING}" TRANSACTION_TYPE)" != MYSQL_MAINTENANCE ]]
  then
    fail "pending state is not a MySQL maintenance transaction"
  fi
  candidate_id="$(read_exact_value "${RUNTIME_CONFIG_PENDING}" CANDIDATE_ID)"
  validate_candidate "${candidate_id}"
  [[ "$(read_exact_value "${RUNTIME_CONFIG_PENDING}" OPERATION)" == "${candidate_operation}" ]] \
    && [[ "$(read_exact_value "${RUNTIME_CONFIG_PENDING}" SOURCE_RUNTIME_CONFIG_DIGEST)" == "${candidate_source_runtime_digest}" ]] \
    && [[ "$(read_exact_value "${RUNTIME_CONFIG_PENDING}" TARGET_RUNTIME_CONFIG_DIGEST)" == "${candidate_target_runtime_digest}" ]] \
    && [[ "$(read_exact_value "${RUNTIME_CONFIG_PENDING}" SOURCE_DB_IMAGE_ID)" == "${candidate_source_db_image_id}" ]] \
    && [[ "$(read_exact_value "${RUNTIME_CONFIG_PENDING}" TARGET_DB_IMAGE_ID)" == "${candidate_target_db_image_id}" ]] \
    && [[ "$(read_exact_value "${RUNTIME_CONFIG_PENDING}" SOURCE_DB_VOLUME)" == "${candidate_source_db_volume}" ]] \
    && [[ "$(read_exact_value "${RUNTIME_CONFIG_PENDING}" TARGET_DB_VOLUME)" == "${candidate_target_db_volume}" ]] \
    && [[ "$(read_exact_value "${RUNTIME_CONFIG_PENDING}" BACKUP_ID)" == "${candidate_backup_id}" ]] \
    || fail "pending state does not match its immutable maintenance candidate"
  pending_candidate_id="${candidate_id}"
}

validate_pending_runtime_context() {
  local current_target
  local expected_source_target
  local expected_target_target
  local state_application_revision
  local state_content_sha
  local state_digest
  local state_release
  local state_revision

  validate_initialization_marker
  validate_state_file
  state_application_revision="$(read_exact_value "${RUNTIME_CONFIG_STATE}" APPLICATION_REVISION)"
  state_digest="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_DIGEST)"
  state_revision="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_REVISION)"
  state_content_sha="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_CONTENT_SHA256)"
  [[ "${state_application_revision}" == "${candidate_application_revision}" ]] \
    || fail "pending maintenance application revision has changed"
  if [[ "${state_digest}" != "${candidate_source_runtime_digest}" ]] \
    && [[ "${state_digest}" != "${candidate_target_runtime_digest}" ]]
  then
    fail "pending maintenance runtime state matches neither source nor target"
  fi
  if [[ "${state_digest}" == "${candidate_target_runtime_digest}" ]]; then
    [[ "${state_revision}" == "${candidate_target_runtime_revision}" ]] \
      && [[ "${state_content_sha}" == "${candidate_target_runtime_content_sha}" ]] \
      || fail "pending maintenance target runtime state is invalid"
  fi
  state_release="${RUNTIME_CONFIG_RELEASES}/${state_digest#sha256:}"
  validate_release_files "${state_release}"
  [[ "$(runtime_config_content_sha256 "${state_release}")" == "${state_content_sha}" ]] \
    || fail "pending maintenance runtime state content hash is invalid"

  if [[ ! -L "${RUNTIME_CONFIG_CURRENT}" ]]; then
    fail "pending maintenance current pointer is missing"
  fi
  current_target="$(/usr/bin/readlink "${RUNTIME_CONFIG_CURRENT}")"
  expected_source_target="releases/${candidate_source_runtime_digest#sha256:}"
  expected_target_target="releases/${candidate_target_runtime_digest#sha256:}"
  if [[ "${current_target}" != "${expected_source_target}" ]] \
    && [[ "${current_target}" != "${expected_target_target}" ]]
  then
    fail "pending maintenance current pointer matches neither source nor target"
  fi

  current_api_image="$(read_env_value API_IMAGE)"
  current_web_image="$(read_env_value WEB_IMAGE)"
  if [[ "${current_api_image}" != "${candidate_api_image}" ]] \
    || [[ "${current_web_image}" != "${candidate_web_image}" ]]
  then
    fail "pending maintenance application images do not match the environment"
  fi
}

write_db_env() {
  local db_image="$1"
  local db_volume="$2"
  local env_temp

  env_temp="$(/usr/bin/mktemp "${APP_DIR}/.env.tmp.XXXXXX")"
  if ! /usr/bin/awk -v db_image="${db_image}" -v db_volume="${db_volume}" '
    BEGIN { image_count = 0; volume_count = 0 }
    /^DB_IMAGE=/ { print "DB_IMAGE=" db_image; image_count += 1; next }
    /^DB_VOLUME_NAME=/ { print "DB_VOLUME_NAME=" db_volume; volume_count += 1; next }
    { print }
    END {
      if (image_count > 1 || volume_count > 1) exit 1
      if (image_count == 0) print "DB_IMAGE=" db_image
      if (volume_count == 0) print "DB_VOLUME_NAME=" db_volume
    }
  ' "${ENV_FILE}" >"${env_temp}"
  then
    fail "DB_IMAGE and DB_VOLUME_NAME must each appear at most once in ${ENV_FILE}"
  fi
  /bin/chmod 600 "${env_temp}"
  /bin/mv -f -- "${env_temp}" "${ENV_FILE}"
}

replace_current_link() {
  local release_dir="$1"
  local link_temp="${RUNTIME_CONFIG_ROOT}/.current.$$"

  /bin/ln -s "releases/$(/usr/bin/basename "${release_dir}")" "${link_temp}"
  "${PYTHON_BIN}" -c 'import os, sys; os.replace(sys.argv[1], sys.argv[2])' \
    "${link_temp}" "${RUNTIME_CONFIG_CURRENT}"
}

commit_success_state() {
  local candidate_id="$1"
  local completed_at
  local maintenance_temp
  local state_temp

  completed_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"
  state_temp="$(/usr/bin/mktemp "${RUNTIME_CONFIG_ROOT}/.state.tmp.XXXXXX")"
  {
    printf 'APPLICATION_REVISION=%s\n' "${candidate_application_revision}"
    printf 'RUNTIME_CONFIG_DIGEST=%s\n' "${candidate_target_runtime_digest}"
    printf 'RUNTIME_CONFIG_REVISION=%s\n' "${candidate_target_runtime_revision}"
    printf 'RUNTIME_CONFIG_CONTENT_SHA256=%s\n' "${candidate_target_runtime_content_sha}"
    printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${candidate_application_revision}"
    printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${candidate_target_runtime_digest}"
  } >"${state_temp}"
  /bin/chmod 600 "${state_temp}"
  /bin/mv -f -- "${state_temp}" "${RUNTIME_CONFIG_STATE}"
  replace_current_link "${candidate_target_release}"

  ensure_private_directory "${MAINTENANCE_ROOT}"
  maintenance_temp="$(/usr/bin/mktemp "${MAINTENANCE_ROOT}/.state.tmp.XXXXXX")"
  {
    printf 'SCHEMA_VERSION=1\n'
    printf 'CANDIDATE_ID=%s\n' "${candidate_id}"
    printf 'OPERATION=%s\n' "${candidate_operation}"
    printf 'APPLICATION_REVISION=%s\n' "${candidate_application_revision}"
    printf 'RUNTIME_CONFIG_DIGEST=%s\n' "${candidate_target_runtime_digest}"
    printf 'DB_IMAGE_EXACT=%s\n' "${candidate_target_db_image_exact}"
    printf 'DB_IMAGE_ID=%s\n' "${candidate_target_db_image_id}"
    printf 'DB_VOLUME=%s\n' "${candidate_target_db_volume}"
    printf 'BACKUP_ID=%s\n' "${candidate_backup_id}"
    printf 'COMPLETED_AT=%s\n' "${completed_at}"
  } >"${maintenance_temp}"
  /bin/chmod 600 "${maintenance_temp}"
  /bin/mv -f -- "${maintenance_temp}" "${MAINTENANCE_STATE}"
  /bin/rm -f -- "${RUNTIME_CONFIG_PENDING}"
}

service_set_is_healthy() {
  local rendered

  rendered="$(
    compose_for \
      "${candidate_target_release}" \
      "${candidate_target_db_image_exact}" \
      "${candidate_target_db_volume}" \
      ps --format json
  )"
  printf '%s' "${rendered}" | "${PYTHON_BIN}" -c '
import json
import sys

raw = sys.stdin.read().strip()
if not raw:
    raise SystemExit("no maintenance target service status was returned")
try:
    value = json.loads(raw)
except json.JSONDecodeError:
    value = [json.loads(line) for line in raw.splitlines() if line.strip()]
entries = value if isinstance(value, list) else [value]
required = {"api", "db", "redis", "web"}
seen = set()
for entry in entries:
    service = entry.get("Service")
    if service not in required or str(entry.get("State", "")).lower() != "running":
        raise SystemExit("maintenance target service set is not running")
    seen.add(service)
    health = str(entry.get("Health", "")).lower()
    if service in {"db", "redis", "web"} and health != "healthy":
        raise SystemExit("maintenance target service health is not ready")
    if health and health != "healthy":
        raise SystemExit("maintenance target service health is invalid")
if seen != required:
    raise SystemExit("maintenance target service set is incomplete")
'
}

apply_candidate() {
  local candidate_id="$1"
  local existing_pending_id=
  local rollback_with_pending=false

  validate_candidate "${candidate_id}"
  if [[ "${candidate_operation}" == ROLLBACK ]] \
    && [[ -e "${RUNTIME_CONFIG_PENDING}" || -L "${RUNTIME_CONFIG_PENDING}" ]]
  then
    rollback_with_pending=true
  else
    load_current_runtime
    if [[ "${candidate_application_revision}" != "${current_application_revision}" ]] \
      || [[ "${candidate_api_image}" != "${current_api_image}" ]] \
      || [[ "${candidate_web_image}" != "${current_web_image}" ]]
    then
      fail "maintenance candidate application images are stale"
    fi
  fi

  if [[ "${candidate_operation}" == UPGRADE ]]; then
    [[ ! -e "${RUNTIME_CONFIG_PENDING}" && ! -L "${RUNTIME_CONFIG_PENDING}" ]] \
      || fail "another runtime transaction is pending"
    [[ "${current_runtime_digest}" == "${candidate_source_runtime_digest}" ]] \
      || fail "upgrade candidate source runtime is no longer current"
    validate_actual_db_identity \
      "${candidate_source_db_image}" \
      "${candidate_source_db_image_id}" \
      "${candidate_source_db_volume}" \
      "${current_release}"
  else
    rollback_volume="${candidate_target_db_volume}"
    upgrade_candidate_id="$(read_exact_value "${MAINTENANCE_RESTORES}/${rollback_volume}.state" UPGRADE_CANDIDATE_ID)"
    validate_restore_evidence \
      "${upgrade_candidate_id}" \
      "${candidate_target_db_volume}" \
      "${candidate_backup_id}" \
      "${candidate_backup_manifest_sha}" \
      "${candidate_target_db_image_exact}" \
      "${candidate_target_db_image_id}"
    if [[ "${rollback_with_pending}" == true ]]; then
      validate_maintenance_pending
      existing_pending_id="${pending_candidate_id}"
      [[ "${candidate_operation}" == UPGRADE ]] \
        || fail "existing pending transition is not the failed upgrade"
      [[ "${existing_pending_id}" == "${upgrade_candidate_id}" ]] \
        || fail "rollback restore evidence does not match the pending upgrade"
      validate_pending_runtime_context
      validate_candidate "${candidate_id}"
    else
      [[ "${current_runtime_digest}" == "${candidate_source_runtime_digest}" ]] \
        || fail "rollback candidate source runtime is no longer current"
      validate_actual_db_identity \
        "${candidate_source_db_image_exact}" \
        "${candidate_source_db_image_id}" \
        "${candidate_source_db_volume}" \
        "${current_release}"
    fi
  fi

  validate_target_artifacts

  write_pending "${candidate_id}"
  compose_for \
    "${candidate_target_release}" \
    "${candidate_source_db_image_exact}" \
    "${candidate_source_db_volume}" \
    stop api web
  compose_for \
    "${candidate_target_release}" \
    "${candidate_source_db_image_exact}" \
    "${candidate_source_db_volume}" \
    stop db

  write_db_env "${candidate_target_db_image_exact}" "${candidate_target_db_volume}"
  if ! compose_for \
    "${candidate_target_release}" \
    "${candidate_target_db_image_exact}" \
    "${candidate_target_db_volume}" \
    up --detach --no-build --pull never --wait \
      --wait-timeout "${HEALTH_TIMEOUT_SECONDS}" db
  then
    fail "target MySQL startup failed; pending state and all volumes were preserved"
  fi
  validate_actual_db_identity \
    "${candidate_target_db_image_exact}" \
    "${candidate_target_db_image_id}" \
    "${candidate_target_db_volume}" \
    "${candidate_target_release}"
  if ! compose_for \
    "${candidate_target_release}" \
    "${candidate_target_db_image_exact}" \
    "${candidate_target_db_volume}" \
    up --detach --no-build --pull never --remove-orphans --wait \
      --wait-timeout "${HEALTH_TIMEOUT_SECONDS}" redis api web
  then
    fail "application startup on the target MySQL binding failed; pending state was preserved"
  fi
  service_set_is_healthy || fail "maintenance target service set is unhealthy"
  commit_success_state "${candidate_id}"
  printf 'Cubing Hub MySQL maintenance transition succeeded: %s\n' "${candidate_id}"
}

prepare_upgrade() {
  local backup_id="$4"
  local registry_user="$5"
  local target_db_image_exact="$3"
  local target_runtime_digest="$1"
  local target_runtime_revision="$2"
  local baseline_json
  local candidate_json
  local config_image
  local registry_token

  [[ ! -e "${RUNTIME_CONFIG_PENDING}" && ! -L "${RUNTIME_CONFIG_PENDING}" ]] \
    || fail "an incomplete runtime transaction requires recovery"
  is_digest "${target_runtime_digest}" || fail "target runtime digest is invalid"
  is_sha "${target_runtime_revision}" || fail "target runtime revision is invalid"
  [[ "${target_db_image_exact}" =~ ^mysql:8\.4\.11@sha256:[0-9a-f]{64}$ ]] \
    || fail "target DB image must be exact mysql:8.4.11@sha256:digest"
  [[ "${registry_user}" =~ ^[A-Za-z0-9_-]+$ ]] \
    || fail "registry user is invalid"

  load_current_runtime
  load_current_db_identity
  if [[ "${current_db_image}" != "mysql:${SOURCE_DB_VERSION}" ]] \
    && [[ ! "${current_db_image}" =~ ^mysql:8\.0\.46@sha256:[0-9a-f]{64}$ ]]
  then
    fail "upgrade source must be exact MySQL ${SOURCE_DB_VERSION}"
  fi
  validate_backup "${backup_id}"

  registry_token="$(/bin/cat)"
  [[ -n "${registry_token}" ]] || fail "GHCR token must not be empty"
  docker_config_dir="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-hub-maintenance-docker.XXXXXX")"
  printf '%s' "${registry_token}" \
    | "${DOCKER_BIN}" --config "${docker_config_dir}" login ghcr.io \
        --username "${registry_user}" --password-stdin >/dev/null
  logged_in=true
  registry_token=

  config_image="${RUNTIME_CONFIG_REPOSITORY}@${target_runtime_digest}"
  prepare_runtime_release \
    "${config_image}" \
    "${target_runtime_digest}" \
    "${target_runtime_revision}"
  "${DOCKER_BIN}" pull "${target_db_image_exact}" >/dev/null
  target_db_image_id="$(image_id_for "${target_db_image_exact}")"

  baseline_json="$(
    render_compose_json \
      "${current_release}/compose.yaml" \
      "${current_api_image}" \
      "${current_web_image}"
  )"
  candidate_json="$(
    render_compose_json \
      "${prepared_release}/compose.yaml" \
      "${current_api_image}" \
      "${current_web_image}" \
      "${target_db_image_exact}" \
      "${current_db_volume}"
  )"
  validate_maintenance_compose_contract \
    "${baseline_json}" \
    "${candidate_json}" \
    "${target_db_image_exact}" \
    "${current_db_volume}" \
    "${prepared_release}"

  candidate_operation=UPGRADE
  candidate_application_revision="${current_application_revision}"
  candidate_api_image="${current_api_image}"
  candidate_web_image="${current_web_image}"
  candidate_source_runtime_digest="${current_runtime_digest}"
  candidate_target_runtime_digest="${target_runtime_digest}"
  candidate_target_runtime_revision="${target_runtime_revision}"
  candidate_target_runtime_content_sha="$(runtime_config_content_sha256 "${prepared_release}")"
  candidate_source_db_image="mysql:${SOURCE_DB_VERSION}"
  candidate_source_db_image_exact="${current_db_image_exact}"
  candidate_source_db_image_id="${current_db_image_id}"
  candidate_target_db_image="mysql:${TARGET_DB_VERSION}"
  candidate_target_db_image_exact="${target_db_image_exact}"
  candidate_target_db_image_id="${target_db_image_id}"
  candidate_source_db_volume="${current_db_volume}"
  candidate_target_db_volume="${current_db_volume}"
  candidate_backup_id="${backup_id}"
  candidate_backup_manifest_sha="${backup_manifest_sha}"
  write_candidate
}

verify_rollback_volume() {
  local actual_health
  local actual_image_id
  local actual_label
  local actual_mount
  local actual_tables
  local actual_version
  local actual_volume_label
  local candidate_id="$1"
  local expected_tables
  local table
  local validation_container="$3"

  rollback_volume="$2"
  validate_candidate "${candidate_id}"
  [[ "${candidate_operation}" == UPGRADE ]] \
    || fail "rollback volume evidence requires an upgrade candidate"
  is_volume_name "${rollback_volume}" || fail "rollback volume name is invalid"
  [[ "${rollback_volume}" != "${candidate_source_db_volume}" ]] \
    || fail "rollback volume must differ from the upgraded original volume"
  [[ "${validation_container}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]] \
    || fail "validation container name is invalid"
  [[ "$("${DOCKER_BIN}" volume inspect --format '{{.Name}}' "${rollback_volume}")" == "${rollback_volume}" ]] \
    || fail "rollback volume is missing"
  [[ "$("${DOCKER_BIN}" volume inspect --format '{{.Driver}}' "${rollback_volume}")" == local ]] \
    || fail "rollback volume must use the local Docker driver"
  actual_volume_label="$(
    "${DOCKER_BIN}" volume inspect \
      --format '{{ index .Labels "io.chochiho.cubing-hub.mysql-restore-backup" }}' \
      "${rollback_volume}"
  )"
  [[ "${actual_volume_label}" == "${candidate_backup_id}" ]] \
    || fail "rollback volume is not labeled for the verified backup"

  actual_image_id="$("${DOCKER_BIN}" container inspect --format '{{.Image}}' "${validation_container}")"
  actual_mount="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}' \
      "${validation_container}"
  )"
  actual_health="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "${validation_container}"
  )"
  actual_label="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{ index .Config.Labels "io.chochiho.cubing-hub.mysql-restore-backup" }}' \
      "${validation_container}"
  )"
  if [[ "${actual_image_id}" != "${candidate_source_db_image_id}" ]] \
    || [[ "${actual_mount}" != "${rollback_volume}" ]] \
    || [[ "${actual_health}" != healthy ]] \
    || [[ "${actual_label}" != "${candidate_backup_id}" ]]
  then
    fail "rollback validation container does not match the 8.0 image, volume, backup, or health"
  fi

  actual_version="$(
    "${DOCKER_BIN}" exec --env MAINTENANCE_QUERY=version \
      "${validation_container}" /bin/sh -ceu '
        export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
        exec mysql --user=root --batch --skip-column-names "${MYSQL_DATABASE}" \
          --execute "SELECT VERSION()"
      '
  )"
  [[ "${actual_version}" =~ ^8\.0\.46([-+].*)?$ ]] \
    || fail "rollback validation container is not MySQL 8.0.46"

  expected_tables="$(
    "${PYTHON_BIN}" - "${BACKUP_ROOT}/${candidate_backup_id}/manifest.json" <<'PY'
import json
import pathlib
import sys

manifest = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
for table, count in sorted(manifest["database"]["recordCounts"].items()):
    print(f"{table}\t{count}")
PY
  )"
  actual_tables="$(
    "${DOCKER_BIN}" exec --env MAINTENANCE_QUERY=tables \
      "${validation_container}" /bin/sh -ceu '
        export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
        exec mysql --user=root --batch --skip-column-names "${MYSQL_DATABASE}" \
          --execute "SHOW TABLES"
      ' | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${actual_tables}" != "$(printf '%s\n' "${expected_tables}" | /usr/bin/cut -f1)" ]]; then
    fail "rollback volume table inventory differs from the backup manifest"
  fi
  while IFS=$'\t' read -r table expected_count; do
    [[ "${table}" =~ ^[A-Za-z0-9_]+$ && "${expected_count}" =~ ^[0-9]+$ ]] \
      || fail "backup table count inventory is invalid"
    actual_count="$(
      "${DOCKER_BIN}" exec \
        --env MAINTENANCE_QUERY=count \
        --env "MAINTENANCE_TABLE=${table}" \
        "${validation_container}" /bin/sh -ceu '
          case "${MAINTENANCE_TABLE}" in
            *[!A-Za-z0-9_]*) exit 64 ;;
          esac
          export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
          exec mysql --user=root --batch --skip-column-names "${MYSQL_DATABASE}" \
            --execute "SELECT COUNT(*) FROM \`${MAINTENANCE_TABLE}\`"
        '
    )"
    [[ "${actual_count}" == "${expected_count}" ]] \
      || fail "rollback volume row count differs for ${table}"
  done <<<"${expected_tables}"

  "${DOCKER_BIN}" stop "${validation_container}" >/dev/null
  "${DOCKER_BIN}" rm "${validation_container}" >/dev/null
  if [[ -n "$(
    "${DOCKER_BIN}" ps -a --filter "volume=${rollback_volume}" --format '{{.ID}}'
  )" ]]; then
    fail "rollback volume remains attached after validation"
  fi
  write_restore_evidence "${candidate_id}"
  printf 'Rollback volume verified: %s\n' "${rollback_volume}"
}

prepare_rollback() {
  local baseline_json
  local candidate_json
  local upgrade_candidate_id="$1"

  rollback_volume="$2"
  validate_candidate "${upgrade_candidate_id}"
  [[ "${candidate_operation}" == UPGRADE ]] \
    || fail "rollback preparation requires an upgrade candidate"
  is_volume_name "${rollback_volume}" || fail "rollback volume name is invalid"
  [[ "${rollback_volume}" != "${candidate_source_db_volume}" ]] \
    || fail "rollback volume must differ from the upgraded original volume"
  validate_restore_evidence \
    "${upgrade_candidate_id}" \
    "${rollback_volume}" \
    "${candidate_backup_id}" \
    "${candidate_backup_manifest_sha}" \
    "${candidate_source_db_image_exact}" \
    "${candidate_source_db_image_id}"
  if [[ -e "${RUNTIME_CONFIG_PENDING}" || -L "${RUNTIME_CONFIG_PENDING}" ]]; then
    validate_maintenance_pending
    [[ "${pending_candidate_id}" == "${upgrade_candidate_id}" ]] \
      || fail "pending maintenance does not match the rollback source"
    validate_candidate "${upgrade_candidate_id}"
  else
    load_current_runtime
    [[ "${current_application_revision}" == "${candidate_application_revision}" ]] \
      && [[ "${current_api_image}" == "${candidate_api_image}" ]] \
      && [[ "${current_web_image}" == "${candidate_web_image}" ]] \
      || fail "completed upgrade application images no longer match"
    [[ "${current_runtime_digest}" == "${candidate_target_runtime_digest}" ]] \
      || fail "completed upgrade runtime is no longer current"
    validate_actual_db_identity \
      "${candidate_target_db_image_exact}" \
      "${candidate_target_db_image_id}" \
      "${candidate_target_db_volume}" \
      "${current_release}"
    validate_completed_upgrade_state "${upgrade_candidate_id}"
  fi

  baseline_json="$(
    render_compose_json \
      "${candidate_target_release}/compose.yaml" \
      "${candidate_api_image}" \
      "${candidate_web_image}" \
      "${candidate_target_db_image_exact}" \
      "${candidate_source_db_volume}"
  )"
  candidate_json="$(
    render_compose_json \
      "${candidate_target_release}/compose.yaml" \
      "${candidate_api_image}" \
      "${candidate_web_image}" \
      "${candidate_source_db_image_exact}" \
      "${rollback_volume}"
  )"
  validate_maintenance_compose_contract \
    "${baseline_json}" \
    "${candidate_json}" \
    "${candidate_source_db_image_exact}" \
    "${rollback_volume}" \
    "${candidate_target_release}"

  candidate_operation=ROLLBACK
  candidate_source_runtime_digest="${candidate_target_runtime_digest}"
  candidate_source_db_image="mysql:${TARGET_DB_VERSION}"
  candidate_source_db_image_exact="${candidate_target_db_image_exact}"
  candidate_source_db_image_id="${candidate_target_db_image_id}"
  candidate_source_db_volume="${candidate_target_db_volume}"
  candidate_target_db_image="mysql:${SOURCE_DB_VERSION}"
  candidate_target_db_image_exact="$(read_exact_value "${MAINTENANCE_RESTORES}/${rollback_volume}.state" DB_IMAGE_EXACT)"
  candidate_target_db_image_id="$(read_exact_value "${MAINTENANCE_RESTORES}/${rollback_volume}.state" DB_IMAGE_ID)"
  candidate_target_db_volume="${rollback_volume}"
  validate_target_artifacts
  write_candidate
}

recover_transition() {
  validate_maintenance_pending
  validate_pending_runtime_context
  validate_actual_db_identity \
    "${candidate_target_db_image_exact}" \
    "${candidate_target_db_image_id}" \
    "${candidate_target_db_volume}" \
    "${candidate_target_release}"
  if ! compose_for \
    "${candidate_target_release}" \
    "${candidate_target_db_image_exact}" \
    "${candidate_target_db_volume}" \
    up --detach --no-build --pull never --remove-orphans --wait \
      --wait-timeout "${HEALTH_TIMEOUT_SECONDS}" redis api web
  then
    fail "pending maintenance application recovery failed; pending state was preserved"
  fi
  service_set_is_healthy || fail "pending maintenance target is not healthy"
  write_db_env "${candidate_target_db_image_exact}" "${candidate_target_db_volume}"
  commit_success_state "${pending_candidate_id}"
  printf 'Cubing Hub MySQL maintenance transaction finalized: %s\n' "${pending_candidate_id}"
}

command_name="${1:-}"
shift || true

case "${command_name}" in
  prepare-upgrade)
    [[ "$#" -eq 5 ]] || usage
    ;;
  verify-rollback-volume)
    [[ "$#" -eq 3 ]] || usage
    ;;
  prepare-rollback)
    [[ "$#" -eq 2 ]] || usage
    ;;
  apply)
    [[ "$#" -eq 2 && "$2" == WRITE_STOP_CONFIRMED ]] || usage
    ;;
  recover)
    [[ "$#" -eq 0 ]] || usage
    ;;
  *)
    usage
    ;;
esac

if [[ ! -x "${DOCKER_BIN}" ]]; then
  fail "Docker CLI is not executable: ${DOCKER_BIN}"
fi
if [[ ! -f "${ENV_FILE}" || -L "${ENV_FILE}" ]]; then
  fail "production environment file is missing or unsafe"
fi

acquire_operation_lock
umask 077

docker_config_dir=
release_temp=
config_container_id=
logged_in=false

cleanup() {
  if [[ -n "${config_container_id}" ]]; then
    "${DOCKER_BIN}" rm "${config_container_id}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${release_temp}" && -d "${release_temp}" ]] \
    && [[ "$(/usr/bin/basename "${release_temp}")" == .tmp.* ]]
  then
    /bin/rm -rf -- "${release_temp}"
  fi
  if [[ "${logged_in}" == true && -n "${docker_config_dir}" ]]; then
    "${DOCKER_BIN}" --config "${docker_config_dir}" logout ghcr.io >/dev/null 2>&1 || true
  fi
  if [[ -n "${docker_config_dir}" && -d "${docker_config_dir}" ]] \
    && [[ "$(/usr/bin/basename "${docker_config_dir}")" == cubing-hub-maintenance-docker.* ]]
  then
    /bin/rm -rf -- "${docker_config_dir}"
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

case "${command_name}" in
  prepare-upgrade)
    prepare_upgrade "$@"
    ;;
  verify-rollback-volume)
    verify_rollback_volume "$@"
    ;;
  prepare-rollback)
    prepare_rollback "$@"
    ;;
  apply)
    apply_candidate "$1"
    ;;
  recover)
    recover_transition
    ;;
esac
