#!/bin/bash

set -Eeuo pipefail

readonly DOCKER_BIN=/usr/local/bin/docker
readonly LOCKF_BIN=/usr/bin/lockf
readonly PYTHON_BIN=/usr/bin/python3
readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub
readonly ENV_FILE="${APP_DIR}/.env"
readonly LEGACY_DEPLOY_SCRIPT=/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub.sh
readonly RUNTIME_CONFIG_ROOT="${APP_DIR}/runtime-config"
readonly RUNTIME_CONFIG_RELEASES="${RUNTIME_CONFIG_ROOT}/releases"
readonly RUNTIME_CONFIG_STATE="${RUNTIME_CONFIG_ROOT}/state"
readonly RUNTIME_CONFIG_PENDING="${RUNTIME_CONFIG_ROOT}/pending"
readonly RUNTIME_CONFIG_CURRENT="${RUNTIME_CONFIG_ROOT}/current"
readonly RUNTIME_CONFIG_INITIALIZED="${APP_DIR}/.runtime-config-v2-initialized"
readonly MAINTENANCE_QUIESCE="${RUNTIME_CONFIG_ROOT}/mysql-maintenance/quiesce.state"
readonly OPERATION_LOCK="${APP_DIR}/.cubing-hub-operation.lock"
readonly PROJECT_NAME=cubing-hub
readonly RUNTIME_CONFIG_REPOSITORY=ghcr.io/xxh3898/cubing-hub-runtime-config
readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000

fail() {
  printf 'Cubing Hub deploy bootstrap failed: %s\n' "$1" >&2
  exit 1
}

fail_if_maintenance_quiesced() {
  if [[ -e "${MAINTENANCE_QUIESCE}" || -L "${MAINTENANCE_QUIESCE}" ]]; then
    fail "application is quiesced for MySQL maintenance; use the maintenance worker"
  fi
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
  if "${LOCKF_BIN}" -s -t 0 9
  then
    return
  else
    lock_status="$?"
  fi

  exec 9>&-
  if [[ "${lock_status}" -eq 75 ]]; then
    printf 'Another Cubing Hub deploy or backup operation is already running\n' >&2
    exit 75
  fi
  fail "operation lock validation failed"
}

acquire_inspection_lock() {
  local lock_status

  if [[ ! -x "${PYTHON_BIN}" ]]; then
    fail "Python is not executable: ${PYTHON_BIN}"
  fi
  if [[ ! -x "${LOCKF_BIN}" ]]; then
    fail "lockf is not executable: ${LOCKF_BIN}"
  fi
  if [[ ! -f "${OPERATION_LOCK}" || -L "${OPERATION_LOCK}" ]]; then
    fail "operation lock must already be a regular non-symlink file"
  fi
  if ! "${PYTHON_BIN}" -c \
    'import os, stat, sys; raise SystemExit(0 if stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == 0o600 else 1)' \
    "${OPERATION_LOCK}"
  then
    fail "operation lock mode must be 600"
  fi
  if ! exec 9<>"${OPERATION_LOCK}"; then
    fail "operation lock file could not be opened"
  fi

  if "${LOCKF_BIN}" -s -t 0 9
  then
    return
  else
    lock_status="$?"
  fi

  exec 9>&-
  if [[ "${lock_status}" -eq 75 ]]; then
    printf 'Another Cubing Hub operation is already running\n' >&2
    exit 75
  fi
  fail "operation lock validation failed"
}

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

validate_initialization_marker() {
  if [[ ! -f "${RUNTIME_CONFIG_INITIALIZED}" ]] \
    || [[ -L "${RUNTIME_CONFIG_INITIALIZED}" ]] \
    || [[ "$(/bin/cat "${RUNTIME_CONFIG_INITIALIZED}")" != RUNTIME_CONFIG_V2=initialized ]]
  then
    fail "runtime config initialization marker is invalid"
  fi
}

release_shape() {
  local entries
  local release_dir="$1"
  local unexpected

  if [[ ! -d "${release_dir}" || -L "${release_dir}" ]]; then
    fail "runtime config release is missing or unsafe"
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
    printf 'legacy'
    return
  fi
  if [[ "${entries}" == $'compose.yaml\nnginx\nnginx/cloudflare-edge-real-ip.conf\nscripts\nscripts/backup-cubing-hub.sh\nscripts/deploy-cubing-hub.sh' ]]; then
    printf 'synced'
    return
  fi
  fail "runtime config entry allowlist does not match"
}

validate_synced_scripts() {
  local release_dir="$1"
  local script

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
    if ! /bin/bash -n "${script}"; then
      fail "runtime config script syntax is invalid"
    fi
  done
}

validate_release() {
  local expected_shape="${2:-either}"
  local release_dir="$1"
  local shape

  shape="$(release_shape "${release_dir}")"
  if [[ "${expected_shape}" != either && "${shape}" != "${expected_shape}" ]]; then
    fail "runtime config release shape is not ${expected_shape}"
  fi
  if [[ "${shape}" == synced ]]; then
    validate_synced_scripts "${release_dir}"
  fi
  printf '%s' "${shape}"
}

runtime_config_content_sha256() {
  local release_dir="$1"
  local shape

  shape="$(validate_release "${release_dir}")"
  {
    /usr/bin/shasum -a 256 "${release_dir}/compose.yaml"
    /usr/bin/shasum -a 256 \
      "${release_dir}/nginx/cloudflare-edge-real-ip.conf"
    if [[ "${shape}" == synced ]]; then
      /usr/bin/shasum -a 256 \
        "${release_dir}/scripts/backup-cubing-hub.sh"
      /usr/bin/shasum -a 256 \
        "${release_dir}/scripts/deploy-cubing-hub.sh"
    fi
  } | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
}

validate_verified_state() {
  local current_target
  local expected_content_sha
  local expected_current_target
  local release_dir
  local runtime_digest

  if [[ ! -e "${RUNTIME_CONFIG_STATE}" && ! -L "${RUNTIME_CONFIG_STATE}" ]]; then
    if [[ -e "${RUNTIME_CONFIG_CURRENT}" || -L "${RUNTIME_CONFIG_CURRENT}" ]] \
      || [[ -e "${RUNTIME_CONFIG_INITIALIZED}" || -L "${RUNTIME_CONFIG_INITIALIZED}" ]]
    then
      fail "runtime config pointer or marker exists without verified state"
    fi
    return
  fi

  validate_initialization_marker
  validate_state_file
  runtime_digest="$(read_state_value RUNTIME_CONFIG_DIGEST)"
  expected_content_sha="$(read_state_value RUNTIME_CONFIG_CONTENT_SHA256)"
  release_dir="${RUNTIME_CONFIG_RELEASES}/${runtime_digest#sha256:}"
  expected_current_target="releases/${runtime_digest#sha256:}"

  if [[ ! -L "${RUNTIME_CONFIG_CURRENT}" ]]; then
    fail "verified runtime config current pointer is missing"
  fi
  current_target="$(/usr/bin/readlink "${RUNTIME_CONFIG_CURRENT}")"
  if [[ "${current_target}" != "${expected_current_target}" ]]; then
    fail "runtime config current pointer does not match verified state"
  fi
  validate_release "${release_dir}" >/dev/null
  if [[ "$(runtime_config_content_sha256 "${release_dir}")" != "${expected_content_sha}" ]]; then
    fail "runtime config release integrity check failed"
  fi

  printf '%s' "${release_dir}"
}

read_env_value() {
  local key="$1"

  "${PYTHON_BIN}" - "${ENV_FILE}" "${key}" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
key = sys.argv[2]
if not path.is_file() or path.is_symlink():
    raise SystemExit("production environment file is missing or unsafe")
values = []
for line in path.read_text(encoding="utf-8").splitlines():
    candidate, separator, value = line.partition("=")
    if separator and candidate == key:
        values.append(value)
if len(values) != 1 or not values[0]:
    raise SystemExit(f"{key} must appear exactly once and be non-empty")
print(values[0], end="")
PY
}

inspection_compose() {
  local api_image="$2"
  local db_image="$4"
  local db_volume="$5"
  local release_dir="$1"
  local web_image="$3"
  shift 5

  API_IMAGE="${api_image}" \
  WEB_IMAGE="${web_image}" \
  DB_IMAGE="${db_image}" \
  DB_VOLUME_NAME="${db_volume}" \
    "${DOCKER_BIN}" compose \
      --project-name "${PROJECT_NAME}" \
      --project-directory "${release_dir}" \
      --env-file "${ENV_FILE}" \
      --file "${release_dir}/compose.yaml" \
      "$@"
}

validate_inspection_service_image() {
  local actual_image_id
  local actual_project
  local actual_service
  local container_id
  local expected_image="$2"
  local expected_image_id
  local expected_image_revision
  local expected_revision="$4"
  local release_dir="$1"
  local service="$3"

  container_id="$(
    inspection_compose \
      "${release_dir}" \
      "${inspection_api_image}" \
      "${inspection_web_image}" \
      "${inspection_db_image}" \
      "${inspection_db_volume}" \
      ps -q "${service}"
  )"
  [[ "${container_id}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] \
    || fail "${service} container identity is missing or invalid"
  expected_image_id="$("${DOCKER_BIN}" image inspect --format '{{.Id}}' "${expected_image}")"
  expected_image_revision="$(
    "${DOCKER_BIN}" image inspect \
      --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
      "${expected_image}"
  )"
  actual_image_id="$("${DOCKER_BIN}" container inspect --format '{{.Image}}' "${container_id}")"
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
  [[ "${expected_image_id}" =~ ^sha256:[0-9a-f]{64}$ ]] \
    && [[ "${actual_image_id}" == "${expected_image_id}" ]] \
    || fail "${service} container image does not match the committed application"
  [[ "${expected_image_revision}" == "${expected_revision}" ]] \
    || fail "${service} image revision label does not match the committed application"
  [[ "${actual_project}" == "${PROJECT_NAME}" && "${actual_service}" == "${service}" ]] \
    || fail "${service} container does not belong to the expected Compose service"
}

validate_inspection_service_set() {
  local rendered="$1"

  printf '%s' "${rendered}" | "${PYTHON_BIN}" -c '
import json
import sys

raw = sys.stdin.read().strip()
if not raw:
    raise SystemExit("no service status was returned")
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
        raise SystemExit("production service set is not running")
    seen.add(service)
    health = str(entry.get("Health", "")).lower()
    if service in {"db", "redis", "web"} and health != "healthy":
        raise SystemExit("production service health is not ready")
    if health and health != "healthy":
        raise SystemExit("production service health is invalid")
if seen != required:
    raise SystemExit("production service set is incomplete")
'
}

inspect_verified_runtime() {
  local actual_db_health
  local actual_db_image_id
  local actual_db_project
  local actual_db_service
  local actual_db_volume
  local actual_mysql_version
  local current_pointer
  local db_container_id
  local effective_db_contract
  local expected_application_revision="$1"
  local expected_db_image="$4"
  local expected_db_volume="$5"
  local expected_mysql_version="$6"
  local expected_runtime_digest="$3"
  local expected_runtime_revision="$2"
  local expected_db_image_id
  local inspection_api_image
  local inspection_db_image
  local inspection_db_volume
  local inspection_web_image
  local release_dir
  local service_status
  local volume_users

  if [[ -e "${RUNTIME_CONFIG_PENDING}" || -L "${RUNTIME_CONFIG_PENDING}" ]]; then
    fail "runtime config transaction is pending"
  fi
  release_dir="$(validate_verified_state)"
  [[ -n "${release_dir}" ]] || fail "verified runtime config state is unavailable"
  [[ "$(validate_release "${release_dir}")" == synced ]] \
    || fail "runtime inspection requires a script-enabled release"

  [[ "$(read_state_value APPLICATION_REVISION)" == "${expected_application_revision}" ]] \
    || fail "application revision does not match inspection intent"
  [[ "$(read_state_value RUNTIME_CONFIG_REVISION)" == "${expected_runtime_revision}" ]] \
    || fail "runtime config revision does not match inspection intent"
  [[ "$(read_state_value RUNTIME_CONFIG_DIGEST)" == "${expected_runtime_digest}" ]] \
    || fail "runtime config digest does not match inspection intent"

  inspection_api_image="$(read_env_value API_IMAGE)"
  inspection_web_image="$(read_env_value WEB_IMAGE)"
  inspection_db_image="$(read_env_value DB_IMAGE)"
  inspection_db_volume="$(read_env_value DB_VOLUME_NAME)"
  [[ "${inspection_api_image}" == "ghcr.io/xxh3898/cubing-hub-api:${expected_application_revision}" ]] \
    || fail "API image does not match the committed application revision"
  [[ "${inspection_web_image}" == "ghcr.io/xxh3898/cubing-hub-web:${expected_application_revision}" ]] \
    || fail "Web image does not match the committed application revision"
  [[ "${inspection_db_image}" == "${expected_db_image}" ]] \
    || fail "DB image does not match inspection intent"
  [[ "${inspection_db_volume}" == "${expected_db_volume}" ]] \
    || fail "DB volume does not match inspection intent"

  effective_db_contract="$(
    inspection_compose \
      "${release_dir}" \
      "${inspection_api_image}" \
      "${inspection_web_image}" \
      "${inspection_db_image}" \
      "${inspection_db_volume}" \
      config --format json \
      | "${PYTHON_BIN}" -c '
import json
import sys

config = json.load(sys.stdin)
db = config.get("services", {}).get("db", {})
volume = config.get("volumes", {}).get("mysql-data", {})
mounts = [
    item for item in db.get("volumes", [])
    if isinstance(item, dict) and item.get("target") == "/var/lib/mysql"
]
if (
    len(mounts) != 1
    or mounts[0].get("type") != "volume"
    or mounts[0].get("source") != "mysql-data"
):
    raise SystemExit("effective MySQL mount is invalid")
print("{}\t{}".format(db.get("image", ""), volume.get("name", "")), end="")
'
  )" || fail "effective DB binding could not be rendered"
  [[ "${effective_db_contract}" == "${expected_db_image}"$'\t'"${expected_db_volume}" ]] \
    || fail "effective DB binding does not match inspection intent"

  validate_inspection_service_image \
    "${release_dir}" "${inspection_api_image}" api \
    "${expected_application_revision}"
  validate_inspection_service_image \
    "${release_dir}" "${inspection_web_image}" web \
    "${expected_application_revision}"

  db_container_id="$(
    inspection_compose \
      "${release_dir}" \
      "${inspection_api_image}" \
      "${inspection_web_image}" \
      "${inspection_db_image}" \
      "${inspection_db_volume}" \
      ps -q db
  )"
  [[ "${db_container_id}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] \
    || fail "DB container identity is missing or invalid"
  expected_db_image_id="$("${DOCKER_BIN}" image inspect --format '{{.Id}}' "${expected_db_image}")"
  actual_db_image_id="$("${DOCKER_BIN}" container inspect --format '{{.Image}}' "${db_container_id}")"
  actual_db_volume="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}' \
      "${db_container_id}"
  )"
  actual_db_project="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{ index .Config.Labels "com.docker.compose.project" }}' \
      "${db_container_id}"
  )"
  actual_db_service="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{ index .Config.Labels "com.docker.compose.service" }}' \
      "${db_container_id}"
  )"
  actual_db_health="$(
    "${DOCKER_BIN}" container inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "${db_container_id}"
  )"
  volume_users="$(
    "${DOCKER_BIN}" ps -a --no-trunc \
      --filter "volume=${expected_db_volume}" \
      --format '{{.ID}}'
  )"
  [[ "${expected_db_image_id}" =~ ^sha256:[0-9a-f]{64}$ ]] \
    && [[ "${actual_db_image_id}" == "${expected_db_image_id}" ]] \
    || fail "actual DB image does not match inspection intent"
  [[ "${actual_db_volume}" == "${expected_db_volume}" ]] \
    || fail "actual DB volume does not match inspection intent"
  [[ "${actual_db_project}" == "${PROJECT_NAME}" && "${actual_db_service}" == db ]] \
    || fail "actual DB container does not belong to the production Compose service"
  [[ "${actual_db_health}" == healthy && "${volume_users}" == "${db_container_id}" ]] \
    || fail "actual DB health or exclusive volume attachment is invalid"

  actual_mysql_version="$(
    "${DOCKER_BIN}" exec --env MAINTENANCE_QUERY=running-version \
      "${db_container_id}" /bin/sh -ceu '
        export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
        exec mysql --user=root --batch --skip-column-names "${MYSQL_DATABASE}" \
          --execute "SELECT VERSION()"
      '
  )" || fail "running MySQL version query failed"
  if [[ "${actual_mysql_version}" != "${expected_mysql_version}" ]] \
    && [[ "${actual_mysql_version}" != "${expected_mysql_version}"-* ]] \
    && [[ "${actual_mysql_version}" != "${expected_mysql_version}"+* ]]
  then
    fail "running MySQL version does not match inspection intent"
  fi

  service_status="$(
    inspection_compose \
      "${release_dir}" \
      "${inspection_api_image}" \
      "${inspection_web_image}" \
      "${inspection_db_image}" \
      "${inspection_db_volume}" \
      ps --format json
  )"
  validate_inspection_service_set "${service_status}" \
    || fail "production service set is unhealthy"

  current_pointer="$(/usr/bin/readlink "${RUNTIME_CONFIG_CURRENT}")"
  printf 'APPLICATION_REVISION=%s\n' "${expected_application_revision}"
  printf 'RUNTIME_CONFIG_REVISION=%s\n' "${expected_runtime_revision}"
  printf 'RUNTIME_CONFIG_DIGEST=%s\n' "${expected_runtime_digest}"
  printf 'RUNTIME_CONFIG_CONTENT_SHA256=%s\n' \
    "$(read_state_value RUNTIME_CONFIG_CONTENT_SHA256)"
  printf 'CURRENT_POINTER=%s\n' "${current_pointer}"
  printf 'PENDING=none\n'
  printf 'DB_IMAGE=%s\n' "${expected_db_image}"
  printf 'DB_VOLUME_NAME=%s\n' "${expected_db_volume}"
  printf 'MYSQL_VERSION=%s\n' "${actual_mysql_version}"
  printf 'SERVICE_SET=healthy\n'
}

validated_recovery_release() {
  local expected_content_sha
  local release_dir
  local runtime_digest

  if [[ ! -e "${RUNTIME_CONFIG_STATE}" && ! -L "${RUNTIME_CONFIG_STATE}" ]]; then
    return
  fi
  validate_state_file
  if [[ -e "${RUNTIME_CONFIG_INITIALIZED}" || -L "${RUNTIME_CONFIG_INITIALIZED}" ]]; then
    validate_initialization_marker
  fi
  runtime_digest="$(read_state_value RUNTIME_CONFIG_DIGEST)"
  expected_content_sha="$(read_state_value RUNTIME_CONFIG_CONTENT_SHA256)"
  release_dir="${RUNTIME_CONFIG_RELEASES}/${runtime_digest#sha256:}"
  validate_release "${release_dir}" >/dev/null
  if [[ "$(runtime_config_content_sha256 "${release_dir}")" != "${expected_content_sha}" ]]; then
    fail "runtime config release integrity check failed"
  fi
  printf '%s' "${release_dir}"
}

if [[ "$#" -eq 1 && "$1" == recover && -z "${SSH_ORIGINAL_COMMAND:-}" ]]; then
  acquire_operation_lock
  fail_if_maintenance_quiesced
  if [[ -f "${RUNTIME_CONFIG_PENDING}" ]] \
    && [[ "$(
      /usr/bin/sed -n 's/^TRANSACTION_TYPE=//p' "${RUNTIME_CONFIG_PENDING}" \
        | /usr/bin/tail -n 1
    )" == MYSQL_MAINTENANCE ]]
  then
    fail "MySQL maintenance pending state requires the dedicated maintenance worker"
  fi
  recovery_release="$(validated_recovery_release)"
  if [[ -n "${recovery_release}" ]] \
    && [[ "$(validate_release "${recovery_release}")" == synced ]]
  then
    exec "${recovery_release}/scripts/deploy-cubing-hub.sh" recover
  fi
  exec "${LEGACY_DEPLOY_SCRIPT}" recover
fi

if [[ "$#" -ne 0 ]]; then
  printf 'Only a direct local recover argument is allowed\n' >&2
  exit 64
fi

original_command="${SSH_ORIGINAL_COMMAND:-}"
if [[ "${original_command}" =~ ^inspect-cubing-hub-runtime[[:space:]]([0-9a-f]{40})[[:space:]]([0-9a-f]{40})[[:space:]](sha256:[0-9a-f]{64})[[:space:]](mysql:[0-9]+\.[0-9]+\.[0-9]+@sha256:[0-9a-f]{64})[[:space:]]([A-Za-z0-9][A-Za-z0-9_.-]{0,127})[[:space:]]([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  expected_application_revision="${BASH_REMATCH[1]}"
  expected_runtime_revision="${BASH_REMATCH[2]}"
  expected_runtime_digest="${BASH_REMATCH[3]}"
  expected_db_image="${BASH_REMATCH[4]}"
  expected_db_volume="${BASH_REMATCH[5]}"
  expected_mysql_version="${BASH_REMATCH[6]}"
  expected_image_version="${expected_db_image#mysql:}"
  expected_image_version="${expected_image_version%@sha256:*}"
  [[ "${expected_image_version}" == "${expected_mysql_version}" ]] \
    || fail "expected DB image and MySQL version are inconsistent"
  acquire_inspection_lock
  [[ ! -e "${RUNTIME_CONFIG_PENDING}" && ! -L "${RUNTIME_CONFIG_PENDING}" ]] \
    || fail "runtime config transaction is pending"
  if [[ ! -x "${DOCKER_BIN}" ]]; then
    fail "Docker CLI is not executable: ${DOCKER_BIN}"
  fi
  inspect_verified_runtime \
    "${expected_application_revision}" \
    "${expected_runtime_revision}" \
    "${expected_runtime_digest}" \
    "${expected_db_image}" \
    "${expected_db_volume}" \
    "${expected_mysql_version}"
  exit 0
fi
if [[ "${original_command}" =~ ^deploy-cubing-hub[[:space:]]([0-9a-fA-F]{40})[[:space:]]([A-Za-z0-9_-]+)$ ]]; then
  acquire_operation_lock
  fail_if_maintenance_quiesced
  exec "${LEGACY_DEPLOY_SCRIPT}" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
fi

config_mode=
config_digest=
commit_sha=
registry_user=

if [[ "${original_command}" =~ ^deploy-cubing-hub-v2[[:space:]]([0-9a-f]{40})[[:space:]]keep[[:space:]]([A-Za-z0-9_-]+)$ ]]; then
  commit_sha="${BASH_REMATCH[1]}"
  config_mode=keep
  registry_user="${BASH_REMATCH[2]}"
elif [[ "${original_command}" =~ ^deploy-cubing-hub-v2[[:space:]]([0-9a-f]{40})[[:space:]]update[[:space:]](sha256:[0-9a-f]{64})[[:space:]]([A-Za-z0-9_-]+)$ ]]; then
  commit_sha="${BASH_REMATCH[1]}"
  config_mode=update
  config_digest="${BASH_REMATCH[2]}"
  registry_user="${BASH_REMATCH[3]}"
else
  printf '%s\n' \
    'Only deploy-cubing-hub, deploy-cubing-hub-v2, or inspect-cubing-hub-runtime commands are allowed' \
    >&2
  exit 64
fi

if [[ "${config_mode}" == update ]] && ! is_digest "${config_digest}"; then
  printf 'Runtime config digest is invalid\n' >&2
  exit 64
fi
acquire_operation_lock
fail_if_maintenance_quiesced
if [[ ! -x "${DOCKER_BIN}" ]]; then
  fail "Docker CLI is not executable: ${DOCKER_BIN}"
fi
if [[ -e "${RUNTIME_CONFIG_PENDING}" || -L "${RUNTIME_CONFIG_PENDING}" ]]; then
  fail "an incomplete runtime config transaction requires recovery"
fi

current_release="$(validate_verified_state)"
if [[ "${config_mode}" == keep ]]; then
  if [[ -z "${current_release}" ]] \
    || [[ "$(validate_release "${current_release}")" != synced ]]
  then
    fail "keep mode requires a verified script-enabled runtime config release"
  fi
  candidate_release="${current_release}"
fi

registry_token="$(/bin/cat)"
if [[ -z "${registry_token}" ]]; then
  printf 'GHCR token must not be empty\n' >&2
  exit 64
fi

umask 077

docker_config_dir=
token_file=
release_temp=
config_container_id=
logged_in=false

cleanup() {
  registry_token=

  if [[ -n "${config_container_id}" ]]; then
    "${DOCKER_BIN}" rm "${config_container_id}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${release_temp}" && -d "${release_temp}" ]] \
    && [[ "$(/usr/bin/basename "${release_temp}")" == .tmp.* ]]
  then
    /bin/rm -rf -- "${release_temp}"
  fi
  if [[ "${logged_in}" == true && -n "${docker_config_dir}" ]]; then
    "${DOCKER_BIN}" \
      --config "${docker_config_dir}" \
      logout ghcr.io \
      >/dev/null 2>&1 \
      || true
  fi
  if [[ -n "${docker_config_dir}" && -d "${docker_config_dir}" ]] \
    && [[ "$(/usr/bin/basename "${docker_config_dir}")" == cubing-hub-bootstrap-docker.* ]]
  then
    /bin/rm -rf -- "${docker_config_dir}"
  fi
  if [[ -n "${token_file}" && -f "${token_file}" ]] \
    && [[ "$(/usr/bin/basename "${token_file}")" == cubing-hub-token.* ]]
  then
    /bin/rm -f -- "${token_file}"
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "${config_mode}" == update ]]; then
  config_image="${RUNTIME_CONFIG_REPOSITORY}@${config_digest}"
  docker_config_dir="$(
    /usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-hub-bootstrap-docker.XXXXXX"
  )"
  printf '%s' "${registry_token}" \
    | "${DOCKER_BIN}" \
        --config "${docker_config_dir}" \
        login ghcr.io \
        --username "${registry_user}" \
        --password-stdin \
        >/dev/null
  logged_in=true

  "${DOCKER_BIN}" \
    --config "${docker_config_dir}" \
    pull "${config_image}" \
    >/dev/null

  actual_revision="$(
    "${DOCKER_BIN}" \
      image inspect \
      --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
      "${config_image}"
  )"
  if [[ "${actual_revision}" != "${commit_sha}" ]]; then
    fail "runtime config revision label does not match deployment revision"
  fi
  actual_project="$(
    "${DOCKER_BIN}" \
      image inspect \
      --format '{{ index .Config.Labels "io.chochiho.runtime-config.project" }}' \
      "${config_image}"
  )"
  if [[ "${actual_project}" != cubing-hub ]]; then
    fail "runtime config project label is invalid"
  fi

  /bin/mkdir -p "${RUNTIME_CONFIG_RELEASES}"
  candidate_release="${RUNTIME_CONFIG_RELEASES}/${config_digest#sha256:}"
  release_temp="$(
    /usr/bin/mktemp -d "${RUNTIME_CONFIG_RELEASES}/.tmp.XXXXXX"
  )"
  config_container_id="$("${DOCKER_BIN}" create "${config_image}")"
  "${DOCKER_BIN}" cp "${config_container_id}:/runtime/." "${release_temp}"
  "${DOCKER_BIN}" rm "${config_container_id}" >/dev/null
  config_container_id=

  validate_release "${release_temp}" synced >/dev/null
  /bin/chmod -R go-rwx "${release_temp}"
  validate_release "${release_temp}" synced >/dev/null

  if [[ -d "${candidate_release}" ]]; then
    validate_release "${candidate_release}" synced >/dev/null
    if ! /usr/bin/diff -qr "${release_temp}" "${candidate_release}" >/dev/null; then
      fail "existing runtime config release differs from exact digest artifact"
    fi
    /bin/rm -rf -- "${release_temp}"
    release_temp=
  else
    /bin/mv -- "${release_temp}" "${candidate_release}"
    release_temp=
  fi
fi

candidate_script="${candidate_release}/scripts/deploy-cubing-hub.sh"
if [[ ! -x "${candidate_script}" || -L "${candidate_script}" ]]; then
  fail "verified candidate deploy script is missing or unsafe"
fi

token_file="$(
  /usr/bin/mktemp "${TMPDIR:-/tmp}/cubing-hub-token.XXXXXX"
)"
/bin/chmod 600 "${token_file}"
printf '%s' "${registry_token}" >"${token_file}"
registry_token=
exec 3<"${token_file}"
/bin/rm -f -- "${token_file}"
token_file=

cleanup
trap - EXIT INT TERM

if [[ "${config_mode}" == update ]]; then
  exec "${candidate_script}" \
    "${commit_sha}" \
    update \
    "${config_digest}" \
    "${registry_user}" \
    <&3 3<&-
fi
exec "${candidate_script}" \
  "${commit_sha}" \
  keep \
  "${registry_user}" \
  <&3 3<&-
