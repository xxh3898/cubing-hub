#!/bin/bash

set -Eeuo pipefail

readonly LOCKF_BIN=/usr/bin/lockf
readonly PYTHON_BIN=/usr/bin/python3
readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub
readonly LEGACY_BACKUP_SCRIPT=/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh
readonly RUNTIME_CONFIG_ROOT="${APP_DIR}/runtime-config"
readonly RUNTIME_CONFIG_RELEASES="${RUNTIME_CONFIG_ROOT}/releases"
readonly RUNTIME_CONFIG_STATE="${RUNTIME_CONFIG_ROOT}/state"
readonly RUNTIME_CONFIG_PENDING="${RUNTIME_CONFIG_ROOT}/pending"
readonly RUNTIME_CONFIG_CURRENT="${RUNTIME_CONFIG_ROOT}/current"
readonly RUNTIME_CONFIG_INITIALIZED="${APP_DIR}/.runtime-config-v2-initialized"
readonly MAINTENANCE_ROOT="${RUNTIME_CONFIG_ROOT}/mysql-maintenance"
readonly MAINTENANCE_QUIESCE="${MAINTENANCE_ROOT}/quiesce.state"
readonly MAINTENANCE_FINAL_BACKUP_WORKERS="${MAINTENANCE_ROOT}/final-backup-workers"
readonly OPERATION_LOCK="${APP_DIR}/.cubing-hub-operation.lock"
readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000

fail() {
  printf 'Cubing Hub backup bootstrap failed: %s\n' "$1" >&2
  exit 1
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

is_digest() {
  [[ "$1" =~ ^sha256:[0-9a-f]{64}$ ]] && [[ "$1" != "${ZERO_DIGEST}" ]]
}

is_sha() {
  [[ "$1" =~ ^[0-9a-f]{40}$ ]] && [[ "$1" != "${ZERO_SHA}" ]]
}

is_evidence_id() {
  [[ "$1" =~ ^[0-9a-f]{64}$ ]]
}

has_mode() {
  "${PYTHON_BIN}" -c \
    'import os, stat, sys; raise SystemExit(0 if stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == int(sys.argv[2], 8) else 1)' \
    "$1" "$2"
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

runtime_config_content_sha256() {
  local release_dir="$1"
  local shape="$2"

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

validate_maintenance_final_worker() {
  local computed_id
  local current_application_revision
  local current_runtime_content_sha
  local current_runtime_digest
  local current_runtime_revision
  local evidence_dir
  local evidence_file
  local evidence_id="$1"
  local keys
  local quiesce_evidence_id
  local target_release
  local target_shape
  local worker_sha

  is_evidence_id "${evidence_id}" \
    || fail "final backup worker evidence ID is invalid"
  evidence_dir="${MAINTENANCE_FINAL_BACKUP_WORKERS}/${evidence_id}"
  evidence_file="${evidence_dir}/worker.env"
  if [[ ! -d "${MAINTENANCE_ROOT}" || -L "${MAINTENANCE_ROOT}" ]] \
    || ! has_mode "${MAINTENANCE_ROOT}" 700 \
    || [[ ! -d "${MAINTENANCE_FINAL_BACKUP_WORKERS}" \
      || -L "${MAINTENANCE_FINAL_BACKUP_WORKERS}" ]] \
    || ! has_mode "${MAINTENANCE_FINAL_BACKUP_WORKERS}" 700 \
    || [[ ! -d "${evidence_dir}" || -L "${evidence_dir}" ]] \
    || ! has_mode "${evidence_dir}" 500 \
    || [[ ! -f "${evidence_file}" || -L "${evidence_file}" ]] \
    || ! has_mode "${evidence_file}" 400
  then
    fail "final backup worker evidence is missing, unsafe, or mutable"
  fi
  keys="$(
    /usr/bin/awk -F= 'NF >= 2 { print $1 }' "${evidence_file}" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${keys}" != $'API_IMAGE\nAPPLICATION_REVISION\nBACKUP_WORKER_SHA256\nCREATED_AT\nEVIDENCE_ID\nPROJECT\nQUIESCE_EVIDENCE_ID\nSCHEMA_VERSION\nSOURCE_DB_IMAGE_EXACT\nSOURCE_DB_IMAGE_ID\nSOURCE_DB_VOLUME\nSOURCE_MYSQL_VERSION\nSOURCE_RUNTIME_CONFIG_CONTENT_SHA256\nSOURCE_RUNTIME_CONFIG_DIGEST\nSOURCE_RUNTIME_CONFIG_REVISION\nTARGET_RUNTIME_CONFIG_CONTENT_SHA256\nTARGET_RUNTIME_CONFIG_DIGEST\nTARGET_RUNTIME_CONFIG_REVISION\nWEB_IMAGE' ]]; then
    fail "final backup worker evidence keys are invalid"
  fi
  computed_id="$(
    /usr/bin/sed '/^EVIDENCE_ID=/d' "${evidence_file}" \
      | /usr/bin/shasum -a 256 \
      | /usr/bin/awk '{print $1}'
  )"
  [[ "$(read_exact_value "${evidence_file}" SCHEMA_VERSION)" == 1 ]] \
    && [[ "$(read_exact_value "${evidence_file}" PROJECT)" == cubing-hub ]] \
    && [[ "$(read_exact_value "${evidence_file}" EVIDENCE_ID)" == "${evidence_id}" ]] \
    && [[ "${computed_id}" == "${evidence_id}" ]] \
    || fail "final backup worker evidence integrity is invalid"

  final_backup_quiesce_evidence_id="$(
    read_exact_value "${evidence_file}" QUIESCE_EVIDENCE_ID
  )"
  final_backup_application_revision="$(
    read_exact_value "${evidence_file}" APPLICATION_REVISION
  )"
  final_backup_source_runtime_revision="$(
    read_exact_value "${evidence_file}" SOURCE_RUNTIME_CONFIG_REVISION
  )"
  final_backup_source_runtime_digest="$(
    read_exact_value "${evidence_file}" SOURCE_RUNTIME_CONFIG_DIGEST
  )"
  final_backup_source_runtime_content_sha="$(
    read_exact_value "${evidence_file}" SOURCE_RUNTIME_CONFIG_CONTENT_SHA256
  )"
  final_backup_target_runtime_revision="$(
    read_exact_value "${evidence_file}" TARGET_RUNTIME_CONFIG_REVISION
  )"
  final_backup_target_runtime_digest="$(
    read_exact_value "${evidence_file}" TARGET_RUNTIME_CONFIG_DIGEST
  )"
  final_backup_target_runtime_content_sha="$(
    read_exact_value "${evidence_file}" TARGET_RUNTIME_CONFIG_CONTENT_SHA256
  )"
  worker_sha="$(read_exact_value "${evidence_file}" BACKUP_WORKER_SHA256)"
  if ! is_evidence_id "${final_backup_quiesce_evidence_id}" \
    || ! is_sha "${final_backup_application_revision}" \
    || ! is_sha "${final_backup_source_runtime_revision}" \
    || ! is_digest "${final_backup_source_runtime_digest}" \
    || [[ ! "${final_backup_source_runtime_content_sha}" =~ ^[0-9a-f]{64}$ ]] \
    || ! is_sha "${final_backup_target_runtime_revision}" \
    || ! is_digest "${final_backup_target_runtime_digest}" \
    || [[ ! "${final_backup_target_runtime_content_sha}" =~ ^[0-9a-f]{64}$ ]] \
    || [[ ! "${worker_sha}" =~ ^[0-9a-f]{64}$ ]]
  then
    fail "final backup worker evidence values are invalid"
  fi

  current_application_revision="$(read_exact_value "${RUNTIME_CONFIG_STATE}" APPLICATION_REVISION)"
  current_runtime_revision="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_REVISION)"
  current_runtime_digest="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_DIGEST)"
  current_runtime_content_sha="$(read_exact_value "${RUNTIME_CONFIG_STATE}" RUNTIME_CONFIG_CONTENT_SHA256)"
  [[ "${current_application_revision}" == "${final_backup_application_revision}" ]] \
    && [[ "${current_runtime_revision}" == "${final_backup_source_runtime_revision}" ]] \
    && [[ "${current_runtime_digest}" == "${final_backup_source_runtime_digest}" ]] \
    && [[ "${current_runtime_content_sha}" == "${final_backup_source_runtime_content_sha}" ]] \
    || fail "final backup worker evidence is stale for the current source runtime"

  if [[ ! -f "${MAINTENANCE_QUIESCE}" || -L "${MAINTENANCE_QUIESCE}" ]] \
    || ! has_mode "${MAINTENANCE_QUIESCE}" 400
  then
    fail "maintenance final backup requires safe active quiesce evidence"
  fi
  quiesce_evidence_id="$(
    read_exact_value "${MAINTENANCE_QUIESCE}" EVIDENCE_ID
  )"
  [[ "${quiesce_evidence_id}" == "${final_backup_quiesce_evidence_id}" ]] \
    || fail "final backup worker evidence does not match active quiesce"

  target_release="${RUNTIME_CONFIG_RELEASES}/${final_backup_target_runtime_digest#sha256:}"
  target_shape="$(release_shape "${target_release}")"
  [[ "${target_shape}" == synced ]] \
    || fail "final backup worker runtime release must contain synced scripts"
  validate_synced_scripts "${target_release}"
  [[ "$(runtime_config_content_sha256 "${target_release}" "${target_shape}")" == "${final_backup_target_runtime_content_sha}" ]] \
    || fail "final backup worker runtime release integrity check failed"
  maintenance_backup_script="${target_release}/scripts/backup-cubing-hub.sh"
  [[ "$(/usr/bin/shasum -a 256 "${maintenance_backup_script}" | /usr/bin/awk '{print $1}')" == "${worker_sha}" ]] \
    || fail "final backup worker script integrity check failed"
}

backup_mode=normal
final_backup_worker_evidence_id=
if [[ "$#" -eq 2 && "$1" == maintenance-final ]]; then
  backup_mode=maintenance-final
  final_backup_worker_evidence_id="$2"
elif [[ "$#" -ne 0 ]]; then
  printf 'Usage: backup-cubing-hub-bootstrap.sh [maintenance-final <worker-evidence-id>]\n' >&2
  exit 64
fi
acquire_operation_lock
if [[ -e "${RUNTIME_CONFIG_PENDING}" || -L "${RUNTIME_CONFIG_PENDING}" ]]; then
  fail "an incomplete runtime config transaction requires recovery"
fi

if [[ ! -e "${RUNTIME_CONFIG_STATE}" && ! -L "${RUNTIME_CONFIG_STATE}" ]]; then
  [[ "${backup_mode}" == normal ]] \
    || fail "maintenance final backup requires verified runtime config v2 state"
  if [[ -e "${RUNTIME_CONFIG_CURRENT}" || -L "${RUNTIME_CONFIG_CURRENT}" ]] \
    || [[ -e "${RUNTIME_CONFIG_INITIALIZED}" || -L "${RUNTIME_CONFIG_INITIALIZED}" ]]
  then
    fail "runtime config pointer or marker exists without verified state"
  fi
  exec "${LEGACY_BACKUP_SCRIPT}"
fi

validate_initialization_marker
validate_state_file
runtime_digest="$(read_state_value RUNTIME_CONFIG_DIGEST)"
expected_content_sha="$(read_state_value RUNTIME_CONFIG_CONTENT_SHA256)"
release_dir="${RUNTIME_CONFIG_RELEASES}/${runtime_digest#sha256:}"
expected_current_target="releases/${runtime_digest#sha256:}"

if [[ ! -L "${RUNTIME_CONFIG_CURRENT}" ]] \
  || [[ "$(/usr/bin/readlink "${RUNTIME_CONFIG_CURRENT}")" != "${expected_current_target}" ]]
then
  fail "runtime config current pointer does not match verified state"
fi

shape="$(release_shape "${release_dir}")"
if [[ "$(runtime_config_content_sha256 "${release_dir}" "${shape}")" != "${expected_content_sha}" ]]; then
  fail "runtime config release integrity check failed"
fi
if [[ "${backup_mode}" == maintenance-final ]]; then
  validate_maintenance_final_worker "${final_backup_worker_evidence_id}"
  exec "${maintenance_backup_script}" \
    --trigger maintenance-final \
    --worker-evidence "${final_backup_worker_evidence_id}"
fi
if [[ "${shape}" == legacy ]]; then
  exec "${LEGACY_BACKUP_SCRIPT}"
fi

validate_synced_scripts "${release_dir}"
exec "${release_dir}/scripts/backup-cubing-hub.sh"
