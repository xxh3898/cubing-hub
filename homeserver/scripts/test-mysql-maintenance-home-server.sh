#!/bin/bash

set -Eeuo pipefail

readonly PROJECT_ROOT="$(
  CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd
)"
readonly SOURCE_SCRIPT="${PROJECT_ROOT}/homeserver/scripts/mysql-maintenance-home-server.sh"
readonly MOCK_DOCKER="${PROJECT_ROOT}/homeserver/scripts/fixtures/mock-cubing-hub-docker.sh"
readonly MOCK_LOCKF="${PROJECT_ROOT}/homeserver/scripts/fixtures/mock-cubing-hub-lockf.py"
readonly APPLICATION_REVISION=1111111111111111111111111111111111111111
readonly SOURCE_RUNTIME_REVISION=2222222222222222222222222222222222222222
readonly TARGET_RUNTIME_REVISION=3333333333333333333333333333333333333333
readonly SOURCE_RUNTIME_DIGEST=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
readonly TARGET_RUNTIME_DIGEST=sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000
readonly MYSQL_80_DIGEST=8080808080808080808080808080808080808080808080808080808080808080
readonly MYSQL_84_DIGEST=8484848484848484848484848484848484848484848484848484848484848484
readonly MYSQL_80_ID=sha256:8080808080808080808080808080808080808080808080808080808080808080
readonly MYSQL_84_ID=sha256:8484848484848484848484848484848484848484848484848484848484848484
readonly BACKUP_ID=cubing-hub-production-20260813T000000Z
readonly ORIGINAL_VOLUME=cubing-hub_mysql-data
readonly ROLLBACK_VOLUME=cubing-hub_mysql-rollback-20260813

test_tmp_root="${TMPDIR:-/tmp}"
test_tmp_root="${test_tmp_root%/}"
test_root="$(/usr/bin/mktemp -d "${test_tmp_root}/cubing-mysql-maintenance-test.XXXXXX")"

cleanup() {
  if [[ -n "${lock_holder_pid:-}" ]]; then
    /bin/kill "${lock_holder_pid}" >/dev/null 2>&1 || true
    wait "${lock_holder_pid}" 2>/dev/null || true
  fi
  if [[ "$(/usr/bin/basename "${test_root}")" == cubing-mysql-maintenance-test.* ]]; then
    /bin/chmod -R u+w "${test_root}" >/dev/null 2>&1 || true
    /bin/rm -rf -- "${test_root}"
  fi
}

trap cleanup EXIT INT TERM

app_dir="${test_root}/app"
backup_root="${test_root}/backups"
db_state="${test_root}/db-state"
test_script="${test_root}/mysql-maintenance-cubing-hub.sh"
source_release="${app_dir}/runtime-config/releases/${SOURCE_RUNTIME_DIGEST#sha256:}"
target_release="${app_dir}/runtime-config/releases/${TARGET_RUNTIME_DIGEST#sha256:}"
backup_path="${backup_root}/${BACKUP_ID}"
runtime_compose="${test_root}/runtime-compose.yaml"
runtime_real_ip="${test_root}/cloudflare-edge-real-ip.conf"
runtime_deploy_script="${test_root}/runtime-deploy.sh"
runtime_backup_script="${test_root}/runtime-backup.sh"
docker_log="${test_root}/docker.log"
operation_lock="${app_dir}/.cubing-hub-operation.lock"

/bin/mkdir -p \
  "${source_release}/nginx" \
  "${source_release}/scripts" \
  "${backup_path}/database" \
  "${db_state}"
/bin/cp "${PROJECT_ROOT}/homeserver/docker-compose.yml" "${runtime_compose}"
/bin/cp "${runtime_compose}" "${source_release}/compose.yaml"
/bin/cp \
  "${PROJECT_ROOT}/homeserver/nginx/cloudflare-edge-real-ip.conf" \
  "${runtime_real_ip}"
/bin/cp "${runtime_real_ip}" "${source_release}/nginx/cloudflare-edge-real-ip.conf"

printf '%s\n' '#!/bin/bash' 'exit 0' >"${runtime_deploy_script}"
printf '%s\n' '#!/bin/bash' 'exit 0' >"${runtime_backup_script}"
/bin/cp "${runtime_deploy_script}" "${source_release}/scripts/deploy-cubing-hub.sh"
/bin/cp "${runtime_backup_script}" "${source_release}/scripts/backup-cubing-hub.sh"
/bin/chmod 700 \
  "${runtime_deploy_script}" \
  "${runtime_backup_script}" \
  "${source_release}/scripts/deploy-cubing-hub.sh" \
  "${source_release}/scripts/backup-cubing-hub.sh" \
  "${MOCK_DOCKER}" \
  "${MOCK_LOCKF}"

runtime_content_sha256() {
  local release_dir="$1"
  {
    /usr/bin/shasum -a 256 "${release_dir}/compose.yaml"
    /usr/bin/shasum -a 256 "${release_dir}/nginx/cloudflare-edge-real-ip.conf"
    /usr/bin/shasum -a 256 "${release_dir}/scripts/backup-cubing-hub.sh"
    /usr/bin/shasum -a 256 "${release_dir}/scripts/deploy-cubing-hub.sh"
  } | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
}

source_content_sha="$(runtime_content_sha256 "${source_release}")"
{
  printf 'APPLICATION_REVISION=%s\n' "${APPLICATION_REVISION}"
  printf 'RUNTIME_CONFIG_DIGEST=%s\n' "${SOURCE_RUNTIME_DIGEST}"
  printf 'RUNTIME_CONFIG_REVISION=%s\n' "${SOURCE_RUNTIME_REVISION}"
  printf 'RUNTIME_CONFIG_CONTENT_SHA256=%s\n' "${source_content_sha}"
  printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${APPLICATION_REVISION}"
  printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${ZERO_DIGEST}"
} >"${app_dir}/runtime-config/state"
/bin/chmod 600 "${app_dir}/runtime-config/state"
/bin/ln -s \
  "releases/${SOURCE_RUNTIME_DIGEST#sha256:}" \
  "${app_dir}/runtime-config/current"
printf 'RUNTIME_CONFIG_V2=initialized\n' >"${app_dir}/.runtime-config-v2-initialized"
/bin/chmod 400 "${app_dir}/.runtime-config-v2-initialized"
{
  printf 'API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:%s\n' "${APPLICATION_REVISION}"
  printf 'WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:%s\n' "${APPLICATION_REVISION}"
} >"${app_dir}/.env"
/bin/chmod 600 "${app_dir}/.env"

printf 'fixture dump\n' >"${backup_path}/database/dump"
dump_sha="$(/usr/bin/shasum -a 256 "${backup_path}/database/dump" | /usr/bin/awk '{print $1}')"
dump_bytes="$(
  /usr/bin/python3 -c \
    'import os, sys; print(os.path.getsize(sys.argv[1]))' \
    "${backup_path}/database/dump"
)"
"${PYTHON_BIN:-/usr/bin/python3}" - \
  "${backup_path}/manifest.json" \
  "${dump_sha}" \
  "${dump_bytes}" <<'PY'
import json
import pathlib
import sys

path, digest, size = sys.argv[1:]
manifest = {
    "schemaVersion": 1,
    "status": "success",
    "project": "cubing-hub",
    "environment": "production",
    "database": {
        "engine": "mysql",
        "version": "8.0.46",
        "dumpFile": "database/dump",
        "bytes": int(size),
        "sha256": digest,
        "recordCounts": {"post_attachments": 0, "users": 1},
        "recordCountsSource": "database/dump",
    },
}
pathlib.Path(path).write_text(json.dumps(manifest) + "\n", encoding="utf-8")
PY
printf 'snapshot complete\n' >"${backup_path}/SUCCESS"

printf '%s\n' \
  "${MYSQL_80_ID}" >"${db_state}/image-id"
printf '%s\n' \
  "mysql:8.0.46@sha256:${MYSQL_80_DIGEST}" >"${db_state}/image-ref"
printf '%s\n' "${ORIGINAL_VOLUME}" >"${db_state}/volume"
printf 'healthy\n' >"${db_state}/health"
printf 'true\n' >"${db_state}/running"
: >"${docker_log}"

/usr/bin/sed \
  -e "s#readonly DOCKER_BIN=/usr/local/bin/docker#readonly DOCKER_BIN=${MOCK_DOCKER}#" \
  -e "s#readonly LOCKF_BIN=/usr/bin/lockf#readonly LOCKF_BIN=${MOCK_LOCKF}#" \
  -e "s#readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub#readonly APP_DIR=${app_dir}#" \
  -e "s#readonly BACKUP_ROOT=/Users/homeserver/Server/backups/cubing-hub/data#readonly BACKUP_ROOT=${backup_root}#" \
  "${SOURCE_SCRIPT}" >"${test_script}"
/bin/chmod 700 "${test_script}"

run_maintenance() {
  /usr/bin/env \
    FAKE_RUNTIME_COMPOSE="${runtime_compose}" \
    FAKE_RUNTIME_REAL_IP="${runtime_real_ip}" \
    FAKE_RUNTIME_BACKUP_SCRIPT="${runtime_backup_script}" \
    FAKE_RUNTIME_DEPLOY_SCRIPT="${runtime_deploy_script}" \
    FAKE_CONFIG_REVISION="${TARGET_RUNTIME_REVISION}" \
    FAKE_CONFIG_PROJECT=cubing-hub \
    FAKE_RENDER_DB_IMAGE=mysql:8.0.46 \
    FAKE_DB_STATE_DIR="${db_state}" \
    FAKE_DOCKER_LOG="${docker_log}" \
    FAKE_MYSQL_80_IMAGE_ID="${FAKE_MYSQL_80_IMAGE_ID:-${MYSQL_80_ID}}" \
    FAKE_MYSQL_84_IMAGE_ID="${FAKE_MYSQL_84_IMAGE_ID:-${MYSQL_84_ID}}" \
    FAKE_MYSQL_80_REPO_DIGEST="${MYSQL_80_DIGEST}" \
    FAKE_MYSQL_84_REPO_DIGEST="${MYSQL_84_DIGEST}" \
    FAKE_RESTORE_CONTAINER=mock-restore-db \
    FAKE_RESTORE_VOLUME="${FAKE_RESTORE_VOLUME:-${ROLLBACK_VOLUME}}" \
    FAKE_RESTORE_BACKUP_ID="${FAKE_RESTORE_BACKUP_ID:-${BACKUP_ID}}" \
    FAKE_RESTORE_IMAGE_ID="${FAKE_RESTORE_IMAGE_ID:-${MYSQL_80_ID}}" \
    FAKE_RESTORE_HEALTH="${FAKE_RESTORE_HEALTH:-healthy}" \
    FAKE_RESTORE_VERSION="${FAKE_RESTORE_VERSION:-8.0.46}" \
    FAKE_RESTORE_TABLES="${FAKE_RESTORE_TABLES:-post_attachments
users}" \
    FAKE_RESTORE_POST_ATTACHMENTS_COUNT="${FAKE_RESTORE_POST_ATTACHMENTS_COUNT:-0}" \
    FAKE_RESTORE_USERS_COUNT="${FAKE_RESTORE_USERS_COUNT:-1}" \
    FAKE_MISSING_VOLUME="${FAKE_MISSING_VOLUME:-}" \
    FAKE_VOLUME_DRIVER="${FAKE_VOLUME_DRIVER:-local}" \
    FAKE_VOLUME_BACKUP_ID="${FAKE_VOLUME_BACKUP_ID:-${BACKUP_ID}}" \
    FAKE_VOLUME_ATTACHED_CONTAINER="${FAKE_VOLUME_ATTACHED_CONTAINER:-}" \
    FAKE_MAINTENANCE_CANDIDATE_API_IMAGE="${FAKE_MAINTENANCE_CANDIDATE_API_IMAGE:-}" \
    FAKE_MAINTENANCE_DB_UP_FAIL="${FAKE_MAINTENANCE_DB_UP_FAIL:-false}" \
    FAKE_SERVICE_HEALTH="${FAKE_SERVICE_HEALTH:-healthy}" \
    /bin/bash "${test_script}" "$@"
}

expect_failure() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf '%s must fail closed\n' "${label}" >&2
    exit 1
  fi
}

# Candidate creation must not change current runtime state or binding.
state_before="$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')"
current_before="$(/usr/bin/readlink "${app_dir}/runtime-config/current")"
env_before="$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')"
upgrade_candidate="$(
  printf 'test-token' | run_maintenance prepare-upgrade \
    "${TARGET_RUNTIME_DIGEST}" \
    "${TARGET_RUNTIME_REVISION}" \
    "mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" \
    "${BACKUP_ID}" \
    test-user
)"
[[ "${upgrade_candidate}" =~ ^[0-9a-f]{64}$ ]]
upgrade_file="${app_dir}/runtime-config/mysql-maintenance/candidates/${upgrade_candidate}/candidate.env"
test -f "${upgrade_file}"
/usr/bin/python3 - \
  "$(/usr/bin/dirname "${upgrade_file}")" \
  "${upgrade_file}" <<'PY'
import os
import stat
import sys

assert stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == 0o500
assert stat.S_IMODE(os.stat(sys.argv[2]).st_mode) == 0o400
PY
/usr/bin/grep -Fxq "API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:${APPLICATION_REVISION}" "${upgrade_file}"
/usr/bin/grep -Fxq "WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:${APPLICATION_REVISION}" "${upgrade_file}"
/usr/bin/grep -Fxq "TARGET_DB_IMAGE=mysql:8.4.11" "${upgrade_file}"
/usr/bin/grep -Fxq "TARGET_DB_VOLUME=${ORIGINAL_VOLUME}" "${upgrade_file}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = "${state_before}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = "${env_before}"

# Missing candidate, image drift, pending state, API drift, volume failure, and
# backup tampering must stop before a destructive transition.
expect_failure "missing candidate" \
  run_maintenance apply \
    cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc \
    WRITE_STOP_CONFIRMED
/bin/chmod 600 "${upgrade_file}"
expect_failure "mutable candidate file" \
  run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
/bin/chmod 400 "${upgrade_file}"
FAKE_MYSQL_84_IMAGE_ID=sha256:9999999999999999999999999999999999999999999999999999999999999999 \
  expect_failure "target image digest mismatch" \
    run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
FAKE_MISSING_VOLUME="${ORIGINAL_VOLUME}" \
  expect_failure "missing target volume" \
    run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
FAKE_VOLUME_DRIVER=nfs \
  expect_failure "unexpected target volume driver" \
    run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED

/bin/mv "${target_release}" "${target_release}.hold"
expect_failure "missing immutable candidate release" \
  run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
/bin/mv "${target_release}.hold" "${target_release}"

/bin/unlink "${app_dir}/runtime-config/current"
/bin/ln -s \
  "releases/${TARGET_RUNTIME_DIGEST#sha256:}" \
  "${app_dir}/runtime-config/current"
expect_failure "runtime state and current pointer mismatch" \
  run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
/bin/unlink "${app_dir}/runtime-config/current"
/bin/ln -s "${current_before}" "${app_dir}/runtime-config/current"

printf 'foreign transaction\n' >"${app_dir}/runtime-config/pending"
expect_failure "pending runtime transaction" \
  run_maintenance prepare-upgrade \
    "${TARGET_RUNTIME_DIGEST}" \
    "${TARGET_RUNTIME_REVISION}" \
    "mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" \
    "${BACKUP_ID}" \
    test-user
/bin/rm -f -- "${app_dir}/runtime-config/pending"

FAKE_MAINTENANCE_CANDIDATE_API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:9999999999999999999999999999999999999999 \
  expect_failure "DB-only candidate API drift" \
    run_maintenance prepare-upgrade \
      "${TARGET_RUNTIME_DIGEST}" \
      "${TARGET_RUNTIME_REVISION}" \
      "mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" \
      "${BACKUP_ID}" \
      test-user

/bin/mv "${backup_path}/SUCCESS" "${backup_path}/SUCCESS.hold"
expect_failure "missing backup evidence" \
  run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
/bin/mv "${backup_path}/SUCCESS.hold" "${backup_path}/SUCCESS"

# The maintenance command shares the canonical operation lock.
lock_ready="${test_root}/lock-ready"
/usr/bin/python3 - "${operation_lock}" "${lock_ready}" <<'PY' &
import fcntl
import pathlib
import sys
import time

lock_path, ready_path = sys.argv[1:]
with open(lock_path, "a", encoding="utf-8") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    pathlib.Path(ready_path).write_text("ready\n", encoding="utf-8")
    time.sleep(30)
PY
lock_holder_pid="$!"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  [[ -f "${lock_ready}" ]] && break
  /bin/sleep 0.1
done
test -f "${lock_ready}"
expect_failure "operation lock conflict" \
  run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
/bin/kill "${lock_holder_pid}"
wait "${lock_holder_pid}" 2>/dev/null || true
lock_holder_pid=

# A target startup failure keeps the canonical pending transaction and all
# state evidence. Recovery finalizes only after the target is actually healthy.
FAKE_MAINTENANCE_DB_UP_FAIL=true \
  expect_failure "MySQL 8.4 startup failure" \
    run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
test -f "${app_dir}/runtime-config/pending"
/usr/bin/grep -Fxq 'TRANSACTION_TYPE=MYSQL_MAINTENANCE' \
  "${app_dir}/runtime-config/pending"
/bin/cp \
  "${app_dir}/runtime-config/pending" \
  "${test_root}/failed-upgrade-pending.fixture"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = "${state_before}"

printf '%s\n' "${MYSQL_84_ID}" >"${db_state}/image-id"
printf '%s\n' "mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" >"${db_state}/image-ref"
printf '%s\n' "${ORIGINAL_VOLUME}" >"${db_state}/volume"
printf 'healthy\n' >"${db_state}/health"
printf 'true\n' >"${db_state}/running"
# Simulate interruption after the target state file was replaced but before the
# current pointer was updated. Dedicated recovery must finalize this safe
# partial state instead of falling back to normal deploy recovery.
target_content_sha="$(runtime_content_sha256 "${target_release}")"
{
  printf 'APPLICATION_REVISION=%s\n' "${APPLICATION_REVISION}"
  printf 'RUNTIME_CONFIG_DIGEST=%s\n' "${TARGET_RUNTIME_DIGEST}"
  printf 'RUNTIME_CONFIG_REVISION=%s\n' "${TARGET_RUNTIME_REVISION}"
  printf 'RUNTIME_CONFIG_CONTENT_SHA256=%s\n' "${target_content_sha}"
  printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${APPLICATION_REVISION}"
  printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${SOURCE_RUNTIME_DIGEST}"
} >"${app_dir}/runtime-config/state"
/bin/chmod 600 "${app_dir}/runtime-config/state"
FAKE_SERVICE_HEALTH=unhealthy \
  expect_failure "unhealthy target recovery" run_maintenance recover
test -f "${app_dir}/runtime-config/pending"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
run_maintenance recover
test ! -e "${app_dir}/runtime-config/pending"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = \
  "releases/${TARGET_RUNTIME_DIGEST#sha256:}"
/usr/bin/grep -Fxq "DB_IMAGE=mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" "${app_dir}/.env"
/usr/bin/grep -Fxq "DB_VOLUME_NAME=${ORIGINAL_VOLUME}" "${app_dir}/.env"
/usr/bin/grep -Fxq \
  "PREVIOUS_RUNTIME_CONFIG_DIGEST=${TARGET_RUNTIME_DIGEST}" \
  "${app_dir}/runtime-config/state"

# Rollback volume verification binds the backup, 8.0 image, row parity, and a
# fresh volume before it can become a candidate.
expect_failure "rollback volume equals upgraded original" \
  run_maintenance verify-rollback-volume \
    "${upgrade_candidate}" "${ORIGINAL_VOLUME}" mock-restore-db
run_maintenance verify-rollback-volume \
  "${upgrade_candidate}" "${ROLLBACK_VOLUME}" mock-restore-db
restore_evidence="${app_dir}/runtime-config/mysql-maintenance/restores/${ROLLBACK_VOLUME}.state"
test -f "${restore_evidence}"
/usr/bin/grep -Fxq "DB_VOLUME=${ROLLBACK_VOLUME}" "${restore_evidence}"

FAKE_VOLUME_BACKUP_ID=cubing-hub-production-20260812T000000Z \
  expect_failure "rollback volume backup label drift" \
    run_maintenance prepare-rollback "${upgrade_candidate}" "${ROLLBACK_VOLUME}"

maintenance_state="${app_dir}/runtime-config/mysql-maintenance/state"
/bin/cp "${maintenance_state}" "${maintenance_state}.hold"
/usr/bin/sed \
  's/^CANDIDATE_ID=.*/CANDIDATE_ID=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc/' \
  "${maintenance_state}.hold" >"${maintenance_state}"
/bin/chmod 600 "${maintenance_state}"
expect_failure "completed upgrade maintenance state mismatch" \
  run_maintenance prepare-rollback "${upgrade_candidate}" "${ROLLBACK_VOLUME}"
/bin/mv -f -- "${maintenance_state}.hold" "${maintenance_state}"

rollback_candidate="$(
  run_maintenance prepare-rollback "${upgrade_candidate}" "${ROLLBACK_VOLUME}"
)"
[[ "${rollback_candidate}" =~ ^[0-9a-f]{64}$ ]]
rollback_file="${app_dir}/runtime-config/mysql-maintenance/candidates/${rollback_candidate}/candidate.env"
/usr/bin/grep -Fxq 'OPERATION=ROLLBACK' "${rollback_file}"
/usr/bin/grep -Fxq 'TARGET_DB_IMAGE=mysql:8.0.46' "${rollback_file}"
/usr/bin/grep -Fxq "SOURCE_DB_VOLUME=${ORIGINAL_VOLUME}" "${rollback_file}"
/usr/bin/grep -Fxq "TARGET_DB_VOLUME=${ROLLBACK_VOLUME}" "${rollback_file}"

FAKE_VOLUME_ATTACHED_CONTAINER=unexpected-container \
  expect_failure "rollback volume still attached" \
    run_maintenance apply "${rollback_candidate}" WRITE_STOP_CONFIRMED
/bin/cp \
  "${test_root}/failed-upgrade-pending.fixture" \
  "${app_dir}/runtime-config/pending"
/bin/chmod 600 "${app_dir}/runtime-config/pending"
/bin/unlink "${app_dir}/runtime-config/current"
/bin/ln -s \
  "releases/${SOURCE_RUNTIME_DIGEST#sha256:}" \
  "${app_dir}/runtime-config/current"
run_maintenance apply "${rollback_candidate}" WRITE_STOP_CONFIRMED
test ! -e "${app_dir}/runtime-config/pending"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = \
  "releases/${TARGET_RUNTIME_DIGEST#sha256:}"
/usr/bin/grep -Fxq "DB_IMAGE=mysql:8.0.46@sha256:${MYSQL_80_DIGEST}" "${app_dir}/.env"
/usr/bin/grep -Fxq "DB_VOLUME_NAME=${ROLLBACK_VOLUME}" "${app_dir}/.env"
test "$(/bin/cat "${db_state}/volume")" = "${ROLLBACK_VOLUME}"
test "$(/bin/cat "${db_state}/image-id")" = "${MYSQL_80_ID}"
/usr/bin/grep -Fxq 'OPERATION=ROLLBACK' \
  "${app_dir}/runtime-config/mysql-maintenance/state"

# The immutable original volume name remains in the upgrade candidate and is
# never used by the rollback target.
/usr/bin/grep -Fxq "SOURCE_DB_VOLUME=${ORIGINAL_VOLUME}" "${upgrade_file}"
/usr/bin/grep -Fxq "TARGET_DB_VOLUME=${ORIGINAL_VOLUME}" "${upgrade_file}"
/usr/bin/grep -Fxq "TARGET_DB_VOLUME=${ROLLBACK_VOLUME}" "${rollback_file}"

# A later maintenance cycle treats the verified rollback binding as the new
# normal 8.0 source and never falls back to the old original volume.
next_upgrade_candidate="$(
  printf 'test-token' | run_maintenance prepare-upgrade \
    "${TARGET_RUNTIME_DIGEST}" \
    "${TARGET_RUNTIME_REVISION}" \
    "mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" \
    "${BACKUP_ID}" \
    test-user
)"
next_upgrade_file="${app_dir}/runtime-config/mysql-maintenance/candidates/${next_upgrade_candidate}/candidate.env"
/usr/bin/grep -Fxq "SOURCE_DB_VOLUME=${ROLLBACK_VOLUME}" "${next_upgrade_file}"
/usr/bin/grep -Fxq "TARGET_DB_VOLUME=${ROLLBACK_VOLUME}" "${next_upgrade_file}"

printf 'Cubing Hub MySQL maintenance transition tests passed\n'
