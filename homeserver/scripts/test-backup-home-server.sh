#!/bin/bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1
  pwd -P
)"
readonly SOURCE_SCRIPT="${SCRIPT_DIR}/backup-home-server.sh"
readonly PRODUCTION_BACKUP_ROOT=/Users/homeserver/Server/backups/cubing-hub/data
readonly PRODUCTION_OFFSITE_ROOT=/Users/homeserver/Server/backups/cubing-hub/offsite
readonly PRODUCTION_ICLOUD_ROOT='/Users/homeserver/Library/Mobile Documents/com~apple~CloudDocs/HomeServerBackups/cubing-hub'
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000
readonly APPLICATION_SHA=1111111111111111111111111111111111111111
readonly PREVIOUS_SHA=2222222222222222222222222222222222222222
readonly CONFIG_DIGEST=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
readonly CONFIG_SHA=3333333333333333333333333333333333333333

test_root="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-backup-test.XXXXXX")"

cleanup() {
  if [[ "$(basename "${test_root}")" == cubing-backup-test.* ]]; then
    /bin/rm -rf -- "${test_root}"
  fi
}

trap cleanup EXIT INT TERM

mock_docker="${test_root}/docker"
mock_age="${test_root}/age"
mock_curl="${test_root}/curl"
docker_log="${test_root}/docker.log"
heartbeat_log="${test_root}/heartbeat.log"
default_dump_file="${test_root}/default-dump.sql"

write_mysql_dump_fixture() {
  local target_file="$1"
  local object_key="$2"
  local insert_mode="${3:-single}"

  {
    printf '%s\n' \
      '-- Table structure for table `post_attachments`' \
      'CREATE TABLE `post_attachments` (' \
      '  `id` BIGINT,' \
      '  `object_key` VARCHAR(512)' \
      ');' \
      '-- Dumping data for table `post_attachments`'
    if [[ "${insert_mode}" == single ]]; then
      printf \
        "INSERT INTO \`post_attachments\` (\`id\`, \`original_file_name\`, \`object_key\`) VALUES (1,'photo, (primary).jpg','%s');\n" \
        "${object_key}"
    elif [[ "${insert_mode}" == extended ]]; then
      printf \
        "INSERT INTO \`post_attachments\` (\`id\`, \`original_file_name\`, \`object_key\`) VALUES (1,'photo, (primary).jpg','%s'),(2,'second.jpg','second.jpg');\n" \
        "${object_key}"
    else
      printf 'Unsupported dump fixture mode: %s\n' "${insert_mode}" >&2
      return 1
    fi
    printf '%s\n' \
      '-- Table structure for table `users`' \
      'CREATE TABLE `users` (`id` BIGINT);' \
      '-- Dumping data for table `users`' \
      'INSERT INTO `users` (`id`) VALUES (1);' \
      '-- Dump completed on 2026-08-01 00:00:00'
  } >"${target_file}"
}

write_mysql_dump_fixture "${default_dump_file}" image-one.jpg
export MOCK_DUMP_FILE="${default_dump_file}"

{
  printf '%s\n' \
    '#!/bin/bash' \
    'set -Eeuo pipefail' \
    'printf "%s\n" "$*" >>"${DOCKER_LOG}"' \
    'if [[ " $* " != *" --project-name cubing-hub "* ]]; then' \
    '  printf "Compose project name was not pinned: %s\n" "$*" >&2' \
    '  exit 1' \
    'elif [[ " $* " == *" config --format json "* ]]; then' \
    '  if [[ -n "${POST_IMAGES_HOST_DIR+x}" ]]; then' \
    '    printf "ambient POST_IMAGES_HOST_DIR reached Compose rendering\n" >&2' \
    '    exit 1' \
    '  fi' \
    '  printf '\''{"services":{"api":{"volumes":[{"type":"bind","source":"%s","target":"/data/post-images"}]},"web":{"volumes":[{"type":"bind","source":"%s","target":"/data/post-images"}]}}}\n'\'' "${MOCK_POST_IMAGES_DIR}" "${MOCK_POST_IMAGES_DIR}"' \
    'elif [[ " $* " == *" ps --status running --services "* ]]; then' \
    '  printf "db\n"' \
    'elif [[ "$*" == *"BACKUP_QUERY=dump"* ]]; then' \
    '  /bin/cat "${MOCK_DUMP_FILE}"' \
    'elif [[ "$*" == *"BACKUP_QUERY=version"* ]]; then' \
    '  printf "8.0.46\n"' \
    'elif [[ "$*" == *"BACKUP_QUERY=record-counts"* ]]; then' \
    '  printf "post_attachments\t0\nusers\t1\n"' \
    'elif [[ "$*" == *"BACKUP_QUERY=attachment-keys"* ]]; then' \
    '  :' \
    'elif [[ " $* " == *" exec -T db /bin/sh -ceu "* ]]; then' \
    '  :' \
    'else' \
    '  printf "unexpected Docker invocation: %s\n" "$*" >&2' \
    '  exit 1' \
    'fi'
} >"${mock_docker}"
/bin/chmod 700 "${mock_docker}"

{
  printf '%s\n' \
    '#!/bin/bash' \
    'set -Eeuo pipefail' \
    'printf "age-encryption.org/v1\n"' \
    '/bin/cat'
} >"${mock_age}"
/bin/chmod 700 "${mock_age}"

{
  printf '%s\n' \
    '#!/bin/bash' \
    'set -Eeuo pipefail' \
    'printf "%s\n" "$*" >>"${HEARTBEAT_LOG}"'
} >"${mock_curl}"
/bin/chmod 700 "${mock_curl}"
: >"${heartbeat_log}"

prepare_script() {
  local app_dir="$1"
  local backup_root="$2"
  local target_script="$3"

  if ! /usr/bin/grep -Fqx \
    "readonly BACKUP_ROOT=${PRODUCTION_BACKUP_ROOT}" \
    "${SOURCE_SCRIPT}"
  then
    printf 'Production backup path contract is missing: %s\n' \
      "${PRODUCTION_BACKUP_ROOT}" \
      >&2
    exit 1
  fi

  /usr/bin/sed \
    -e "s#readonly DOCKER_BIN=/usr/local/bin/docker#readonly DOCKER_BIN=${mock_docker}#" \
    -e "s#readonly AGE_BIN=/opt/homebrew/bin/age#readonly AGE_BIN=${mock_age}#" \
    -e "s#readonly CURL_BIN=/usr/bin/curl#readonly CURL_BIN=${mock_curl}#" \
    -e "s#readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub#readonly APP_DIR=${app_dir}#" \
    -e "s#readonly BACKUP_BOOTSTRAP_SCRIPT=/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh#readonly BACKUP_BOOTSTRAP_SCRIPT=${target_script}#" \
    -e "s#readonly BACKUP_ROOT=${PRODUCTION_BACKUP_ROOT}#readonly BACKUP_ROOT=${backup_root}#" \
    -e "s#readonly OFFSITE_STAGING_ROOT=${PRODUCTION_OFFSITE_ROOT}#readonly OFFSITE_STAGING_ROOT=${backup_root}-offsite#" \
    -e "s#readonly ICLOUD_ROOT='${PRODUCTION_ICLOUD_ROOT}'#readonly ICLOUD_ROOT='${backup_root}-icloud'#" \
    "${SOURCE_SCRIPT}" >"${target_script}"
  if ! /usr/bin/grep -Fqx "readonly BACKUP_ROOT=${backup_root}" "${target_script}"; then
    printf 'Test backup path substitution failed: %s\n' "${backup_root}" >&2
    exit 1
  fi
  /bin/chmod 700 "${target_script}"
}

runtime_content_sha256() {
  local release_dir="$1"

  {
    /usr/bin/shasum -a 256 "${release_dir}/compose.yaml"
    /usr/bin/shasum -a 256 \
      "${release_dir}/nginx/cloudflare-edge-real-ip.conf"
    if [[ -f "${release_dir}/scripts/backup-cubing-hub.sh" ]] \
      && [[ -f "${release_dir}/scripts/deploy-cubing-hub.sh" ]]
    then
      /usr/bin/shasum -a 256 \
        "${release_dir}/scripts/backup-cubing-hub.sh"
      /usr/bin/shasum -a 256 \
        "${release_dir}/scripts/deploy-cubing-hub.sh"
    fi
  } | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
}

prepare_runtime_state() {
  local app_dir="$1"
  local runtime_backup_script="$2"
  local include_scripts="${3:-true}"
  local release_dir="${app_dir}/runtime-config/releases/${CONFIG_DIGEST#sha256:}"
  local content_sha

  /bin/mkdir -p "${release_dir}/nginx"
  printf 'name: cubing-hub\nservices: {}\n' >"${release_dir}/compose.yaml"
  printf 'set_real_ip_from 192.0.2.0/24;\n' \
    >"${release_dir}/nginx/cloudflare-edge-real-ip.conf"
  if [[ "${include_scripts}" == true ]]; then
    /bin/mkdir -p "${release_dir}/scripts"
    /bin/cp \
      "${runtime_backup_script}" \
      "${release_dir}/scripts/backup-cubing-hub.sh"
    /bin/cp \
      "${SCRIPT_DIR}/deploy-home-server.sh" \
      "${release_dir}/scripts/deploy-cubing-hub.sh"
    /bin/chmod 700 \
      "${release_dir}/scripts/backup-cubing-hub.sh" \
      "${release_dir}/scripts/deploy-cubing-hub.sh"
  fi
  content_sha="$(runtime_content_sha256 "${release_dir}")"

  {
    printf 'APPLICATION_REVISION=%s\n' "${APPLICATION_SHA}"
    printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${PREVIOUS_SHA}"
    printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${ZERO_DIGEST}"
    printf 'RUNTIME_CONFIG_CONTENT_SHA256=%s\n' "${content_sha}"
    printf 'RUNTIME_CONFIG_DIGEST=%s\n' "${CONFIG_DIGEST}"
    printf 'RUNTIME_CONFIG_REVISION=%s\n' "${CONFIG_SHA}"
  } >"${app_dir}/runtime-config/state"
  printf 'RUNTIME_CONFIG_V2=initialized\n' \
    >"${app_dir}/.runtime-config-v2-initialized"
  /bin/chmod 400 "${app_dir}/.runtime-config-v2-initialized"
  /bin/ln -s \
    "releases/${CONFIG_DIGEST#sha256:}" \
    "${app_dir}/runtime-config/current"
}

prepare_app() {
  local app_dir="$1"
  local post_images_dir="$2"

  /bin/mkdir -p "${app_dir}" "${post_images_dir}"
  printf 'API_IMAGE=example-api\nWEB_IMAGE=example-web\nPOST_IMAGES_HOST_DIR=%s\n' \
    "${post_images_dir}" >"${app_dir}/.env"
  printf 'age1testrecipient000000000000000000000000000000000000000000000\n' \
    >"${app_dir}/backup-age-recipient-v1.txt"
  /bin/chmod 600 "${app_dir}/backup-age-recipient-v1.txt"
}

seed_retention_matrix() {
  local backup_root="$1"
  local expected_file="$2"

  /usr/bin/python3 - "${backup_root}" "${expected_file}" <<'PY'
import datetime as dt
import hashlib
import json
import os
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
expected_path = pathlib.Path(sys.argv[2])
root.mkdir(parents=True, exist_ok=True)
kst = dt.timezone(dt.timedelta(hours=9))
now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
prefix = "cubing-hub-production-"

def name_for(timestamp):
    return prefix + timestamp.astimezone(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")

def write_valid(timestamp):
    name = name_for(timestamp)
    snapshot = root / name
    (snapshot / "database").mkdir(parents=True)
    (snapshot / "files" / "post-images").mkdir(parents=True)
    dump = b"retention fixture\n"
    references = b""
    (snapshot / "database" / "dump").write_bytes(dump)
    (snapshot / "files" / "sha256.txt").write_text("", encoding="utf-8")
    (snapshot / "files" / "database-references.txt").write_bytes(references)
    manifest = {
        "schemaVersion": 1,
        "status": "success",
        "project": "cubing-hub",
        "environment": "production",
        "database": {
            "engine": "mysql",
            "version": "8.0.46",
            "dumpFile": "database/dump",
            "bytes": len(dump),
            "sha256": hashlib.sha256(dump).hexdigest(),
            "validator": "mysqldump structure and completion marker",
            "recordCounts": {"post_attachments": 0},
            "recordCountsSource": "database/dump",
        },
        "files": {
            "enabled": True,
            "directory": "files/post-images",
            "manifest": "files/sha256.txt",
            "count": 0,
            "bytes": 0,
            "databaseReferences": {
                "source": "database/dump",
                "manifest": "files/database-references.txt",
                "count": 0,
                "sha256": hashlib.sha256(references).hexdigest(),
            },
        },
    }
    (snapshot / "manifest.json").write_text(
        json.dumps(manifest) + "\n", encoding="utf-8"
    )
    (snapshot / "SUCCESS").write_text("snapshot complete\n", encoding="utf-8")
    return name

recent_seed = [write_valid(now - dt.timedelta(seconds=offset)) for offset in (1, 2, 3)]
daily_keep = []
prune_expected = []
today = now.astimezone(kst).date()
for offset in range(1, 9):
    target = today - dt.timedelta(days=offset)
    before = dt.datetime.combine(target, dt.time(5, 55), tzinfo=kst)
    first = dt.datetime.combine(target, dt.time(6, 5), tzinfo=kst)
    later = dt.datetime.combine(target, dt.time(12, 5), tzinfo=kst)
    before_name = write_valid(before)
    first_name = write_valid(first)
    later_name = write_valid(later)
    if offset <= 7:
        daily_keep.append(first_name)
        prune_expected.extend([before_name, later_name])
    else:
        prune_expected.extend([before_name, first_name, later_name])

invalid_time = dt.datetime.combine(
    today - dt.timedelta(days=9), dt.time(6, 5), tzinfo=kst
)
invalid_name = name_for(invalid_time)
(root / invalid_name).mkdir()
(root / invalid_name / "manifest.json").write_text("{}\n", encoding="utf-8")

symlink_time = dt.datetime.combine(
    today - dt.timedelta(days=10), dt.time(6, 5), tzinfo=kst
)
symlink_name = name_for(symlink_time)
os.symlink(recent_seed[0], root / symlink_name)

missing_reference_time = dt.datetime.combine(
    today - dt.timedelta(days=11), dt.time(6, 5), tzinfo=kst
)
missing_reference_name = write_valid(missing_reference_time)
missing_reference_snapshot = root / missing_reference_name
missing_references = b"missing.jpg\n"
(missing_reference_snapshot / "files" / "database-references.txt").write_bytes(
    missing_references
)
missing_reference_manifest_path = missing_reference_snapshot / "manifest.json"
missing_reference_manifest = json.loads(
    missing_reference_manifest_path.read_text(encoding="utf-8")
)
missing_reference_manifest["database"]["recordCounts"]["post_attachments"] = 1
missing_reference_manifest["files"]["databaseReferences"].update(
    {
        "count": 1,
        "sha256": hashlib.sha256(missing_references).hexdigest(),
    }
)
missing_reference_manifest_path.write_text(
    json.dumps(missing_reference_manifest) + "\n", encoding="utf-8"
)

expected_path.write_text(
    json.dumps(
        {
            "recentSeed": recent_seed,
            "dailyKeep": daily_keep,
            "pruneExpected": prune_expected,
            "invalidName": invalid_name,
            "missingReferenceName": missing_reference_name,
            "symlinkName": symlink_name,
        }
    )
    + "\n",
    encoding="utf-8",
)
PY
}

assert_retention_matrix() {
  local backup_root="$1"
  local expected_file="$2"

  /usr/bin/python3 - \
    "${backup_root}" \
    "${backup_root}/retention-plan.json" \
    "${expected_file}" <<'PY'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
plan = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
expected = json.loads(pathlib.Path(sys.argv[3]).read_text(encoding="utf-8"))
keep = set(plan["keep"])
prune = set(plan["pruneCandidates"])
invalid = set(plan["invalidIgnored"])

assert set(expected["recentSeed"]) <= keep
assert set(expected["dailyKeep"]) <= keep
assert set(expected["pruneExpected"]) <= prune
assert expected["invalidName"] in invalid
assert expected["missingReferenceName"] in invalid
assert expected["symlinkName"] not in keep | prune | invalid
assert keep.isdisjoint(prune)
assert len(keep) == 11
for name in expected["pruneExpected"]:
    assert (root / name).is_dir(), "dry-run retention must not delete candidates"
assert (root / expected["symlinkName"]).is_symlink()
PY
}

assert_snapshot_contract() {
  local backup_root="$1"
  local expected_trigger="$2"
  local snapshot

  snapshot="$(
    /usr/bin/find "${backup_root}" \
      -mindepth 1 \
      -maxdepth 2 \
      -type f \
      -name manifest.json \
      -exec /usr/bin/grep -l \
        "\"trigger\": \"${expected_trigger}\"" {} +
  )"
  test "$(printf '%s\n' "${snapshot}" | /usr/bin/grep -c .)" = 1
  snapshot="${snapshot%/manifest.json}"
  test -n "${snapshot}"
  test -f "${snapshot}/SUCCESS"
  test -f "${snapshot}/manifest.json"
  test -f "${snapshot}/database/dump"
  test -f "${snapshot}/database/record-counts.tsv"
  test -f "${snapshot}/files/database-references.txt"
  test -f "${snapshot}/files/sha256.txt"
  test -f "${backup_root}/retention-plan.json"
  "${PYTHON_BIN:-/usr/bin/python3}" - \
    "${snapshot}" \
    "${backup_root}/retention-plan.json" \
    "${expected_trigger}" \
    "${APPLICATION_SHA}" \
    "${CONFIG_DIGEST}" <<'PY'
import hashlib
import json
import pathlib
import sys

snapshot = pathlib.Path(sys.argv[1])
plan_path = pathlib.Path(sys.argv[2])
trigger, application_sha, config_digest = sys.argv[3:]
manifest = json.loads((snapshot / "manifest.json").read_text(encoding="utf-8"))
dump = snapshot / manifest["database"]["dumpFile"]
assert manifest["schemaVersion"] == 1
assert manifest["status"] == "success"
assert manifest["project"] == "cubing-hub"
assert manifest["environment"] == "production"
assert manifest["trigger"] == trigger
assert manifest["source"]["applicationSha"] == application_sha
assert manifest["source"]["runtimeConfigDigest"] == config_digest
assert manifest["database"]["engine"] == "mysql"
assert manifest["database"]["version"] == "8.0.46"
assert manifest["database"]["recordCounts"] == {"post_attachments": 1, "users": 1}
assert manifest["database"]["recordCountsSource"] == "database/dump"
assert manifest["database"]["bytes"] == dump.stat().st_size
assert manifest["database"]["sha256"] == hashlib.sha256(dump.read_bytes()).hexdigest()
assert manifest["files"]["enabled"] is True
assert manifest["files"]["count"] >= 0
references = manifest["files"]["databaseReferences"]
reference_file = snapshot / references["manifest"]
assert references["source"] == "database/dump"
assert references["count"] == manifest["database"]["recordCounts"]["post_attachments"]
assert references["sha256"] == hashlib.sha256(reference_file.read_bytes()).hexdigest()
assert reference_file.read_text(encoding="utf-8") == "image-one.jpg\n"
assert manifest["redis"]["included"] is False
plan = json.loads(plan_path.read_text(encoding="utf-8"))
assert plan["mode"] == "dry-run"
assert plan["policy"] == {
    "dailyAtOrAfterKst": "06:00",
    "dailyDays": 7,
    "recent": 4,
}
assert snapshot.name in plan["keep"]
assert isinstance(plan["pruneCandidates"], list)
PY
  test "$(
    /usr/bin/find "${backup_root}-icloud" \
      -mindepth 1 \
      -maxdepth 1 \
      -type f \
      -name 'cubing-hub-production-*.tar.age' \
      | /usr/bin/wc -l \
      | /usr/bin/tr -d ' '
  )" = 1
  test "$(
    /usr/bin/find "${backup_root}-offsite" \
      -mindepth 1 \
      -maxdepth 1 \
      -print \
      | /usr/bin/wc -l \
      | /usr/bin/tr -d ' '
  )" = 0
}

v2_app="${test_root}/v2-app"
v2_backups="${test_root}/v2-backups"
v2_post_images="${test_root}/v2-post-images"
v2_script="${test_root}/v2-backup.sh"
v2_retention_expected="${test_root}/v2-retention-expected.json"
prepare_app "${v2_app}" "${v2_post_images}"
printf '%s\n' \
  'LOCAL_HEARTBEAT_URL=https://heartbeat.invalid/api/push/cubing-local-test' \
  'ICLOUD_STAGE_HEARTBEAT_URL=https://heartbeat.invalid/api/push/cubing-icloud-test' \
  >"${v2_app}/backup-heartbeats.conf"
/bin/chmod 600 "${v2_app}/backup-heartbeats.conf"
printf 'image-one\n' >"${v2_post_images}/image-one.jpg"
/bin/mkdir -p "${v2_backups}"
seed_retention_matrix "${v2_backups}" "${v2_retention_expected}"
prepare_script "${v2_app}" "${v2_backups}" "${v2_script}"
prepare_runtime_state "${v2_app}" "${v2_script}"

COMPOSE_PROJECT_NAME=ambient-project \
POST_IMAGES_HOST_DIR="${test_root}/ambient-post-images" \
DOCKER_LOG="${docker_log}" \
HEARTBEAT_LOG="${heartbeat_log}" \
MOCK_POST_IMAGES_DIR="${v2_post_images}" \
  "${v2_script}" >/dev/null
expected_release="${v2_app}/runtime-config/releases/${CONFIG_DIGEST#sha256:}"
/usr/bin/grep -Fq -- "--project-name cubing-hub" "${docker_log}"
/usr/bin/grep -Fq -- "--project-directory ${expected_release}" "${docker_log}"
/usr/bin/grep -Fq -- "--file ${expected_release}/compose.yaml" "${docker_log}"
if /usr/bin/grep -Eq 'BACKUP_QUERY=(attachment-keys|record-counts)' "${docker_log}"; then
  printf 'Snapshot metadata must not be queried from the live database after dump\n' >&2
  exit 1
fi
test "$(find "${v2_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" -ge 1
assert_snapshot_contract "${v2_backups}" scheduled
assert_retention_matrix "${v2_backups}" "${v2_retention_expected}"
test "$(/usr/bin/wc -l <"${heartbeat_log}" | /usr/bin/tr -d ' ')" = 2
/usr/bin/grep -Fq '/api/push/cubing-local-test' "${heartbeat_log}"
/usr/bin/grep -Fq '/api/push/cubing-icloud-test' "${heartbeat_log}"

missing_reference_app="${test_root}/missing-reference-app"
missing_reference_backups="${test_root}/missing-reference-backups"
missing_reference_post_images="${test_root}/missing-reference-post-images"
missing_reference_script="${test_root}/missing-reference-backup.sh"
missing_reference_dump="${test_root}/missing-reference-dump.sql"
write_mysql_dump_fixture "${missing_reference_dump}" missing.jpg
prepare_app "${missing_reference_app}" "${missing_reference_post_images}"
/bin/mkdir -p "${missing_reference_backups}"
prepare_script \
  "${missing_reference_app}" \
  "${missing_reference_backups}" \
  "${missing_reference_script}"
prepare_runtime_state "${missing_reference_app}" "${missing_reference_script}"

if MOCK_DUMP_FILE="${missing_reference_dump}" \
  DOCKER_LOG="${docker_log}" \
  MOCK_POST_IMAGES_DIR="${missing_reference_post_images}" \
  "${missing_reference_script}" >/dev/null 2>&1
then
  printf 'backup accepted a dump reference missing from the copied image tree\n' >&2
  exit 1
fi
test "$(find "${missing_reference_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 0

malformed_dump_app="${test_root}/malformed-dump-app"
malformed_dump_backups="${test_root}/malformed-dump-backups"
malformed_dump_post_images="${test_root}/malformed-dump-post-images"
malformed_dump_script="${test_root}/malformed-dump-backup.sh"
malformed_dump_file="${test_root}/malformed-dump.sql"
write_mysql_dump_fixture "${malformed_dump_file}" first.jpg extended
prepare_app "${malformed_dump_app}" "${malformed_dump_post_images}"
printf 'first\n' >"${malformed_dump_post_images}/first.jpg"
printf 'second\n' >"${malformed_dump_post_images}/second.jpg"
/bin/mkdir -p "${malformed_dump_backups}"
prepare_script \
  "${malformed_dump_app}" \
  "${malformed_dump_backups}" \
  "${malformed_dump_script}"
prepare_runtime_state "${malformed_dump_app}" "${malformed_dump_script}"

if MOCK_DUMP_FILE="${malformed_dump_file}" \
  DOCKER_LOG="${docker_log}" \
  MOCK_POST_IMAGES_DIR="${malformed_dump_post_images}" \
  "${malformed_dump_script}" >/dev/null 2>&1
then
  printf 'backup accepted an unexpected multi-row INSERT dump grammar\n' >&2
  exit 1
fi
test "$(find "${malformed_dump_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 0

unsafe_key_app="${test_root}/unsafe-key-app"
unsafe_key_backups="${test_root}/unsafe-key-backups"
unsafe_key_post_images="${test_root}/unsafe-key-post-images"
unsafe_key_script="${test_root}/unsafe-key-backup.sh"
unsafe_key_dump="${test_root}/unsafe-key-dump.sql"
write_mysql_dump_fixture "${unsafe_key_dump}" ../escape.jpg
prepare_app "${unsafe_key_app}" "${unsafe_key_post_images}"
/bin/mkdir -p "${unsafe_key_backups}"
prepare_script \
  "${unsafe_key_app}" \
  "${unsafe_key_backups}" \
  "${unsafe_key_script}"
prepare_runtime_state "${unsafe_key_app}" "${unsafe_key_script}"

if MOCK_DUMP_FILE="${unsafe_key_dump}" \
  DOCKER_LOG="${docker_log}" \
  MOCK_POST_IMAGES_DIR="${unsafe_key_post_images}" \
  "${unsafe_key_script}" >/dev/null 2>&1
then
  printf 'backup accepted an unsafe dump object-key path\n' >&2
  exit 1
fi
test "$(find "${unsafe_key_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 0

legacy_v2_app="${test_root}/legacy-v2-app"
legacy_v2_backups="${test_root}/legacy-v2-backups"
legacy_v2_post_images="${test_root}/legacy-v2-post-images"
legacy_v2_script="${test_root}/legacy-v2-backup.sh"
prepare_app "${legacy_v2_app}" "${legacy_v2_post_images}"
printf 'image-one\n' >"${legacy_v2_post_images}/image-one.jpg"
/bin/mkdir -p "${legacy_v2_backups}"
prepare_script \
  "${legacy_v2_app}" \
  "${legacy_v2_backups}" \
  "${legacy_v2_script}"
prepare_runtime_state "${legacy_v2_app}" "${legacy_v2_script}" false

: >"${docker_log}"
DOCKER_LOG="${docker_log}" \
MOCK_POST_IMAGES_DIR="${legacy_v2_post_images}" \
  "${legacy_v2_script}" --trigger predeploy >/dev/null
legacy_v2_release="${legacy_v2_app}/runtime-config/releases/${CONFIG_DIGEST#sha256:}"
/usr/bin/grep -Fq -- "--file ${legacy_v2_release}/compose.yaml" "${docker_log}"
test "$(find "${legacy_v2_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 1
assert_snapshot_contract "${legacy_v2_backups}" predeploy

unsafe_app="${test_root}/unsafe-app"
unsafe_backups="${test_root}/unsafe-backups"
unsafe_post_images="${test_root}/unsafe-post-images"
unsafe_script="${test_root}/unsafe-backup.sh"
prepare_app "${unsafe_app}" "${unsafe_post_images}"
/bin/mkdir -p "${unsafe_backups}"
prepare_script "${unsafe_app}" "${unsafe_backups}" "${unsafe_script}"
prepare_runtime_state "${unsafe_app}" "${unsafe_script}"
/bin/rm -f -- "${unsafe_app}/runtime-config/current"
/bin/ln -s releases/not-the-verified-release "${unsafe_app}/runtime-config/current"

if DOCKER_LOG="${docker_log}" \
  MOCK_POST_IMAGES_DIR="${unsafe_post_images}" \
  "${unsafe_script}" >/dev/null 2>&1
then
  printf 'backup unexpectedly accepted a current pointer that disagrees with state\n' >&2
  exit 1
fi
test "$(find "${unsafe_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 0

tampered_app="${test_root}/tampered-app"
tampered_backups="${test_root}/tampered-backups"
tampered_post_images="${test_root}/tampered-post-images"
tampered_script="${test_root}/tampered-backup.sh"
prepare_app "${tampered_app}" "${tampered_post_images}"
/bin/mkdir -p "${tampered_backups}"
prepare_script "${tampered_app}" "${tampered_backups}" "${tampered_script}"
prepare_runtime_state "${tampered_app}" "${tampered_script}"
printf '\n# tampered after verification\n' \
  >>"${tampered_app}/runtime-config/releases/${CONFIG_DIGEST#sha256:}/compose.yaml"

if DOCKER_LOG="${docker_log}" \
  MOCK_POST_IMAGES_DIR="${tampered_post_images}" \
  "${tampered_script}" >/dev/null 2>&1
then
  printf 'backup unexpectedly accepted a tampered runtime release\n' >&2
  exit 1
fi
test "$(find "${tampered_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 0

symlink_state_app="${test_root}/symlink-state-app"
symlink_state_backups="${test_root}/symlink-state-backups"
symlink_state_post_images="${test_root}/symlink-state-post-images"
symlink_state_script="${test_root}/symlink-state-backup.sh"
prepare_app "${symlink_state_app}" "${symlink_state_post_images}"
/bin/mkdir -p "${symlink_state_backups}"
prepare_script \
  "${symlink_state_app}" \
  "${symlink_state_backups}" \
  "${symlink_state_script}"
prepare_runtime_state "${symlink_state_app}" "${symlink_state_script}"
/bin/mv \
  "${symlink_state_app}/runtime-config/state" \
  "${symlink_state_app}/runtime-config/state.target"
/bin/ln -s state.target "${symlink_state_app}/runtime-config/state"

if DOCKER_LOG="${docker_log}" \
  MOCK_POST_IMAGES_DIR="${symlink_state_post_images}" \
  "${symlink_state_script}" >/dev/null 2>&1
then
  printf 'backup unexpectedly accepted a symlink runtime state\n' >&2
  exit 1
fi
test "$(find "${symlink_state_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 0

invalid_heartbeat_app="${test_root}/invalid-heartbeat-app"
invalid_heartbeat_backups="${test_root}/invalid-heartbeat-backups"
invalid_heartbeat_post_images="${test_root}/invalid-heartbeat-post-images"
invalid_heartbeat_script="${test_root}/invalid-heartbeat-backup.sh"
prepare_app "${invalid_heartbeat_app}" "${invalid_heartbeat_post_images}"
/bin/mkdir -p "${invalid_heartbeat_backups}"
prepare_script \
  "${invalid_heartbeat_app}" \
  "${invalid_heartbeat_backups}" \
  "${invalid_heartbeat_script}"
prepare_runtime_state "${invalid_heartbeat_app}" "${invalid_heartbeat_script}"
printf '%s\n' \
  'LOCAL_HEARTBEAT_URL=https://heartbeat.invalid/api/push/local' \
  'ICLOUD_STAGE_HEARTBEAT_URL=https://heartbeat.invalid/api/push/icloud' \
  >"${invalid_heartbeat_app}/backup-heartbeats.conf"
/bin/chmod 644 "${invalid_heartbeat_app}/backup-heartbeats.conf"

if DOCKER_LOG="${docker_log}" \
  MOCK_POST_IMAGES_DIR="${invalid_heartbeat_post_images}" \
  "${invalid_heartbeat_script}" >/dev/null 2>&1
then
  printf 'backup unexpectedly accepted an insecure heartbeat config mode\n' >&2
  exit 1
fi
test "$(find "${invalid_heartbeat_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 0

orphan_app="${test_root}/orphan-app"
orphan_backups="${test_root}/orphan-backups"
orphan_post_images="${test_root}/orphan-post-images"
orphan_script="${test_root}/orphan-backup.sh"
prepare_app "${orphan_app}" "${orphan_post_images}"
/bin/mkdir -p \
  "${orphan_app}/runtime-config/releases/orphan-release" \
  "${orphan_backups}"
printf 'name: cubing-hub\nservices: {}\n' >"${orphan_app}/compose.yaml"
printf 'RUNTIME_CONFIG_V2=initialized\n' \
  >"${orphan_app}/.runtime-config-v2-initialized"
prepare_script "${orphan_app}" "${orphan_backups}" "${orphan_script}"

if DOCKER_LOG="${docker_log}" \
  MOCK_POST_IMAGES_DIR="${orphan_post_images}" \
  "${orphan_script}" >/dev/null 2>&1
then
  printf 'backup unexpectedly accepted orphan runtime releases without state\n' >&2
  exit 1
fi
test "$(find "${orphan_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 0

legacy_app="${test_root}/legacy-app"
legacy_backups="${test_root}/legacy-backups"
legacy_post_images="${test_root}/legacy-post-images"
legacy_script="${test_root}/legacy-backup.sh"
prepare_app "${legacy_app}" "${legacy_post_images}"
printf 'image-one\n' >"${legacy_post_images}/image-one.jpg"
/bin/mkdir -p \
  "${legacy_app}/runtime-config/releases/bootstrap-candidate" \
  "${legacy_backups}"
printf 'name: cubing-hub\nservices: {}\n' >"${legacy_app}/compose.yaml"
printf 'candidate release retained before first successful v2 state\n' \
  >"${legacy_app}/runtime-config/releases/bootstrap-candidate/candidate"
prepare_script "${legacy_app}" "${legacy_backups}" "${legacy_script}"

: >"${docker_log}"
DOCKER_LOG="${docker_log}" \
MOCK_POST_IMAGES_DIR="${legacy_post_images}" \
  "${legacy_script}" >/dev/null
/usr/bin/grep -Fq -- "--project-name cubing-hub" "${docker_log}"
/usr/bin/grep -Fq -- "--project-directory ${legacy_app}" "${docker_log}"
/usr/bin/grep -Fq -- "--file ${legacy_app}/compose.yaml" "${docker_log}"

printf 'Cubing Hub production backup selection tests passed\n'
