#!/bin/bash

set -Eeuo pipefail

readonly PROJECT_ROOT="$(
  CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd
)"
readonly WRAPPER_SOURCE="${PROJECT_ROOT}/homeserver/scripts/deploy-home-server-ci.sh"
readonly VERIFIER="${PROJECT_ROOT}/homeserver/scripts/verify-runtime-baseline-inspection.sh"
readonly MOCK_DOCKER="${PROJECT_ROOT}/homeserver/scripts/fixtures/mock-cubing-hub-docker.sh"
readonly MOCK_LOCKF="${PROJECT_ROOT}/homeserver/scripts/fixtures/mock-cubing-hub-lockf.py"
readonly APPLICATION_REVISION=1111111111111111111111111111111111111111
readonly OTHER_APPLICATION_REVISION=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
readonly RUNTIME_REVISION=2222222222222222222222222222222222222222
readonly OTHER_RUNTIME_REVISION=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
readonly RUNTIME_DIGEST=sha256:3333333333333333333333333333333333333333333333333333333333333333
readonly OTHER_RUNTIME_DIGEST=sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
readonly DB_IMAGE=mysql:8.4.11@sha256:8484848484848484848484848484848484848484848484848484848484848484
readonly DB_VOLUME=cubing-hub_mysql-data

test_root="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-runtime-inspection-test.XXXXXX")"

cleanup() {
  if [[ -n "${lock_holder_pid:-}" ]]; then
    /bin/kill "${lock_holder_pid}" >/dev/null 2>&1 || true
    wait "${lock_holder_pid}" >/dev/null 2>&1 || true
  fi
  if [[ "$(/usr/bin/basename "${test_root}")" == cubing-runtime-inspection-test.* ]]; then
    /bin/rm -rf -- "${test_root}"
  fi
}

trap cleanup EXIT INT TERM

app_dir="${test_root}/app"
release_dir="${app_dir}/runtime-config/releases/${RUNTIME_DIGEST#sha256:}"
wrapper="${test_root}/deploy-cubing-hub-ci.sh"
legacy_worker="${test_root}/legacy-deploy.sh"
operation_lock="${app_dir}/.cubing-hub-operation.lock"

/bin/mkdir -p "${release_dir}/nginx" "${release_dir}/scripts"
printf 'name: cubing-hub\nservices: {}\n' >"${release_dir}/compose.yaml"
printf 'set_real_ip_from 192.0.2.0/24;\n' \
  >"${release_dir}/nginx/cloudflare-edge-real-ip.conf"
printf '#!/bin/bash\nset -Eeuo pipefail\n' \
  >"${release_dir}/scripts/deploy-cubing-hub.sh"
printf '#!/bin/bash\nset -Eeuo pipefail\n' \
  >"${release_dir}/scripts/backup-cubing-hub.sh"
/bin/chmod 700 \
  "${release_dir}/scripts/deploy-cubing-hub.sh" \
  "${release_dir}/scripts/backup-cubing-hub.sh"

content_sha="$({
  /usr/bin/shasum -a 256 "${release_dir}/compose.yaml"
  /usr/bin/shasum -a 256 \
    "${release_dir}/nginx/cloudflare-edge-real-ip.conf"
  /usr/bin/shasum -a 256 \
    "${release_dir}/scripts/backup-cubing-hub.sh"
  /usr/bin/shasum -a 256 \
    "${release_dir}/scripts/deploy-cubing-hub.sh"
} | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}')"

{
  printf 'APPLICATION_REVISION=%s\n' "${APPLICATION_REVISION}"
  printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${APPLICATION_REVISION}"
  printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${RUNTIME_DIGEST}"
  printf 'RUNTIME_CONFIG_CONTENT_SHA256=%s\n' "${content_sha}"
  printf 'RUNTIME_CONFIG_DIGEST=%s\n' "${RUNTIME_DIGEST}"
  printf 'RUNTIME_CONFIG_REVISION=%s\n' "${RUNTIME_REVISION}"
} >"${app_dir}/runtime-config/state"
/bin/chmod 600 "${app_dir}/runtime-config/state"
/bin/ln -s \
  "releases/${RUNTIME_DIGEST#sha256:}" \
  "${app_dir}/runtime-config/current"
printf 'RUNTIME_CONFIG_V2=initialized\n' \
  >"${app_dir}/.runtime-config-v2-initialized"
/bin/chmod 400 "${app_dir}/.runtime-config-v2-initialized"
{
  printf 'API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:%s\n' "${APPLICATION_REVISION}"
  printf 'WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:%s\n' "${APPLICATION_REVISION}"
  printf 'DB_IMAGE=%s\n' "${DB_IMAGE}"
  printf 'DB_VOLUME_NAME=%s\n' "${DB_VOLUME}"
  printf 'DB_NAME=cubing_hub\n'
  printf 'DB_USERNAME=cubing_hub\n'
  printf 'DB_PASSWORD=fixture-secret\n'
  printf 'MYSQL_ROOT_PASSWORD=fixture-root-secret\n'
  printf 'JWT_SECRET=fixture-jwt-secret\n'
  printf 'POST_IMAGES_HOST_DIR=%s/post-images\n' "${test_root}"
} >"${app_dir}/.env"
/bin/chmod 600 "${app_dir}/.env"
: >"${operation_lock}"
/bin/chmod 600 "${operation_lock}"
printf '#!/bin/bash\nexit 0\n' >"${legacy_worker}"
/bin/chmod 700 "${legacy_worker}" "${MOCK_DOCKER}" "${MOCK_LOCKF}"

/usr/bin/sed \
  -e "s#readonly DOCKER_BIN=/usr/local/bin/docker#readonly DOCKER_BIN=${MOCK_DOCKER}#" \
  -e "s#readonly LOCKF_BIN=/usr/bin/lockf#readonly LOCKF_BIN=${MOCK_LOCKF}#" \
  -e "s#readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub#readonly APP_DIR=${app_dir}#" \
  -e "s#readonly LEGACY_DEPLOY_SCRIPT=/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub.sh#readonly LEGACY_DEPLOY_SCRIPT=${legacy_worker}#" \
  "${WRAPPER_SOURCE}" >"${wrapper}"
/bin/chmod 700 "${wrapper}"

inspect_command() {
  local application_revision="${1:-${APPLICATION_REVISION}}"
  local runtime_revision="${2:-${RUNTIME_REVISION}}"
  local runtime_digest="${3:-${RUNTIME_DIGEST}}"
  local db_image="${4:-${DB_IMAGE}}"
  local db_volume="${5:-${DB_VOLUME}}"
  local mysql_version="${6:-8.4.11}"

  /usr/bin/env \
    SSH_ORIGINAL_COMMAND="inspect-cubing-hub-runtime ${application_revision} ${runtime_revision} ${runtime_digest} ${db_image} ${db_volume} ${mysql_version}" \
    FAKE_RUNNING_DB_VERSION_OVERRIDE="${FAKE_RUNNING_DB_VERSION_OVERRIDE:-8.4.11}" \
    FAKE_ACTUAL_DB_VOLUME="${FAKE_ACTUAL_DB_VOLUME:-${DB_VOLUME}}" \
    FAKE_REVISION_ONE="${FAKE_APPLICATION_IMAGE_REVISION_OVERRIDE:-${APPLICATION_REVISION}}" \
    FAKE_SERVICE_HEALTH="${FAKE_SERVICE_HEALTH:-healthy}" \
    FAKE_API_HEALTH="${FAKE_API_HEALTH:-}" \
    /bin/bash "${wrapper}"
}

state_sha_before="$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')"
env_sha_before="$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')"
current_before="$(/usr/bin/readlink "${app_dir}/runtime-config/current")"
inspection="$(inspect_command)"
printf '%s\n' "${inspection}" | /bin/bash "${VERIFIER}" \
  "${APPLICATION_REVISION}" \
  "${RUNTIME_REVISION}" \
  "${RUNTIME_DIGEST}" \
  "${DB_IMAGE}" \
  "${DB_VOLUME}" \
  8.4.11 \
  >/dev/null
/usr/bin/grep -Fxq "APPLICATION_REVISION=${APPLICATION_REVISION}" <<<"${inspection}"
/usr/bin/grep -Fxq "RUNTIME_CONFIG_REVISION=${RUNTIME_REVISION}" <<<"${inspection}"
test "${APPLICATION_REVISION}" != "${RUNTIME_REVISION}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = "${state_sha_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = "${env_sha_before}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"

expect_inspection_failure() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf '%s must fail closed\n' "${label}" >&2
    exit 1
  fi
  test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = "${state_sha_before}"
  test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = "${env_sha_before}"
  test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
}

expect_inspection_failure application-revision-mismatch \
  inspect_command "${OTHER_APPLICATION_REVISION}"
expect_inspection_failure runtime-revision-mismatch \
  inspect_command "${APPLICATION_REVISION}" "${OTHER_RUNTIME_REVISION}"
expect_inspection_failure runtime-digest-mismatch \
  inspect_command "${APPLICATION_REVISION}" "${RUNTIME_REVISION}" "${OTHER_RUNTIME_DIGEST}"
FAKE_RUNNING_DB_VERSION_OVERRIDE=8.4.10 \
  expect_inspection_failure mysql-version-mismatch inspect_command
FAKE_ACTUAL_DB_VOLUME=cubing-hub_mysql-other \
  expect_inspection_failure db-volume-mismatch inspect_command
FAKE_ACTUAL_DB_IMAGE_ID=sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd \
  expect_inspection_failure db-image-mismatch inspect_command
FAKE_APPLICATION_IMAGE_REVISION_OVERRIDE="${OTHER_APPLICATION_REVISION}" \
  expect_inspection_failure application-image-label-mismatch inspect_command
FAKE_SERVICE_HEALTH=unhealthy \
  expect_inspection_failure service-health-mismatch inspect_command
FAKE_API_HEALTH=unhealthy \
  expect_inspection_failure api-health-mismatch inspect_command

lock_ready="${test_root}/operation-lock-held"
/usr/bin/python3 - "${operation_lock}" "${lock_ready}" <<'PY' &
import fcntl
import pathlib
import sys
import time

with open(sys.argv[1], "r+") as lock_file:
    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
    pathlib.Path(sys.argv[2]).write_text("ready\n", encoding="utf-8")
    time.sleep(30)
PY
lock_holder_pid="$!"
/bin/sleep 1
test -f "${lock_ready}"
expect_inspection_failure operation-lock-collision inspect_command
/bin/kill "${lock_holder_pid}"
wait "${lock_holder_pid}" >/dev/null 2>&1 || true
lock_holder_pid=

printf 'TRANSACTION_TYPE=MYSQL_MAINTENANCE\n' \
  >"${app_dir}/runtime-config/pending"
/bin/chmod 600 "${app_dir}/runtime-config/pending"
expect_inspection_failure pending-runtime-transaction inspect_command
/bin/rm -f -- "${app_dir}/runtime-config/pending"

if printf '%s\nEXTRA=value\n' "${inspection}" \
  | /bin/bash "${VERIFIER}" \
      "${APPLICATION_REVISION}" \
      "${RUNTIME_REVISION}" \
      "${RUNTIME_DIGEST}" \
      "${DB_IMAGE}" \
      "${DB_VOLUME}" \
      8.4.11 \
      >/dev/null 2>&1
then
  printf 'Inspection output with an unexpected key must fail closed\n' >&2
  exit 1
fi

if SSH_ORIGINAL_COMMAND="inspect-cubing-hub-runtime ${APPLICATION_REVISION} ${RUNTIME_REVISION}; touch ${test_root}/injected" \
  /bin/bash "${wrapper}" >/dev/null 2>&1
then
  printf 'Inspection command injection must fail closed\n' >&2
  exit 1
fi
test ! -e "${test_root}/injected"

printf 'Cubing Hub runtime baseline inspection tests passed\n'
