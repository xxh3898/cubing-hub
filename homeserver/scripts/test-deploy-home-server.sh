#!/bin/bash

set -Eeuo pipefail

PROJECT_ROOT="$(
  CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd
)"
SOURCE_SCRIPT="${PROJECT_ROOT}/homeserver/scripts/deploy-home-server.sh"
MOCK_DOCKER="${PROJECT_ROOT}/homeserver/scripts/fixtures/mock-cubing-hub-docker.sh"

REVISION_ONE=1111111111111111111111111111111111111111
REVISION_TWO=2222222222222222222222222222222222222222
REVISION_THREE=3333333333333333333333333333333333333333
CONFIG_DIGEST=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
CONFIG_DIGEST_TWO=sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
CONFIG_DIGEST_THREE=sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
CONFIG_DIGEST_FIVE=sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

test_root="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-hub-deploy-test.XXXXXX")"
cleanup() {
  if [[ "$(/usr/bin/basename "${test_root}")" == cubing-hub-deploy-test.* ]]; then
    /bin/rm -rf -- "${test_root}"
  fi
}
trap cleanup EXIT INT TERM

app_dir="${test_root}/app"
test_script="${test_root}/deploy-cubing-hub.sh"
backup_script="${test_root}/backup.sh"
runtime_backup_script="${test_root}/runtime-backup.sh"
backup_log="${test_root}/backup.log"
runtime_compose="${test_root}/runtime-compose.yaml"
runtime_real_ip="${test_root}/cloudflare-edge-real-ip.conf"
/bin/mkdir -p "${app_dir}"
/bin/cp "${PROJECT_ROOT}/homeserver/docker-compose.yml" "${app_dir}/compose.yaml"
/bin/cp "${PROJECT_ROOT}/homeserver/docker-compose.yml" "${runtime_compose}"
/bin/cp \
  "${PROJECT_ROOT}/homeserver/nginx/cloudflare-edge-real-ip.conf" \
  "${runtime_real_ip}"
/bin/cp "${PROJECT_ROOT}/homeserver/.env.example" "${app_dir}/.env"

/usr/bin/sed \
  -e "s#^API_IMAGE=.*#API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_TWO}#" \
  -e "s#^WEB_IMAGE=.*#WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:${REVISION_TWO}#" \
  "${app_dir}/.env" >"${app_dir}/.env.updated"
/bin/mv "${app_dir}/.env.updated" "${app_dir}/.env"

printf '%s\n' \
  '#!/bin/bash' \
  'printf "%s\n" "${BASH_SOURCE[0]}" >>"${FAKE_BACKUP_LOG}"' \
  >"${backup_script}"
/bin/cp "${backup_script}" "${runtime_backup_script}"
/bin/chmod 700 "${backup_script}" "${runtime_backup_script}"
: >"${backup_log}"

/usr/bin/sed \
  -e "s#readonly DOCKER_BIN=/usr/local/bin/docker#readonly DOCKER_BIN=${MOCK_DOCKER}#" \
  -e "s#readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub#readonly APP_DIR=${app_dir}#" \
  -e "s#readonly BACKUP_SCRIPT=/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh#readonly BACKUP_SCRIPT=${backup_script}#" \
  "${SOURCE_SCRIPT}" \
  >"${test_script}"
/bin/chmod 700 "${test_script}" "${MOCK_DOCKER}"

run_deploy() {
  local target_revision="$1"

  printf 'test-token' \
    | /usr/bin/env \
        FAKE_RUNTIME_COMPOSE="${runtime_compose}" \
        FAKE_RUNTIME_REAL_IP="${runtime_real_ip}" \
        FAKE_RUNTIME_BACKUP_SCRIPT="${FAKE_RUNTIME_BACKUP_SCRIPT:-${runtime_backup_script}}" \
        FAKE_RUNTIME_DEPLOY_SCRIPT="${FAKE_RUNTIME_DEPLOY_SCRIPT:-${test_script}}" \
        FAKE_RUNTIME_EXTRA_DIR="${FAKE_RUNTIME_EXTRA_DIR:-false}" \
        FAKE_RUNTIME_EXTRA_FILE="${FAKE_RUNTIME_EXTRA_FILE:-false}" \
        FAKE_RUNTIME_INSECURE_SCRIPT_MODE="${FAKE_RUNTIME_INSECURE_SCRIPT_MODE:-false}" \
        FAKE_RUNTIME_INVALID_DEPLOY_SYNTAX="${FAKE_RUNTIME_INVALID_DEPLOY_SYNTAX:-false}" \
        FAKE_RUNTIME_SYMLINK="${FAKE_RUNTIME_SYMLINK:-false}" \
        FAKE_BACKUP_LOG="${backup_log}" \
        FAKE_CONFIG_REVISION="${FAKE_CONFIG_REVISION:-${REVISION_ONE}}" \
        FAKE_CONFIG_PROJECT="${FAKE_CONFIG_PROJECT:-cubing-hub}" \
        FAKE_REVISION_ONE="${REVISION_ONE}" \
        FAKE_REVISION_TWO="${REVISION_TWO}" \
        FAKE_REVISION_THREE="${REVISION_THREE}" \
        FAKE_VALIDATION_TARGET_API_IMAGE="ghcr.io/xxh3898/cubing-hub-api:${target_revision}" \
        FAKE_DOCKER_LOG="${FAKE_DOCKER_LOG:-}" \
        FAKE_FAIL_CP="${FAKE_FAIL_CP:-false}" \
        FAKE_FAIL_APP_UP_ONCE_FILE="${FAKE_FAIL_APP_UP_ONCE_FILE:-}" \
        FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT="${FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT:-}" \
        FAKE_CANDIDATE_API_EXTRA_HOSTS_JSON="${FAKE_CANDIDATE_API_EXTRA_HOSTS_JSON:-}" \
        FAKE_CANDIDATE_API_EXTRA_VOLUME="${FAKE_CANDIDATE_API_EXTRA_VOLUME:-}" \
        FAKE_CANDIDATE_API_CONFIGS_JSON="${FAKE_CANDIDATE_API_CONFIGS_JSON:-}" \
        FAKE_CANDIDATE_API_COMMAND_JSON="${FAKE_CANDIDATE_API_COMMAND_JSON:-}" \
        FAKE_CANDIDATE_API_ENTRYPOINT_JSON="${FAKE_CANDIDATE_API_ENTRYPOINT_JSON:-}" \
        FAKE_CANDIDATE_API_ENV_FILE_JSON="${FAKE_CANDIDATE_API_ENV_FILE_JSON:-}" \
        FAKE_CANDIDATE_API_IMAGE="${FAKE_CANDIDATE_API_IMAGE:-}" \
        FAKE_CANDIDATE_API_PID_JSON="${FAKE_CANDIDATE_API_PID_JSON:-}" \
        FAKE_CANDIDATE_API_PORTS_JSON="${FAKE_CANDIDATE_API_PORTS_JSON:-}" \
        FAKE_CANDIDATE_API_PRIVILEGED="${FAKE_CANDIDATE_API_PRIVILEGED:-}" \
        FAKE_CANDIDATE_API_SECRETS_JSON="${FAKE_CANDIDATE_API_SECRETS_JSON:-}" \
        FAKE_CANDIDATE_API_TMPFS_JSON="${FAKE_CANDIDATE_API_TMPFS_JSON:-}" \
        FAKE_CANDIDATE_API_USER_JSON="${FAKE_CANDIDATE_API_USER_JSON:-}" \
        FAKE_CANDIDATE_APPLICATION_JSON="${FAKE_CANDIDATE_APPLICATION_JSON:-}" \
        FAKE_CANDIDATE_DATABASE_NAME="${FAKE_CANDIDATE_DATABASE_NAME:-}" \
        FAKE_CANDIDATE_DB_ENTRYPOINT_JSON="${FAKE_CANDIDATE_DB_ENTRYPOINT_JSON:-}" \
        FAKE_CANDIDATE_DB_HEALTHCHECK_JSON="${FAKE_CANDIDATE_DB_HEALTHCHECK_JSON:-}" \
        FAKE_CANDIDATE_DB_IMAGE="${FAKE_CANDIDATE_DB_IMAGE:-}" \
        FAKE_CANDIDATE_DDL_AUTO="${FAKE_CANDIDATE_DDL_AUTO:-}" \
        FAKE_CANDIDATE_MYSQL_COMMAND_JSON="${FAKE_CANDIDATE_MYSQL_COMMAND_JSON:-}" \
        FAKE_CANDIDATE_MYSQL_VOLUME_EXTRA="${FAKE_CANDIDATE_MYSQL_VOLUME_EXTRA:-}" \
        FAKE_CANDIDATE_REAL_IP_SOURCE="${FAKE_CANDIDATE_REAL_IP_SOURCE:-}" \
        FAKE_CANDIDATE_REDIS_COMMAND_JSON="${FAKE_CANDIDATE_REDIS_COMMAND_JSON:-}" \
        FAKE_CANDIDATE_REDIS_HEALTHCHECK_JSON="${FAKE_CANDIDATE_REDIS_HEALTHCHECK_JSON:-}" \
        FAKE_CANDIDATE_UPLOAD_SOURCE="${FAKE_CANDIDATE_UPLOAD_SOURCE:-}" \
        FAKE_CANDIDATE_WEB_HEALTHCHECK_JSON="${FAKE_CANDIDATE_WEB_HEALTHCHECK_JSON:-}" \
        FAKE_CANDIDATE_WEB_COMMAND_JSON="${FAKE_CANDIDATE_WEB_COMMAND_JSON:-}" \
        FAKE_CANDIDATE_WEB_ENTRYPOINT_JSON="${FAKE_CANDIDATE_WEB_ENTRYPOINT_JSON:-}" \
        FAKE_CANDIDATE_WEB_RESTART="${FAKE_CANDIDATE_WEB_RESTART:-}" \
        /bin/bash "${test_script}" "$@"
}

run_recovery() {
  /usr/bin/env \
    FAKE_RUNTIME_COMPOSE="${runtime_compose}" \
    FAKE_RUNTIME_REAL_IP="${runtime_real_ip}" \
    FAKE_CONFIG_REVISION="${REVISION_ONE}" \
    FAKE_REVISION_ONE="${REVISION_ONE}" \
    FAKE_REVISION_TWO="${REVISION_TWO}" \
    FAKE_REVISION_THREE="${REVISION_THREE}" \
    /bin/bash "${test_script}" recover
}

bootstrap_candidate="${app_dir}/runtime-config/releases/${CONFIG_DIGEST#sha256:}"
state_file="${app_dir}/runtime-config/state"
current_link="${app_dir}/runtime-config/current"
initialization_marker="${app_dir}/.runtime-config-v2-initialized"
bootstrap_failure_marker="${test_root}/fail-bootstrap-app-up-once"
bootstrap_docker_log="${test_root}/bootstrap-docker.log"
: >"${bootstrap_docker_log}"

# The first v2 update must use the artifact worker without requiring the fixed
# pre-v2 backup fallback to be executable.
/bin/chmod 600 "${backup_script}"
set +e
FAKE_DOCKER_LOG="${bootstrap_docker_log}" \
FAKE_FAIL_APP_UP_ONCE_FILE="${bootstrap_failure_marker}" \
  run_deploy \
    "${REVISION_ONE}" \
    update \
    "${CONFIG_DIGEST}" \
    test-user \
    >/dev/null 2>&1
bootstrap_failure_exit_code="$?"
set -e
if [[ "${bootstrap_failure_exit_code}" -ne 1 ]]; then
  printf 'Interrupted first v2 deployment must fail after rollback\n' >&2
  exit 1
fi
test -f "${bootstrap_failure_marker}"
test -d "${bootstrap_candidate}"
test ! -e "${state_file}"
test ! -e "${current_link}"
test ! -e "${initialization_marker}"
test ! -e "${app_dir}/runtime-config/pending"
/usr/bin/grep -Fxq \
  "API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_TWO}" \
  "${app_dir}/.env"
bootstrap_up_log="${test_root}/bootstrap-up.log"
/usr/bin/grep '^compose .* up ' "${bootstrap_docker_log}" >"${bootstrap_up_log}"
bootstrap_up_count="$(/usr/bin/wc -l <"${bootstrap_up_log}" | /usr/bin/tr -d ' ')"
test "${bootstrap_up_count}" -eq 2
/usr/bin/sed -n '1p' "${bootstrap_up_log}" \
  | /usr/bin/grep -Fq -- \
      "--file ${bootstrap_candidate}/compose.yaml up "
/usr/bin/sed -n '2p' "${bootstrap_up_log}" \
  | /usr/bin/grep -Fq -- \
      "--file ${app_dir}/compose.yaml up "

FAKE_FAIL_APP_UP_ONCE_FILE="${bootstrap_failure_marker}" \
run_deploy \
  "${REVISION_ONE}" \
  update \
  "${CONFIG_DIGEST}" \
  test-user

test -f "${state_file}"
test "$(/bin/cat "${initialization_marker}")" = RUNTIME_CONFIG_V2=initialized
/usr/bin/grep -Fxq "RUNTIME_CONFIG_DIGEST=${CONFIG_DIGEST}" "${state_file}"
/usr/bin/grep -Fxq "RUNTIME_CONFIG_REVISION=${REVISION_ONE}" "${state_file}"
test -L "${current_link}"
test ! -e "${app_dir}/runtime-config/pending"
/usr/bin/tail -n 1 "${backup_log}" \
  | /usr/bin/grep -Fxq \
      "${bootstrap_candidate}/scripts/backup-cubing-hub.sh"
/bin/chmod 700 "${backup_script}"

legacy_v2_scripts="${test_root}/legacy-v2-scripts"
/bin/mv "${bootstrap_candidate}/scripts" "${legacy_v2_scripts}"
legacy_v2_content_sha="$(
  {
    /usr/bin/shasum -a 256 "${bootstrap_candidate}/compose.yaml"
    /usr/bin/shasum -a 256 \
      "${bootstrap_candidate}/nginx/cloudflare-edge-real-ip.conf"
  } | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
)"
/usr/bin/sed \
  -e "s#^RUNTIME_CONFIG_CONTENT_SHA256=.*#RUNTIME_CONFIG_CONTENT_SHA256=${legacy_v2_content_sha}#" \
  "${state_file}" >"${state_file}.legacy-v2"
/bin/mv "${state_file}.legacy-v2" "${state_file}"
run_deploy "${REVISION_ONE}" keep test-user
test "$(/usr/bin/readlink "${current_link}")" \
  = "releases/${CONFIG_DIGEST#sha256:}"
/bin/mv "${legacy_v2_scripts}" "${bootstrap_candidate}/scripts"
restored_v2_content_sha="$(
  {
    /usr/bin/shasum -a 256 "${bootstrap_candidate}/compose.yaml"
    /usr/bin/shasum -a 256 \
      "${bootstrap_candidate}/nginx/cloudflare-edge-real-ip.conf"
    /usr/bin/shasum -a 256 \
      "${bootstrap_candidate}/scripts/backup-cubing-hub.sh"
    /usr/bin/shasum -a 256 \
      "${bootstrap_candidate}/scripts/deploy-cubing-hub.sh"
  } | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
)"
/usr/bin/sed \
  -e "s#^RUNTIME_CONFIG_CONTENT_SHA256=.*#RUNTIME_CONFIG_CONTENT_SHA256=${restored_v2_content_sha}#" \
  "${state_file}" >"${state_file}.restored-v2"
/bin/mv "${state_file}.restored-v2" "${state_file}"

/bin/mv "${state_file}" "${state_file}.both-missing"
/bin/mv "${current_link}" "${current_link}.both-missing"
set +e
run_deploy \
  "${REVISION_TWO}" \
  update \
  "${CONFIG_DIGEST_TWO}" \
  test-user \
  >/dev/null 2>&1
missing_initialized_state_exit_code="$?"
run_deploy "${REVISION_TWO}" test-user >/dev/null 2>&1
legacy_missing_initialized_state_exit_code="$?"
set -e
if [[ "${missing_initialized_state_exit_code}" -ne 1 ]] \
  || [[ "${legacy_missing_initialized_state_exit_code}" -ne 1 ]]
then
  printf 'Initialized runtime config must not fallback after state deletion\n' >&2
  exit 1
fi
/bin/mv "${state_file}.both-missing" "${state_file}"
/bin/mv "${current_link}.both-missing" "${current_link}"

/bin/mv "${state_file}" "${state_file}.missing"
set +e
run_deploy \
  "${REVISION_TWO}" \
  update \
  "${CONFIG_DIGEST_TWO}" \
  test-user \
  >/dev/null 2>&1
missing_state_exit_code="$?"
set -e
if [[ "${missing_state_exit_code}" -ne 1 ]]; then
  printf 'Deployment with a current pointer but missing state must fail\n' >&2
  exit 1
fi
/bin/mv "${state_file}.missing" "${state_file}"

/bin/ln -s missing-pending "${app_dir}/runtime-config/pending"
set +e
run_deploy "${REVISION_TWO}" keep test-user >/dev/null 2>&1
dangling_pending_exit_code="$?"
set -e
if [[ "${dangling_pending_exit_code}" -ne 1 ]]; then
  printf 'Deployment with a dangling pending symlink must require recovery\n' >&2
  exit 1
fi
/bin/rm -f -- "${app_dir}/runtime-config/pending"

/bin/mv "${current_link}" "${current_link}.valid"
/bin/ln -s "releases/missing" "${current_link}"
set +e
run_deploy "${REVISION_TWO}" keep test-user >/dev/null 2>&1
stale_current_exit_code="$?"
set -e
if [[ "${stale_current_exit_code}" -ne 1 ]]; then
  printf 'Deployment with a stale current pointer must fail closed\n' >&2
  exit 1
fi
/bin/rm -f -- "${current_link}"
/bin/mv "${current_link}.valid" "${current_link}"

set +e
run_deploy "${REVISION_TWO}" test-user >/dev/null 2>&1
legacy_after_v2_exit_code="$?"
set -e
if [[ "${legacy_after_v2_exit_code}" -ne 1 ]]; then
  printf 'Legacy Cubing Hub deploy must be disabled after v2 state initialization\n' >&2
  exit 1
fi

/bin/mv "${app_dir}/compose.yaml" "${app_dir}/compose.yaml.legacy"
run_deploy "${REVISION_TWO}" keep test-user
/bin/mv "${app_dir}/compose.yaml.legacy" "${app_dir}/compose.yaml"

/usr/bin/grep -Fxq \
  "API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_TWO}" \
  "${app_dir}/.env"
/usr/bin/grep -Fxq "APPLICATION_REVISION=${REVISION_TWO}" "${state_file}"
/usr/bin/grep -Fxq "RUNTIME_CONFIG_DIGEST=${CONFIG_DIGEST}" "${state_file}"
/usr/bin/grep -Fxq "RUNTIME_CONFIG_REVISION=${REVISION_ONE}" "${state_file}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" \
  = "releases/${CONFIG_DIGEST#sha256:}"
if /usr/bin/find "${app_dir}/runtime-config/releases" -name '.current.*' | /usr/bin/grep -q .; then
  printf 'Atomic current pointer update left an internal temporary symlink\n' >&2
  exit 1
fi

pending_file="${app_dir}/runtime-config/pending"
{
  printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${REVISION_TWO}"
  printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${CONFIG_DIGEST}"
  printf 'TARGET_APPLICATION_REVISION=%s\n' "${REVISION_THREE}"
  printf 'TARGET_RUNTIME_CONFIG_DIGEST=%s\n' "${CONFIG_DIGEST}"
} >"${pending_file}"
/bin/chmod 600 "${pending_file}"
/usr/bin/sed \
  -e "s#^API_IMAGE=.*#API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_THREE}#" \
  -e "s#^WEB_IMAGE=.*#WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:${REVISION_THREE}#" \
  "${app_dir}/.env" >"${app_dir}/.env.interrupted"
/bin/mv "${app_dir}/.env.interrupted" "${app_dir}/.env"

set +e
run_deploy "${REVISION_ONE}" test-user >/dev/null 2>&1
legacy_pending_exit_code="$?"
set -e
if [[ "${legacy_pending_exit_code}" -ne 1 || ! -f "${pending_file}" ]]; then
  printf 'Legacy Cubing Hub deploy must preserve and reject pending transaction\n' >&2
  exit 1
fi

/bin/mv "${state_file}" "${state_file}.real"
/bin/ln -s "$(/usr/bin/basename "${state_file}.real")" "${state_file}"
set +e
run_recovery >/dev/null 2>&1
symlink_state_recovery_exit_code="$?"
set -e
if [[ "${symlink_state_recovery_exit_code}" -ne 1 || ! -f "${pending_file}" ]]; then
  printf 'Recovery with a symlink state must fail and preserve pending\n' >&2
  exit 1
fi
/bin/rm -f -- "${state_file}"
/bin/mv "${state_file}.real" "${state_file}"

/bin/mv "${app_dir}/compose.yaml" "${app_dir}/compose.yaml.legacy"
/bin/rm -f -- "${initialization_marker}" "${current_link}"
run_recovery
/bin/mv "${app_dir}/compose.yaml.legacy" "${app_dir}/compose.yaml"

test "$(/bin/cat "${initialization_marker}")" = RUNTIME_CONFIG_V2=initialized
test "$(/usr/bin/readlink "${current_link}")" \
  = "releases/${CONFIG_DIGEST#sha256:}"
test ! -e "${pending_file}"
/usr/bin/grep -Fxq \
  "API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_TWO}" \
  "${app_dir}/.env"
/usr/bin/grep -Fxq "APPLICATION_REVISION=${REVISION_TWO}" "${state_file}"

{
  printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${REVISION_TWO}"
  printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${CONFIG_DIGEST}"
  printf 'TARGET_APPLICATION_REVISION=%s\n' "${REVISION_TWO}"
  printf 'TARGET_RUNTIME_CONFIG_DIGEST=%s\n' "${CONFIG_DIGEST}"
} >"${pending_file}"
/bin/chmod 600 "${pending_file}"
run_recovery
test ! -e "${pending_file}"

release_one="${app_dir}/runtime-config/releases/${CONFIG_DIGEST#sha256:}"
release_two="${app_dir}/runtime-config/releases/${CONFIG_DIGEST_TWO#sha256:}"
/bin/cp -R "${release_one}" "${release_two}"
original_content_sha="$(/usr/bin/sed -n 's/^RUNTIME_CONFIG_CONTENT_SHA256=//p' "${state_file}")"
target_content_sha="$(
  {
    /usr/bin/shasum -a 256 "${release_two}/compose.yaml"
    /usr/bin/shasum -a 256 \
      "${release_two}/nginx/cloudflare-edge-real-ip.conf"
    /usr/bin/shasum -a 256 \
      "${release_two}/scripts/backup-cubing-hub.sh"
    /usr/bin/shasum -a 256 \
      "${release_two}/scripts/deploy-cubing-hub.sh"
  } | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
)"
{
  printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${REVISION_TWO}"
  printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${CONFIG_DIGEST}"
  printf 'TARGET_APPLICATION_REVISION=%s\n' "${REVISION_THREE}"
  printf 'TARGET_RUNTIME_CONFIG_DIGEST=%s\n' "${CONFIG_DIGEST_TWO}"
} >"${pending_file}"
/usr/bin/sed \
  -e "s#^APPLICATION_REVISION=.*#APPLICATION_REVISION=${REVISION_THREE}#" \
  -e "s#^RUNTIME_CONFIG_DIGEST=.*#RUNTIME_CONFIG_DIGEST=${CONFIG_DIGEST_TWO}#" \
  -e "s#^RUNTIME_CONFIG_CONTENT_SHA256=.*#RUNTIME_CONFIG_CONTENT_SHA256=${target_content_sha}#" \
  "${state_file}" >"${state_file}.target"
/bin/mv "${state_file}.target" "${state_file}"
/usr/bin/sed \
  -e "s#^API_IMAGE=.*#API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_THREE}#" \
  -e "s#^WEB_IMAGE=.*#WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:${REVISION_THREE}#" \
  "${app_dir}/.env" >"${app_dir}/.env.target"
/bin/mv "${app_dir}/.env.target" "${app_dir}/.env"

/bin/cp "${state_file}" "${state_file}.valid"
/usr/bin/sed \
  -e 's#^RUNTIME_CONFIG_REVISION=.*#RUNTIME_CONFIG_REVISION=garbage#' \
  "${state_file}.valid" >"${state_file}"
set +e
run_recovery >/dev/null 2>&1
invalid_state_recovery_exit_code="$?"
set -e
if [[ "${invalid_state_recovery_exit_code}" -ne 1 || ! -f "${pending_file}" ]]; then
  printf 'Recovery with invalid state values must fail and preserve pending\n' >&2
  exit 1
fi
/bin/mv "${state_file}.valid" "${state_file}"

set +e
run_recovery >/dev/null 2>&1
mismatched_predecessor_exit_code="$?"
set -e
if [[ "${mismatched_predecessor_exit_code}" -ne 1 || ! -f "${pending_file}" ]]; then
  printf 'Completed target recovery with a mismatched predecessor must fail\n' >&2
  exit 1
fi
/usr/bin/sed \
  -e "s#^PREVIOUS_APPLICATION_REVISION=.*#PREVIOUS_APPLICATION_REVISION=${REVISION_TWO}#" \
  -e "s#^PREVIOUS_RUNTIME_CONFIG_DIGEST=.*#PREVIOUS_RUNTIME_CONFIG_DIGEST=${CONFIG_DIGEST}#" \
  "${state_file}" >"${state_file}.matched"
/bin/mv "${state_file}.matched" "${state_file}"

/bin/rm -f -- "${initialization_marker}"
test ! -e "${initialization_marker}"
set +e
FAKE_SERVICE_HEALTH=unhealthy run_recovery >/dev/null 2>&1
unhealthy_completed_target_exit_code="$?"
set -e
if [[ "${unhealthy_completed_target_exit_code}" -ne 1 ]] \
  || [[ ! -f "${pending_file}" ]] \
  || [[ -e "${initialization_marker}" ]]
then
  printf 'Completed target recovery must preserve pending while services are unhealthy\n' >&2
  exit 1
fi
run_recovery

test "$(/bin/cat "${initialization_marker}")" = RUNTIME_CONFIG_V2=initialized
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" \
  = "releases/${CONFIG_DIGEST_TWO#sha256:}"
test ! -e "${pending_file}"

/usr/bin/sed \
  -e "s#^APPLICATION_REVISION=.*#APPLICATION_REVISION=${REVISION_TWO}#" \
  -e "s#^RUNTIME_CONFIG_DIGEST=.*#RUNTIME_CONFIG_DIGEST=${CONFIG_DIGEST}#" \
  -e "s#^RUNTIME_CONFIG_CONTENT_SHA256=.*#RUNTIME_CONFIG_CONTENT_SHA256=${original_content_sha}#" \
  "${state_file}" >"${state_file}.restored"
/bin/mv "${state_file}.restored" "${state_file}"
/usr/bin/sed \
  -e "s#^API_IMAGE=.*#API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_TWO}#" \
  -e "s#^WEB_IMAGE=.*#WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:${REVISION_TWO}#" \
  "${app_dir}/.env" >"${app_dir}/.env.restored"
/bin/mv "${app_dir}/.env.restored" "${app_dir}/.env"
/bin/rm -f -- "${app_dir}/runtime-config/current"
/bin/ln -s "releases/${CONFIG_DIGEST#sha256:}" "${app_dir}/runtime-config/current"

printf 'UNKNOWN=value\n' >"${pending_file}"
set +e
run_recovery >/dev/null 2>&1
recovery_exit_code="$?"
set -e
if [[ "${recovery_exit_code}" -ne 1 || ! -f "${pending_file}" ]]; then
  printf 'Invalid pending recovery must fail closed\n' >&2
  exit 1
fi
/bin/rm -f -- "${pending_file}"

set +e
FAKE_SERVICE_HEALTH=unhealthy \
FAKE_CONFIG_REVISION="${REVISION_THREE}" \
  run_deploy \
    "${REVISION_THREE}" \
    update \
    "${CONFIG_DIGEST_TWO}" \
    test-user \
    >/dev/null 2>&1
unhealthy_deployment_exit_code="$?"
set -e
if [[ "${unhealthy_deployment_exit_code}" -ne 1 ]] \
  || [[ ! -f "${pending_file}" ]]
then
  printf 'Deployment must retain pending state when actual services are unhealthy\n' >&2
  exit 1
fi
/usr/bin/grep -Fxq "APPLICATION_REVISION=${REVISION_TWO}" "${state_file}"
/usr/bin/grep -Fxq \
  "API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_TWO}" \
  "${app_dir}/.env"
run_recovery
test ! -e "${pending_file}"

FAKE_CONFIG_REVISION="${REVISION_THREE}" \
FAKE_CANDIDATE_WEB_RESTART=always \
FAKE_CANDIDATE_REDIS_HEALTHCHECK_JSON='{"test":["CMD","redis-cli","ping"],"interval":"30s","timeout":"3s","retries":3}' \
FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT=',"FEATURE_FLAG":"enabled"' \
  run_deploy \
    "${REVISION_THREE}" \
    update \
    "${CONFIG_DIGEST_TWO}" \
    test-user

/usr/bin/grep -Fxq "APPLICATION_REVISION=${REVISION_THREE}" "${state_file}"
/usr/bin/grep -Fxq "RUNTIME_CONFIG_DIGEST=${CONFIG_DIGEST_TWO}" "${state_file}"
test "$(/usr/bin/readlink "${current_link}")" \
  = "releases/${CONFIG_DIGEST_TWO#sha256:}"

verified_state_sha="$(
  /usr/bin/shasum -a 256 "${state_file}" | /usr/bin/awk '{print $1}'
)"
verified_env_sha="$(
  /usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}'
)"
verified_current_target="$(
  /usr/bin/readlink "${current_link}"
)"

expect_artifact_preflight_failure() {
  local label="$1"
  local exit_code

  set +e
  FAKE_CONFIG_REVISION="${FAKE_CONFIG_REVISION:-${REVISION_ONE}}" \
    run_deploy \
      "${REVISION_ONE}" \
      update \
      "${CONFIG_DIGEST_FIVE}" \
      test-user \
      >/dev/null 2>&1
  exit_code="$?"
  set -e

  if [[ "${exit_code}" -ne 1 ]]; then
    printf '%s must fail before the deployment transaction starts\n' "${label}" >&2
    exit 1
  fi
  test ! -e "${pending_file}"
  test "$(/usr/bin/readlink "${current_link}")" = "${verified_current_target}"
  test "$(/usr/bin/shasum -a 256 "${state_file}" | /usr/bin/awk '{print $1}')" \
    = "${verified_state_sha}"
  test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" \
    = "${verified_env_sha}"
}

FAKE_RUNTIME_INVALID_DEPLOY_SYNTAX=true \
  expect_artifact_preflight_failure "invalid candidate deploy syntax"
FAKE_RUNTIME_INSECURE_SCRIPT_MODE=true \
  expect_artifact_preflight_failure "insecure candidate script mode"
FAKE_RUNTIME_EXTRA_FILE=true \
  expect_artifact_preflight_failure "unexpected artifact file"
FAKE_RUNTIME_EXTRA_DIR=true \
  expect_artifact_preflight_failure "unexpected artifact directory"
FAKE_RUNTIME_SYMLINK=true \
  expect_artifact_preflight_failure "artifact symlink"
FAKE_CONFIG_PROJECT=other-project \
  expect_artifact_preflight_failure "runtime artifact project mismatch"
FAKE_CONFIG_REVISION="${REVISION_TWO}" \
  expect_artifact_preflight_failure "runtime artifact revision mismatch"

expect_protected_failure() {
  local label="$1"
  local exit_code

  set +e
  FAKE_CONFIG_REVISION="${REVISION_ONE}" \
    run_deploy \
      "${REVISION_ONE}" \
      update \
      "${CONFIG_DIGEST_THREE}" \
      test-user \
      >/dev/null 2>&1
  exit_code="$?"
  set -e

  if [[ "${exit_code}" -ne 1 ]]; then
    printf '%s must be rejected by the protected runtime boundary\n' "${label}" >&2
    exit 1
  fi
  test ! -e "${pending_file}"
  /usr/bin/grep -Fxq \
    "API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_THREE}" \
    "${app_dir}/.env"
}

FAKE_CANDIDATE_DB_IMAGE=mysql:8.4 \
  expect_protected_failure "data-service image drift"
FAKE_CANDIDATE_DB_ENTRYPOINT_JSON='["sh","-c","rm -rf /var/lib/mysql"]' \
  expect_protected_failure "database entrypoint drift"
FAKE_CANDIDATE_REDIS_COMMAND_JSON='["redis-server","--appendonly","no"]' \
  expect_protected_failure "Redis command drift"
FAKE_CANDIDATE_DATABASE_NAME=cubing_hub_alternate \
  expect_protected_failure "database MYSQL environment drift"
FAKE_CANDIDATE_DDL_AUTO=create-drop \
  expect_protected_failure "data-sensitive API environment drift"
FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT=',"SPRING_PROFILES_INCLUDE":"migration"' \
  expect_protected_failure "Spring profile environment drift"
FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT=',"SPRING_SQL_INIT_MODE":"always"' \
  expect_protected_failure "Spring SQL initialization drift"
for protected_api_environment_name in \
  SPRING_APPLICATION_JSON \
  SPRING_CONFIG_IMPORT \
  JAVA_TOOL_OPTIONS \
  JDK_JAVA_OPTIONS \
  _JAVA_OPTIONS \
  JAVA_OPTS
do
  FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT=",\"${protected_api_environment_name}\":\"override\"" \
    expect_protected_failure "${protected_api_environment_name} drift"
done
FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT=',"DB_USERNAME":"alternate-user"' \
  expect_protected_failure "API database credential identity drift"
FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT=',"REDIS_HOST":"outside.invalid"' \
  expect_protected_failure "API Redis identity drift"
FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT=',"RANKING_REDIS_REBUILD_MODE":"enabled"' \
  expect_protected_failure "ranking Redis mode drift"
FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT=',"POST_IMAGES_PUBLIC_BASE_URL":"https://example.invalid/uploads"' \
  expect_protected_failure "post image identity drift"
FAKE_CANDIDATE_MYSQL_VOLUME_EXTRA=',"driver_opts":{"type":"tmpfs"}' \
  expect_protected_failure "data-volume identity drift"
FAKE_CANDIDATE_UPLOAD_SOURCE=/Users/homeserver/Server/data/cubing-hub/alternate \
  expect_protected_failure "upload bind drift"
FAKE_CANDIDATE_APPLICATION_JSON='{"name":"cubing-hub_application","ipam":{},"internal":false}' \
  expect_protected_failure "application network boundary drift"
FAKE_CANDIDATE_API_PRIVILEGED=true \
  expect_protected_failure "privileged API service"
FAKE_CANDIDATE_API_PORTS_JSON='[{"mode":"ingress","target":8080,"published":"8080","protocol":"tcp"}]' \
  expect_protected_failure "published API host port"
FAKE_CANDIDATE_API_PID_JSON='"host"' \
  expect_protected_failure "host PID namespace"
FAKE_CANDIDATE_API_USER_JSON='"00:1000"' \
  expect_protected_failure "API process user drift"
FAKE_CANDIDATE_API_TMPFS_JSON='["/tmp:size=128m,mode=1777","/app:size=32m"]' \
  expect_protected_failure "API tmpfs target drift"
FAKE_CANDIDATE_API_COMMAND_JSON='["override"]' \
  expect_protected_failure "API command override"
FAKE_CANDIDATE_API_ENTRYPOINT_JSON='["override"]' \
  expect_protected_failure "API entrypoint override"
FAKE_CANDIDATE_WEB_COMMAND_JSON='["override"]' \
  expect_protected_failure "Web command override"
FAKE_CANDIDATE_WEB_ENTRYPOINT_JSON='["override"]' \
  expect_protected_failure "Web entrypoint override"
FAKE_CANDIDATE_API_EXTRA_HOSTS_JSON='["db:203.0.113.10"]' \
  expect_protected_failure "protected service hostname override"
FAKE_CANDIDATE_API_EXTRA_VOLUME=',{"type":"bind","source":"/var/run/docker.sock","target":"/var/run/docker.sock"}' \
  expect_protected_failure "Docker socket bind"
FAKE_CANDIDATE_API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:unexpected \
  expect_protected_failure "API image substitution"
FAKE_CANDIDATE_DB_HEALTHCHECK_JSON='{"test":["CMD","mysqladmin","ping"],"interval":"30s","timeout":"3s","retries":3}' \
  expect_protected_failure "database healthcheck without loopback"
FAKE_CANDIDATE_REDIS_HEALTHCHECK_JSON='{"test":["CMD","true"],"interval":"30s","timeout":"3s","retries":3}' \
  expect_protected_failure "Redis healthcheck without ping"
FAKE_CANDIDATE_WEB_HEALTHCHECK_JSON='{"test":["CMD-SHELL","true # wget --header=Host:api.cubing-hub.com http://127.0.0.1/actuator/health status UP"],"interval":"30s","timeout":"3s","retries":3}' \
  expect_protected_failure "always-success healthcheck probe substitution"
FAKE_CANDIDATE_WEB_HEALTHCHECK_JSON='{"test":["CMD-SHELL","curl -fsS http://localhost/actuator/health | grep -qi status.*UP"],"interval":"30s","timeout":"3s","retries":3}' \
  expect_protected_failure "Web readiness healthcheck without Host"
FAKE_CANDIDATE_API_CONFIGS_JSON='[{"source":"prod-env","target":"/app/prod.env"}]' \
  expect_protected_failure "Compose config host-file bypass"
FAKE_CANDIDATE_API_SECRETS_JSON='[{"source":"prod-secret","target":"/run/secrets/prod"}]' \
  expect_protected_failure "Compose secret host-file bypass"
FAKE_CANDIDATE_API_ENV_FILE_JSON='["/Users/homeserver/Server/apps/cubing-hub/.env"]' \
  expect_protected_failure "Compose env-file host-file bypass"
FAKE_CANDIDATE_REAL_IP_SOURCE=/tmp/stale/cloudflare-edge-real-ip.conf \
  expect_protected_failure "non-candidate Nginx bind"

release_dir="${app_dir}/runtime-config/releases/${CONFIG_DIGEST_TWO#sha256:}"
printf '\n# tampered\n' >>"${release_dir}/compose.yaml"

set +e
run_deploy "${REVISION_ONE}" keep test-user >/dev/null 2>&1
tampered_release_exit_code="$?"
set -e
if [[ "${tampered_release_exit_code}" -ne 1 ]]; then
  printf 'Tampered active runtime config must fail closed\n' >&2
  exit 1
fi
/usr/bin/grep -Fxq \
  "API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${REVISION_THREE}" \
  "${app_dir}/.env"

printf 'Cubing Hub focused deploy v2 tests passed\n'
