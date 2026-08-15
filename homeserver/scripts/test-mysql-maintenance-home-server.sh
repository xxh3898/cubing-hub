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
readonly APPLICATION_IMAGE_ID=sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
readonly BACKUP_ID=cubing-hub-production-20260813T000000Z
readonly NEXT_BACKUP_ID=cubing-hub-production-20260813T010000Z
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
service_state="${test_root}/service-state"
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
  "${db_state}" \
  "${service_state}"
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
  printf 'DB_IMAGE=mysql:8.0.46@sha256:%s\n' "${MYSQL_80_DIGEST}"
  printf 'DB_VOLUME_NAME=%s\n' "${ORIGINAL_VOLUME}"
  printf 'DB_NAME=cubing_hub\n'
  printf 'MYSQL_ROOT_PASSWORD=fixture-root-password\n'
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
  "${dump_bytes}" \
  "${APPLICATION_REVISION}" \
  "${SOURCE_RUNTIME_DIGEST}" \
  "mysql:8.0.46@sha256:${MYSQL_80_DIGEST}" \
  "${MYSQL_80_ID}" \
  "${ORIGINAL_VOLUME}" <<'PY'
import json
import pathlib
import sys

(
    path,
    digest,
    size,
    application_revision,
    runtime_digest,
    database_image,
    database_image_id,
    database_volume,
) = sys.argv[1:]
manifest = {
    "schemaVersion": 1,
    "status": "success",
    "project": "cubing-hub",
    "environment": "production",
    "startedAt": "2026-08-13T00:00:00Z",
    "completedAt": "2026-08-13T00:00:01Z",
    "source": {
        "applicationSha": application_revision,
        "runtimeConfigDigest": runtime_digest,
    },
    "database": {
        "engine": "mysql",
        "version": "8.0.46",
        "image": database_image,
        "imageId": database_image_id,
        "volume": database_volume,
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
for service in db redis api web; do
  printf 'running\n' >"${service_state}/${service}"
done
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
    FAKE_SERVICE_STATE_DIR="${service_state}" \
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
    FAKE_MAINTENANCE_DB_UP_FAIL_AFTER_BIND="${FAKE_MAINTENANCE_DB_UP_FAIL_AFTER_BIND:-false}" \
    FAKE_RUNNING_DB_VERSION_OVERRIDE="${FAKE_RUNNING_DB_VERSION_OVERRIDE:-}" \
    FAKE_RUNNING_DB_VERSION_QUERY_FAIL="${FAKE_RUNNING_DB_VERSION_QUERY_FAIL:-false}" \
    FAKE_RUNNING_DB_VERSION_EMPTY="${FAKE_RUNNING_DB_VERSION_EMPTY:-false}" \
    FAKE_SERVICE_HEALTH="${FAKE_SERVICE_HEALTH:-healthy}" \
    FAKE_SOURCE_SERVICE_HEALTH="${FAKE_SOURCE_SERVICE_HEALTH:-healthy}" \
    FAKE_APP_STOP_FAIL="${FAKE_APP_STOP_FAIL:-false}" \
    FAKE_ACTUAL_API_IMAGE_ID="${FAKE_ACTUAL_API_IMAGE_ID:-${APPLICATION_IMAGE_ID}}" \
    FAKE_ACTUAL_WEB_IMAGE_ID="${FAKE_ACTUAL_WEB_IMAGE_ID:-${APPLICATION_IMAGE_ID}}" \
    FAKE_DEFAULT_IMAGE_ID="${APPLICATION_IMAGE_ID}" \
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

prepare_upgrade_fixture() {
  printf 'test-token' | run_maintenance prepare-upgrade \
    "${TARGET_RUNTIME_DIGEST}" \
    "${TARGET_RUNTIME_REVISION}" \
    "mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" \
    "${BACKUP_ID}" \
    test-user
}

set_backup_provenance() {
  local mode="$1"

  /usr/bin/python3 - \
    "${backup_path}/manifest.json" \
    "${APPLICATION_REVISION}" \
    "${SOURCE_RUNTIME_DIGEST}" \
    "${mode}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
application_revision, runtime_digest, mode = sys.argv[2:]
manifest = json.loads(path.read_text(encoding="utf-8"))
manifest["source"] = {
    "applicationSha": application_revision,
    "runtimeConfigDigest": runtime_digest,
}
if mode == "application-mismatch":
    manifest["source"]["applicationSha"] = "9" * 40
elif mode == "runtime-mismatch":
    manifest["source"]["runtimeConfigDigest"] = "sha256:" + "9" * 64
elif mode == "missing-application":
    del manifest["source"]["applicationSha"]
elif mode == "missing-runtime":
    del manifest["source"]["runtimeConfigDigest"]
elif mode != "valid":
    raise SystemExit("unsupported provenance fixture mode")
path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")
PY
}

set_backup_database_binding() {
  local mode="$1"

  /usr/bin/python3 - "${backup_path}/manifest.json" "${mode}" \
    "mysql:8.0.46@sha256:${MYSQL_80_DIGEST}" \
    "${MYSQL_80_ID}" \
    "${ORIGINAL_VOLUME}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
mode, expected_image, expected_image_id, expected_volume = sys.argv[2:]
manifest = json.loads(path.read_text(encoding="utf-8"))
database = manifest["database"]
database.update(
    image=expected_image,
    imageId=expected_image_id,
    volume=expected_volume,
)
if mode == "image-mismatch":
    database["image"] = "mysql:8.0.46@sha256:" + "9" * 64
elif mode == "image-id-mismatch":
    database["imageId"] = "sha256:" + "9" * 64
elif mode == "volume-mismatch":
    database["volume"] = "cubing-hub_mysql-other"
elif mode != "valid":
    raise SystemExit(f"unsupported backup DB binding fixture: {mode}")
path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")
PY
}

bind_backup_to_active_quiesce() {
  local manifest_path="$1"
  local quiesce_file="${app_dir}/runtime-config/mysql-maintenance/quiesce.state"

  /usr/bin/python3 - "${manifest_path}" "${quiesce_file}" <<'PY'
import datetime as dt
import json
import pathlib
import sys

manifest_path = pathlib.Path(sys.argv[1])
quiesce_path = pathlib.Path(sys.argv[2])
values = dict(
    line.split("=", 1)
    for line in quiesce_path.read_text(encoding="utf-8").splitlines()
)
quiesced = dt.datetime.strptime(values["QUIESCED_AT"], "%Y-%m-%dT%H:%M:%SZ")
started = quiesced + dt.timedelta(seconds=1)
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["startedAt"] = started.strftime("%Y-%m-%dT%H:%M:%SZ")
manifest["completedAt"] = (started + dt.timedelta(seconds=1)).strftime(
    "%Y-%m-%dT%H:%M:%SZ"
)
manifest_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")
PY
}

reset_source_db_fixture() {
  /bin/rm -f -- "${app_dir}/runtime-config/pending"
  printf '%s\n' "${MYSQL_80_ID}" >"${db_state}/image-id"
  printf '%s\n' "mysql:8.0.46@sha256:${MYSQL_80_DIGEST}" >"${db_state}/image-ref"
  printf '%s\n' "${ORIGINAL_VOLUME}" >"${db_state}/volume"
  printf 'healthy\n' >"${db_state}/health"
  printf 'true\n' >"${db_state}/running"
  printf 'running\n' >"${service_state}/db"
  printf 'running\n' >"${service_state}/redis"
  printf 'exited\n' >"${service_state}/api"
  printf 'exited\n' >"${service_state}/web"
}

assert_upgrade_version_gate_failure() {
  test -f "${app_dir}/runtime-config/pending"
  test -f "${app_dir}/runtime-config/mysql-maintenance/quiesce.state"
  /usr/bin/grep -Fxq 'TRANSACTION_TYPE=MYSQL_MAINTENANCE' \
    "${app_dir}/runtime-config/pending"
  test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
  test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = \
    "${state_before}"
  test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = \
    "${env_before}"
  test ! -e "${app_dir}/runtime-config/mysql-maintenance/state"
  test "$(/bin/cat "${db_state}/image-id")" = "${MYSQL_84_ID}"
  test "$(/bin/cat "${db_state}/volume")" = "${ORIGINAL_VOLUME}"
  test "$(/bin/cat "${db_state}/health")" = healthy
  /usr/bin/grep -Fq 'MAINTENANCE_QUERY=running-version' "${docker_log}"
  if /usr/bin/grep -Fq 'redis api web' "${docker_log}"; then
    printf 'application services started before the MySQL version gate completed\n' >&2
    exit 1
  fi
}

assert_version_gate_precedes_application_startup() {
  /usr/bin/python3 - "${docker_log}" <<'PY'
import pathlib
import sys

lines = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8").splitlines()
version_index = next(
    index for index, line in enumerate(lines)
    if "MAINTENANCE_QUERY=running-version" in line
)
application_index = next(
    index for index, line in enumerate(lines)
    if "redis api web" in line
)
assert version_index < application_index
PY
}

# A literal confirmation is not a write-stop. The maintenance lifecycle starts
# by proving a healthy source and committing an immutable quiesce record.
test "$(run_maintenance status)" = $'QUIESCE_STATUS=inactive\nPENDING=none'
expect_failure "upgrade preparation without quiesce" prepare_upgrade_fixture

printf 'foreign transaction\n' >"${app_dir}/runtime-config/pending"
expect_failure "quiesce with pending transaction" run_maintenance quiesce
/bin/rm -f -- "${app_dir}/runtime-config/pending"

/bin/unlink "${app_dir}/runtime-config/current"
/bin/ln -s \
  "releases/${TARGET_RUNTIME_DIGEST#sha256:}" \
  "${app_dir}/runtime-config/current"
expect_failure "quiesce with runtime pointer drift" run_maintenance quiesce
/bin/unlink "${app_dir}/runtime-config/current"
/bin/ln -s \
  "releases/${SOURCE_RUNTIME_DIGEST#sha256:}" \
  "${app_dir}/runtime-config/current"

printf '%s\n' \
  sha256:9999999999999999999999999999999999999999999999999999999999999999 \
  >"${db_state}/image-id"
expect_failure "quiesce with source DB identity drift" run_maintenance quiesce
printf '%s\n' "${MYSQL_80_ID}" >"${db_state}/image-id"

FAKE_SOURCE_SERVICE_HEALTH=unhealthy \
  expect_failure "quiesce with unhealthy source" run_maintenance quiesce
FAKE_ACTUAL_API_IMAGE_ID=sha256:9999999999999999999999999999999999999999999999999999999999999999 \
  expect_failure "quiesce with application image drift" run_maintenance quiesce
FAKE_APP_STOP_FAIL=true \
  expect_failure "quiesce application stop failure" run_maintenance quiesce
test "$(/bin/cat "${service_state}/api")" = running
test "$(/bin/cat "${service_state}/web")" = running

maintenance_root="${app_dir}/runtime-config/mysql-maintenance"
/bin/mkdir -p "${maintenance_root}"
/bin/chmod 700 "${maintenance_root}"
printf 'unsafe\n' >"${test_root}/unsafe-quiesce"
/bin/ln -s "${test_root}/unsafe-quiesce" "${maintenance_root}/quiesce.state"
expect_failure "unsafe quiesce evidence" run_maintenance quiesce
/bin/unlink "${maintenance_root}/quiesce.state"

lock_ready="${test_root}/quiesce-lock-ready"
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
expect_failure "quiesce operation lock conflict" run_maintenance quiesce
/bin/kill "${lock_holder_pid}"
wait "${lock_holder_pid}" 2>/dev/null || true
lock_holder_pid=

run_maintenance quiesce >/dev/null
quiesce_file="${maintenance_root}/quiesce.state"
test -f "${quiesce_file}"
/usr/bin/python3 - "${quiesce_file}" <<'PY'
import os
import stat
import sys

assert stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == 0o400
PY
quiesce_evidence_id="$(/usr/bin/sed -n 's/^EVIDENCE_ID=//p' "${quiesce_file}")"
[[ "${quiesce_evidence_id}" =~ ^[0-9a-f]{64}$ ]]
test "$(/bin/cat "${service_state}/api")" = exited
test "$(/bin/cat "${service_state}/web")" = exited
test "$(/bin/cat "${service_state}/db")" = running
/usr/bin/grep -Fxq 'QUIESCE_STATUS=active' <(run_maintenance status)
test "$(run_maintenance quiesce | /usr/bin/sed -n 's/.*: //p')" = \
  "${quiesce_evidence_id}"

expect_failure "backup started before quiesce" prepare_upgrade_fixture
quiesced_at="$(/usr/bin/sed -n 's/^QUIESCED_AT=//p' "${quiesce_file}")"
/usr/bin/python3 - "${backup_path}/manifest.json" "${quiesced_at}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
manifest = json.loads(path.read_text(encoding="utf-8"))
manifest["startedAt"] = sys.argv[2]
manifest["completedAt"] = sys.argv[2]
path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")
PY
expect_failure "backup started at ambiguous quiesce second" prepare_upgrade_fixture
bind_backup_to_active_quiesce "${backup_path}/manifest.json"

# Upgrade backups must originate from the exact committed source runtime.
set_backup_provenance application-mismatch
expect_failure "backup application revision mismatch" prepare_upgrade_fixture
test ! -e "${app_dir}/runtime-config/mysql-maintenance/candidates"
set_backup_provenance runtime-mismatch
expect_failure "backup runtime digest mismatch" prepare_upgrade_fixture
test ! -e "${app_dir}/runtime-config/mysql-maintenance/candidates"
set_backup_provenance missing-application
expect_failure "backup application provenance missing" prepare_upgrade_fixture
test ! -e "${app_dir}/runtime-config/mysql-maintenance/candidates"
set_backup_provenance missing-runtime
expect_failure "backup runtime provenance missing" prepare_upgrade_fixture
test ! -e "${app_dir}/runtime-config/mysql-maintenance/candidates"
set_backup_provenance valid

set_backup_database_binding image-mismatch
expect_failure "backup exact DB image mismatch" prepare_upgrade_fixture
set_backup_database_binding image-id-mismatch
expect_failure "backup DB image ID mismatch" prepare_upgrade_fixture
set_backup_database_binding volume-mismatch
expect_failure "backup DB volume mismatch" prepare_upgrade_fixture
set_backup_database_binding valid

# Before any DB transition starts, resume-source is the only canonical way to
# restore the source application and clear the write-stop evidence.
printf 'foreign transaction\n' >"${app_dir}/runtime-config/pending"
expect_failure "resume source with pending transaction" run_maintenance resume-source
/bin/rm -f -- "${app_dir}/runtime-config/pending"
run_maintenance resume-source >/dev/null
test ! -e "${quiesce_file}"
test "$(/bin/cat "${service_state}/api")" = running
test "$(/bin/cat "${service_state}/web")" = running
test "$(run_maintenance status)" = $'QUIESCE_STATUS=inactive\nPENDING=none'
expect_failure "resume source without evidence" run_maintenance resume-source

run_maintenance quiesce >/dev/null
bind_backup_to_active_quiesce "${backup_path}/manifest.json"
quiesce_evidence_id="$(/usr/bin/sed -n 's/^EVIDENCE_ID=//p' "${quiesce_file}")"

# Candidate creation must not change current runtime state or binding.
state_before="$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')"
current_before="$(/usr/bin/readlink "${app_dir}/runtime-config/current")"
env_before="$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')"
upgrade_candidate="$(prepare_upgrade_fixture)"
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
/usr/bin/grep -Fxq 'SCHEMA_VERSION=2' "${upgrade_file}"
/usr/bin/grep -Fxq "QUIESCE_EVIDENCE_ID=${quiesce_evidence_id}" "${upgrade_file}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = "${state_before}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = "${env_before}"

# The confirmation token cannot substitute for persistent quiesce evidence.
/bin/mv "${quiesce_file}" "${quiesce_file}.hold"
expect_failure "literal confirmation without quiesce evidence" \
  run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
/bin/mv "${quiesce_file}.hold" "${quiesce_file}"

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

/bin/cp "${app_dir}/runtime-config/state" "${test_root}/source-state.valid"
/usr/bin/sed \
  's/^RUNTIME_CONFIG_REVISION=.*/RUNTIME_CONFIG_REVISION=4444444444444444444444444444444444444444/' \
  "${test_root}/source-state.valid" >"${app_dir}/runtime-config/state"
/bin/chmod 600 "${app_dir}/runtime-config/state"
expect_failure "stale quiesce runtime revision" \
  run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
/bin/cp "${test_root}/source-state.valid" "${app_dir}/runtime-config/state"
/bin/chmod 600 "${app_dir}/runtime-config/state"

/bin/cp "${app_dir}/.env" "${test_root}/source-env.valid"
/usr/bin/sed \
  -e 's/^APPLICATION_REVISION=.*/APPLICATION_REVISION=4444444444444444444444444444444444444444/' \
  "${test_root}/source-state.valid" >"${app_dir}/runtime-config/state"
/usr/bin/sed \
  -e 's/1111111111111111111111111111111111111111/4444444444444444444444444444444444444444/g' \
  "${test_root}/source-env.valid" >"${app_dir}/.env"
/bin/chmod 600 "${app_dir}/runtime-config/state" "${app_dir}/.env"
expect_failure "stale quiesce application revision" \
  run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
/bin/cp "${test_root}/source-state.valid" "${app_dir}/runtime-config/state"
/bin/cp "${test_root}/source-env.valid" "${app_dir}/.env"
/bin/chmod 600 "${app_dir}/runtime-config/state" "${app_dir}/.env"

printf 'cubing-hub_mysql-drift\n' >"${db_state}/volume"
expect_failure "stale quiesce DB volume" \
  run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
printf '%s\n' "${ORIGINAL_VOLUME}" >"${db_state}/volume"

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

# A tag@digest reference and matching image ID do not prove the running server
# patch. Every unsupported actual version must stop before application startup.
for invalid_version in 8.0.46 8.4.10 8.4.12 9.0.0; do
  : >"${docker_log}"
  FAKE_RUNNING_DB_VERSION_OVERRIDE="${invalid_version}" \
    expect_failure "wrong running MySQL version ${invalid_version}" \
      run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
  assert_upgrade_version_gate_failure
  reset_source_db_fixture
done

: >"${docker_log}"
FAKE_RUNNING_DB_VERSION_QUERY_FAIL=true \
  expect_failure "running MySQL version query failure" \
    run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
assert_upgrade_version_gate_failure
reset_source_db_fixture

: >"${docker_log}"
FAKE_RUNNING_DB_VERSION_EMPTY=true \
  expect_failure "empty running MySQL version result" \
    run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
assert_upgrade_version_gate_failure
reset_source_db_fixture

: >"${docker_log}"
FAKE_RUNNING_DB_VERSION_OVERRIDE=not-a-version \
  expect_failure "malformed running MySQL version result" \
    run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
assert_upgrade_version_gate_failure
reset_source_db_fixture

# A target startup failure keeps the canonical pending transaction and all
# state evidence. Recovery finalizes only after the target is actually healthy.
FAKE_MAINTENANCE_DB_UP_FAIL=true \
  expect_failure "MySQL 8.4 startup failure" \
    run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
test -f "${app_dir}/runtime-config/pending"
/usr/bin/grep -Fxq 'TRANSACTION_TYPE=MYSQL_MAINTENANCE' \
  "${app_dir}/runtime-config/pending"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = "${state_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = "${env_before}"
/usr/bin/grep -Fxq "DB_IMAGE=mysql:8.0.46@sha256:${MYSQL_80_DIGEST}" "${app_dir}/.env"
/usr/bin/grep -Fxq "DB_VOLUME_NAME=${ORIGINAL_VOLUME}" "${app_dir}/.env"
test -f "${quiesce_file}"

# Reset only the isolated fixture so application-startup failure can exercise
# a fresh apply from the same committed source state.
reset_source_db_fixture

# A target DB can be healthy while the application service set is not. The
# target binding remains process-local until dedicated recovery finalizes it.
# A supported server suffix must pass the version gate before application up.
: >"${docker_log}"
FAKE_RUNNING_DB_VERSION_OVERRIDE=8.4.11-commercial \
FAKE_SERVICE_HEALTH=unhealthy \
  expect_failure "application service health failure" \
    run_maintenance apply "${upgrade_candidate}" WRITE_STOP_CONFIRMED
assert_version_gate_precedes_application_startup
test -f "${app_dir}/runtime-config/pending"
/bin/cp \
  "${app_dir}/runtime-config/pending" \
  "${test_root}/failed-upgrade-pending.fixture"
test "$(/bin/cat "${db_state}/image-id")" = "${MYSQL_84_ID}"
test "$(/bin/cat "${db_state}/volume")" = "${ORIGINAL_VOLUME}"
test "$(/bin/cat "${db_state}/health")" = healthy
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = "${state_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = "${env_before}"
/usr/bin/grep -Fxq "DB_IMAGE=mysql:8.0.46@sha256:${MYSQL_80_DIGEST}" "${app_dir}/.env"
/usr/bin/grep -Fxq "DB_VOLUME_NAME=${ORIGINAL_VOLUME}" "${app_dir}/.env"
test -f "${quiesce_file}"

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
test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" != "${state_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = "${env_before}"
FAKE_RUNNING_DB_VERSION_OVERRIDE=8.0.46 \
  expect_failure "wrong running MySQL version during recovery" \
    run_maintenance recover
test -f "${app_dir}/runtime-config/pending"
test -f "${quiesce_file}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = "${env_before}"
FAKE_SERVICE_HEALTH=unhealthy \
  expect_failure "unhealthy target recovery" run_maintenance recover
test -f "${app_dir}/runtime-config/pending"
test -f "${quiesce_file}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${current_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = "${env_before}"
run_maintenance recover
test ! -e "${app_dir}/runtime-config/pending"
test ! -e "${quiesce_file}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = \
  "releases/${TARGET_RUNTIME_DIGEST#sha256:}"
/usr/bin/grep -Fxq "DB_IMAGE=mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" "${app_dir}/.env"
/usr/bin/grep -Fxq "DB_VOLUME_NAME=${ORIGINAL_VOLUME}" "${app_dir}/.env"
/usr/bin/grep -Fxq \
  "PREVIOUS_RUNTIME_CONFIG_DIGEST=${TARGET_RUNTIME_DIGEST}" \
  "${app_dir}/runtime-config/state"

# A completed upgrade requires a new quiesce of the running 8.4 source before
# rollback preparation. resume-source cannot cross the completed DB boundary.
run_maintenance quiesce >/dev/null
rollback_quiesce_evidence_id="$(
  /usr/bin/sed -n 's/^EVIDENCE_ID=//p' "${quiesce_file}"
)"
/bin/cp "${quiesce_file}" "${test_root}/rollback-quiesce.fixture"
expect_failure "resume source after completed upgrade" run_maintenance resume-source
test -f "${quiesce_file}"

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
/usr/bin/grep -Fxq "SOURCE_UPGRADE_CANDIDATE_ID=${upgrade_candidate}" "${rollback_file}"
/usr/bin/grep -Fxq 'TARGET_DB_IMAGE=mysql:8.0.46' "${rollback_file}"
/usr/bin/grep -Fxq "SOURCE_DB_VOLUME=${ORIGINAL_VOLUME}" "${rollback_file}"
/usr/bin/grep -Fxq "TARGET_DB_VOLUME=${ROLLBACK_VOLUME}" "${rollback_file}"
/usr/bin/grep -Fxq \
  "QUIESCE_EVIDENCE_ID=${rollback_quiesce_evidence_id}" \
  "${rollback_file}"

# A second immutable rollback candidate for the same restore must not replace
# an interrupted rollback transaction.
/bin/sleep 1
other_rollback_candidate="$(
  run_maintenance prepare-rollback "${upgrade_candidate}" "${ROLLBACK_VOLUME}"
)"
[[ "${other_rollback_candidate}" =~ ^[0-9a-f]{64}$ ]]
test "${other_rollback_candidate}" != "${rollback_candidate}"

# Restore evidence is historical. Rollback apply must recheck the detached
# volume's current table inventory and row counts before writing pending or
# stopping the source binding.
pre_cutover_state="$(
  /usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}'
)"
pre_cutover_current="$(/usr/bin/readlink "${app_dir}/runtime-config/current")"
pre_cutover_env="$(
  /usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}'
)"
FAKE_RESTORE_USERS_COUNT=2 \
  expect_failure "rollback volume row count changed after verification" \
    run_maintenance apply "${rollback_candidate}" WRITE_STOP_CONFIRMED
test ! -e "${app_dir}/runtime-config/pending"
test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = \
  "${pre_cutover_state}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${pre_cutover_current}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = \
  "${pre_cutover_env}"
test "$(/bin/cat "${db_state}/volume")" = "${ORIGINAL_VOLUME}"

FAKE_RESTORE_TABLES=users \
  expect_failure "rollback volume table inventory changed after verification" \
    run_maintenance apply "${rollback_candidate}" WRITE_STOP_CONFIRMED
test ! -e "${app_dir}/runtime-config/pending"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = \
  "${pre_cutover_env}"

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

# A rollback startup timeout can leave its exact target container attached and
# unhealthy. The same immutable candidate must resume without replacing its
# canonical pending transaction.
rollback_state_before="$(
  /usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}'
)"
rollback_current_before="$(/usr/bin/readlink "${app_dir}/runtime-config/current")"
rollback_maintenance_before="$(
  /usr/bin/shasum -a 256 "${maintenance_state}" | /usr/bin/awk '{print $1}'
)"
rollback_env_before="$(
  /usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}'
)"
FAKE_MAINTENANCE_DB_UP_FAIL=true \
FAKE_MAINTENANCE_DB_UP_FAIL_AFTER_BIND=true \
  expect_failure "MySQL 8.0 rollback startup failure" \
    run_maintenance apply "${rollback_candidate}" WRITE_STOP_CONFIRMED
rollback_pending="${app_dir}/runtime-config/pending"
test -f "${rollback_pending}"
/usr/bin/grep -Fxq 'TRANSACTION_TYPE=MYSQL_MAINTENANCE' "${rollback_pending}"
/usr/bin/grep -Fxq 'OPERATION=ROLLBACK' "${rollback_pending}"
/usr/bin/grep -Fxq "CANDIDATE_ID=${rollback_candidate}" "${rollback_pending}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = "${rollback_current_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/runtime-config/state" | /usr/bin/awk '{print $1}')" = \
  "${rollback_state_before}"
test "$(/usr/bin/shasum -a 256 "${maintenance_state}" | /usr/bin/awk '{print $1}')" = \
  "${rollback_maintenance_before}"
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = \
  "${rollback_env_before}"
/usr/bin/grep -Fxq "DB_IMAGE=mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" "${app_dir}/.env"
/usr/bin/grep -Fxq "DB_VOLUME_NAME=${ORIGINAL_VOLUME}" "${app_dir}/.env"
test "$(/bin/cat "${db_state}/volume")" = "${ROLLBACK_VOLUME}"
test "$(/bin/cat "${db_state}/health")" = unhealthy
test -f "${upgrade_file}"
test -f "${restore_evidence}"
test -f "${rollback_file}"
test -f "${quiesce_file}"
/bin/cp "${rollback_pending}" "${test_root}/failed-rollback-pending.fixture"

expect_failure "unhealthy rollback target recovery" run_maintenance recover
test -f "${rollback_pending}"
test -f "${quiesce_file}"

# A resumed rollback must not reuse the parity result from its first apply.
# The exact unhealthy target container is removed, then current volume contents
# are validated again before the transition can continue.
FAKE_RESTORE_USERS_COUNT=2 \
  expect_failure "interrupted rollback volume changed before retry" \
    run_maintenance apply "${rollback_candidate}" WRITE_STOP_CONFIRMED
test -f "${rollback_pending}"
/usr/bin/grep -Fxq "CANDIDATE_ID=${rollback_candidate}" "${rollback_pending}"
test "$(/bin/cat "${db_state}/running")" = false
test "$(/usr/bin/shasum -a 256 "${app_dir}/.env" | /usr/bin/awk '{print $1}')" = \
  "${rollback_env_before}"

expect_failure "different rollback candidate resume" \
  run_maintenance apply "${other_rollback_candidate}" WRITE_STOP_CONFIRMED
/usr/bin/grep -Fxq "CANDIDATE_ID=${rollback_candidate}" "${rollback_pending}"

/usr/bin/sed \
  's/^TRANSACTION_TYPE=.*/TRANSACTION_TYPE=FOREIGN_TRANSACTION/' \
  "${test_root}/failed-rollback-pending.fixture" \
  >"${rollback_pending}"
/bin/chmod 600 "${rollback_pending}"
expect_failure "tampered rollback pending transaction" \
  run_maintenance apply "${rollback_candidate}" WRITE_STOP_CONFIRMED
/bin/cp "${test_root}/failed-rollback-pending.fixture" "${rollback_pending}"
/bin/chmod 600 "${rollback_pending}"

run_maintenance apply "${rollback_candidate}" WRITE_STOP_CONFIRMED
test ! -e "${app_dir}/runtime-config/pending"
test ! -e "${quiesce_file}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = \
  "releases/${TARGET_RUNTIME_DIGEST#sha256:}"
/usr/bin/grep -Fxq "DB_IMAGE=mysql:8.0.46@sha256:${MYSQL_80_DIGEST}" "${app_dir}/.env"
/usr/bin/grep -Fxq "DB_VOLUME_NAME=${ROLLBACK_VOLUME}" "${app_dir}/.env"
test "$(/bin/cat "${db_state}/volume")" = "${ROLLBACK_VOLUME}"
test "$(/bin/cat "${db_state}/image-id")" = "${MYSQL_80_ID}"
/usr/bin/grep -Fxq 'OPERATION=ROLLBACK' \
  "${app_dir}/runtime-config/mysql-maintenance/state"

# When the rollback DB binding is already healthy and only state finalization
# remains, dedicated recover keeps its original responsibility.
/bin/cp "${test_root}/rollback-quiesce.fixture" "${quiesce_file}"
/bin/chmod 400 "${quiesce_file}"
/bin/unlink "${app_dir}/runtime-config/current"
/bin/ln -s \
  "releases/${SOURCE_RUNTIME_DIGEST#sha256:}" \
  "${app_dir}/runtime-config/current"
/bin/cp "${test_root}/failed-rollback-pending.fixture" "${rollback_pending}"
/bin/chmod 600 "${rollback_pending}"
FAKE_SOURCE_SERVICE_HEALTH=unhealthy \
  expect_failure "rollback application recovery failure" run_maintenance recover
test -f "${rollback_pending}"
test -f "${quiesce_file}"
run_maintenance recover
test ! -e "${rollback_pending}"
test ! -e "${quiesce_file}"
test "$(/usr/bin/readlink "${app_dir}/runtime-config/current")" = \
  "releases/${TARGET_RUNTIME_DIGEST#sha256:}"
/usr/bin/grep -Fxq 'OPERATION=ROLLBACK' "${maintenance_state}"
test "$(/bin/cat "${db_state}/volume")" = "${ROLLBACK_VOLUME}"
test "$(/bin/cat "${db_state}/image-id")" = "${MYSQL_80_ID}"

# The immutable original volume name remains in the upgrade candidate and is
# never used by the rollback target.
/usr/bin/grep -Fxq "SOURCE_DB_VOLUME=${ORIGINAL_VOLUME}" "${upgrade_file}"
/usr/bin/grep -Fxq "TARGET_DB_VOLUME=${ORIGINAL_VOLUME}" "${upgrade_file}"
/usr/bin/grep -Fxq "TARGET_DB_VOLUME=${ROLLBACK_VOLUME}" "${rollback_file}"

# A later maintenance cycle treats the verified rollback binding as the new
# normal 8.0 source and requires a backup from the current runtime instead of
# reusing the previous cycle's source snapshot.
run_maintenance quiesce >/dev/null
next_backup_path="${backup_root}/${NEXT_BACKUP_ID}"
/bin/mkdir -p "${next_backup_path}/database"
/bin/cp "${backup_path}/database/dump" "${next_backup_path}/database/dump"
/bin/cp "${backup_path}/SUCCESS" "${next_backup_path}/SUCCESS"
/usr/bin/python3 - \
  "${backup_path}/manifest.json" \
  "${next_backup_path}/manifest.json" \
  "${APPLICATION_REVISION}" \
  "${TARGET_RUNTIME_DIGEST}" \
  "mysql:8.0.46@sha256:${MYSQL_80_DIGEST}" \
  "${MYSQL_80_ID}" \
  "${ROLLBACK_VOLUME}" <<'PY'
import json
import pathlib
import sys

source_path = pathlib.Path(sys.argv[1])
target_path = pathlib.Path(sys.argv[2])
(
    application_revision,
    runtime_digest,
    database_image,
    database_image_id,
    database_volume,
) = sys.argv[3:]
manifest = json.loads(source_path.read_text(encoding="utf-8"))
manifest["source"] = {
    "applicationSha": application_revision,
    "runtimeConfigDigest": runtime_digest,
}
manifest["database"].update(
    image=database_image,
    imageId=database_image_id,
    volume=database_volume,
)
target_path.write_text(json.dumps(manifest) + "\n", encoding="utf-8")
PY
bind_backup_to_active_quiesce "${next_backup_path}/manifest.json"
next_upgrade_candidate="$(
  printf 'test-token' | run_maintenance prepare-upgrade \
    "${TARGET_RUNTIME_DIGEST}" \
    "${TARGET_RUNTIME_REVISION}" \
    "mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" \
    "${NEXT_BACKUP_ID}" \
    test-user
)"
next_upgrade_file="${app_dir}/runtime-config/mysql-maintenance/candidates/${next_upgrade_candidate}/candidate.env"
/usr/bin/grep -Fxq "SOURCE_DB_VOLUME=${ROLLBACK_VOLUME}" "${next_upgrade_file}"
/usr/bin/grep -Fxq "TARGET_DB_VOLUME=${ROLLBACK_VOLUME}" "${next_upgrade_file}"
/bin/cp "${quiesce_file}" "${test_root}/next-upgrade-quiesce.fixture"

# Exact MySQL 8.4.11 allows the normal apply path to start the application and
# commit the target binding only after the runtime version gate succeeds.
: >"${docker_log}"
run_maintenance apply "${next_upgrade_candidate}" WRITE_STOP_CONFIRMED
test ! -e "${app_dir}/runtime-config/pending"
test ! -e "${quiesce_file}"
test "$(/bin/cat "${db_state}/image-id")" = "${MYSQL_84_ID}"
/usr/bin/grep -Fxq "DB_IMAGE=mysql:8.4.11@sha256:${MYSQL_84_DIGEST}" "${app_dir}/.env"
/usr/bin/grep -Fxq "DB_VOLUME_NAME=${ROLLBACK_VOLUME}" "${app_dir}/.env"
/usr/bin/grep -Fxq 'OPERATION=UPGRADE' \
  "${app_dir}/runtime-config/mysql-maintenance/state"
assert_version_gate_precedes_application_startup

# If interruption happens after success state and pending removal but before
# the last evidence unlink, dedicated recover can finish only that cleanup.
/bin/cp "${test_root}/next-upgrade-quiesce.fixture" "${quiesce_file}"
/bin/chmod 400 "${quiesce_file}"
run_maintenance recover
test ! -e "${quiesce_file}"

printf 'Cubing Hub MySQL maintenance transition tests passed\n'
