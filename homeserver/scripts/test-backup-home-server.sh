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
readonly TARGET_CONFIG_DIGEST=sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
readonly TARGET_CONFIG_SHA=4444444444444444444444444444444444444444
readonly MYSQL_IMAGE_DIGEST=8484848484848484848484848484848484848484848484848484848484848484
readonly MYSQL_IMAGE_ID=sha256:8484848484848484848484848484848484848484848484848484848484848484
readonly MYSQL_IMAGE_EXACT="mysql:8.4.11@sha256:${MYSQL_IMAGE_DIGEST}"
readonly MYSQL_80_IMAGE_DIGEST=8080808080808080808080808080808080808080808080808080808080808080
readonly MYSQL_80_IMAGE_ID=sha256:8080808080808080808080808080808080808080808080808080808080808080
readonly MYSQL_80_IMAGE_EXACT="mysql:8.0.46@sha256:${MYSQL_80_IMAGE_DIGEST}"
readonly MYSQL_VOLUME=cubing-hub_mysql-data

test_root="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-backup-test.XXXXXX")"

cleanup() {
  if [[ "$(basename "${test_root}")" == cubing-backup-test.* ]]; then
    /bin/chmod -R u+w "${test_root}" >/dev/null 2>&1 || true
    /bin/rm -rf -- "${test_root}"
  fi
}

trap cleanup EXIT INT TERM

mock_docker="${test_root}/docker"
mock_age="${test_root}/age"
mock_curl="${test_root}/curl"
mock_du="${test_root}/du"
mock_final_move="${test_root}/fail-final-move"
docker_log="${test_root}/docker.log"
event_log="${test_root}/homeops-events.log"
event_reporter="${test_root}/report-homeops-event.py"
heartbeat_log="${test_root}/heartbeat.log"
final_move_log="${test_root}/final-move.log"
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
    'if [[ " $* " == *" image inspect --format {{.Id}} "* ]]; then' \
    '  printf "%s\n" "${FAKE_DB_IMAGE_ID:-sha256:8484848484848484848484848484848484848484848484848484848484848484}"' \
    'elif [[ " $* " == *" image inspect --format {{json .RepoDigests}} "* ]]; then' \
    '  printf "[\"mysql@%s\"]\n" "${FAKE_DB_REPO_DIGEST:-sha256:8484848484848484848484848484848484848484848484848484848484848484}"' \
    'elif [[ " $* " == *" container inspect --format {{.Image}} "* ]]; then' \
    '  printf "%s\n" "${FAKE_DB_IMAGE_ID:-sha256:8484848484848484848484848484848484848484848484848484848484848484}"' \
    'elif [[ " $* " == *" container inspect --format {{range .Mounts}}"* ]]; then' \
    '  printf "%s\n" "${FAKE_DB_VOLUME:-cubing-hub_mysql-data}"' \
    'elif [[ " $* " == *"com.docker.compose.project"* ]]; then' \
    '  printf "cubing-hub\n"' \
    'elif [[ " $* " == *"com.docker.compose.service"* ]]; then' \
    '  printf "db\n"' \
    'elif [[ " $* " == *" container inspect --format {{if .State.Health}}"* ]]; then' \
    '  printf "healthy\n"' \
    'elif [[ " $* " == *" ps -a --no-trunc --filter volume=cubing-hub_mysql-data "* ]]; then' \
    '  printf "mock-db-container\n"' \
    'elif [[ " $* " != *" --project-name cubing-hub "* ]]; then' \
    '  printf "Compose project name was not pinned: %s\n" "$*" >&2' \
    '  exit 1' \
    'elif [[ " $* " == *" config --format json "* ]]; then' \
    '  if [[ -n "${POST_IMAGES_HOST_DIR+x}" ]]; then' \
    '    printf "ambient POST_IMAGES_HOST_DIR reached Compose rendering\n" >&2' \
    '    exit 1' \
    '  fi' \
    '  printf '\''{"services":{"db":{"image":"%s"},"api":{"volumes":[{"type":"bind","source":"%s","target":"/data/post-images"}]},"web":{"volumes":[{"type":"bind","source":"%s","target":"/data/post-images"}]}},"volumes":{"mysql-data":{"name":"%s"}}}\n'\'' "${FAKE_DB_CONFIG_IMAGE:-mysql:8.4.11}" "${MOCK_POST_IMAGES_DIR}" "${MOCK_POST_IMAGES_DIR}" "${FAKE_DB_VOLUME:-cubing-hub_mysql-data}"' \
    'elif [[ " $* " == *" ps --all --format json "* ]]; then' \
    '  printf '\''[{"Service":"api","State":"%s","Health":""},{"Service":"db","State":"running","Health":"%s"},{"Service":"redis","State":"running","Health":"%s"},{"Service":"web","State":"%s","Health":""}]\n'\'' "${FAKE_API_STATE:-exited}" "${FAKE_DB_HEALTH:-healthy}" "${FAKE_REDIS_HEALTH:-healthy}" "${FAKE_WEB_STATE:-exited}"' \
    'elif [[ " $* " == *" ps --status running --services "* ]]; then' \
    '  printf "%s\n" "${FAKE_RUNNING_SERVICES:-db}"' \
    'elif [[ " $* " == *" ps -q db "* ]]; then' \
    '  printf "mock-db-container\n"' \
    'elif [[ " $* " == *" BACKUP_QUERY=maintenance-source-version "* ]]; then' \
    '  printf "%s\n" "${FAKE_DB_VERSION:-8.0.46}"' \
    'elif [[ "$*" == *"BACKUP_QUERY=dump"* ]]; then' \
    '  /bin/cat "${MOCK_DUMP_FILE}"' \
    'elif [[ "$*" == *"BACKUP_QUERY=version"* ]]; then' \
    '  printf "%s\n" "${FAKE_DB_VERSION:-8.4.11}"' \
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
: >"${event_log}"
{
  printf '#!/bin/bash\n'
  printf 'printf "%%s " "$1" >>"%s"\n' "${event_log}"
  printf '/bin/cat >>"%s"\n' "${event_log}"
  printf 'printf "\\n" >>"%s"\n' "${event_log}"
} >"${event_reporter}"
/bin/chmod 700 "${event_reporter}"

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

{
  printf '%s\n' \
    '#!/bin/bash' \
    'set -Eeuo pipefail' \
    'if [[ "${FAIL_HOMEOPS_SIZE:-false}" == true ]]; then' \
    '  exit 75' \
    'fi' \
    'exec /usr/bin/du "$@"'
} >"${mock_du}"
/bin/chmod 700 "${mock_du}"

{
  printf '%s\n' \
    '#!/bin/bash' \
    'set -Eeuo pipefail' \
    'printf "%s\n" "$*" >>"${FINAL_MOVE_LOG}"' \
    'exit 75'
} >"${mock_final_move}"
/bin/chmod 700 "${mock_final_move}"
: >"${final_move_log}"

prepare_script() {
  local app_dir="$1"
  local backup_root="$2"
  local target_script="$3"
  local final_move_bin="${4:-/bin/mv}"

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
    -e "s#readonly DU_BIN=/usr/bin/du#readonly DU_BIN=${mock_du}#" \
    -e "s#readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub#readonly APP_DIR=${app_dir}#" \
    -e "s#readonly BACKUP_BOOTSTRAP_SCRIPT=/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh#readonly BACKUP_BOOTSTRAP_SCRIPT=${target_script}#" \
    -e "s#readonly BACKUP_ROOT=${PRODUCTION_BACKUP_ROOT}#readonly BACKUP_ROOT=${backup_root}#" \
    -e "s#readonly HOMEOPS_EVENT_REPORTER=/Users/homeserver/Server/apps/homeops/runtime-config/current/scripts/report-homeops-event.py#readonly HOMEOPS_EVENT_REPORTER=${event_reporter}#" \
    -e "s#readonly OFFSITE_STAGING_ROOT=${PRODUCTION_OFFSITE_ROOT}#readonly OFFSITE_STAGING_ROOT=${backup_root}-offsite#" \
    -e "s#readonly ICLOUD_ROOT='${PRODUCTION_ICLOUD_ROOT}'#readonly ICLOUD_ROOT='${backup_root}-icloud'#" \
    -e "s#/bin/mv \"\${offsite_partial}\" \"\${icloud_final}\"#${final_move_bin} \"\${offsite_partial}\" \"\${icloud_final}\"#" \
    "${SOURCE_SCRIPT}" >"${target_script}"
  if ! /usr/bin/grep -Fqx "readonly BACKUP_ROOT=${backup_root}" "${target_script}"; then
    printf 'Test backup path substitution failed: %s\n' "${backup_root}" >&2
    exit 1
  fi
  if [[ "$(/usr/bin/grep -Fc \
      "${final_move_bin} \"\${offsite_partial}\" \"\${icloud_final}\"" \
      "${target_script}")" != 1 ]]
  then
    printf 'Final iCloud move injection contract did not match exactly once\n' >&2
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
  {
    printf 'API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:%s\n' "${APPLICATION_SHA}"
    printf 'WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:%s\n' "${APPLICATION_SHA}"
    printf 'DB_IMAGE=%s\n' "${MYSQL_IMAGE_EXACT}"
    printf 'DB_VOLUME_NAME=%s\n' "${MYSQL_VOLUME}"
    printf 'POST_IMAGES_HOST_DIR=%s\n' "${post_images_dir}"
  } >"${app_dir}/.env"
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
            "version": "8.4.11",
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

unreadable_time = dt.datetime.combine(
    today - dt.timedelta(days=12), dt.time(6, 5), tzinfo=kst
)
unreadable_name = write_valid(unreadable_time)
unreadable_manifest_path = root / unreadable_name / "manifest.json"
unreadable_manifest_sha256 = hashlib.sha256(
    unreadable_manifest_path.read_bytes()
).hexdigest()
unreadable_manifest_path.chmod(0)
try:
    unreadable_manifest_path.read_text(encoding="utf-8")
except OSError:
    pass
else:
    raise RuntimeError("Unreadable retention fixture is readable")

expected_path.write_text(
    json.dumps(
        {
            "recentSeed": recent_seed,
            "dailyKeep": daily_keep,
            "pruneExpected": prune_expected,
            "invalidName": invalid_name,
            "missingReferenceName": missing_reference_name,
            "symlinkName": symlink_name,
            "unreadableName": unreadable_name,
            "unreadableManifestSha256": unreadable_manifest_sha256,
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
import hashlib
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
assert expected["unreadableName"] in invalid
assert expected["symlinkName"] not in keep | prune | invalid
assert expected["unreadableName"] not in keep | prune
assert keep.isdisjoint(prune)
assert len(keep) == 11
for name in expected["pruneExpected"]:
    assert (root / name).is_dir(), "dry-run retention must not delete candidates"
assert (root / expected["symlinkName"]).is_symlink()
unreadable_manifest = root / expected["unreadableName"] / "manifest.json"
assert unreadable_manifest.is_file()
assert unreadable_manifest.stat().st_mode & 0o777 == 0
unreadable_manifest.chmod(0o600)
assert hashlib.sha256(unreadable_manifest.read_bytes()).hexdigest() == (
    expected["unreadableManifestSha256"]
)
PY
}

assert_snapshot_contract() {
  local backup_root="$1"
  local expected_trigger="$2"
  local expected_offsite_state="${3:-published}"
  local retained_ciphertext
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
    "${CONFIG_DIGEST}" \
    "${MYSQL_IMAGE_EXACT}" \
    "${MYSQL_IMAGE_ID}" \
    "${MYSQL_VOLUME}" <<'PY'
import hashlib
import json
import pathlib
import sys

snapshot = pathlib.Path(sys.argv[1])
plan_path = pathlib.Path(sys.argv[2])
(
    trigger,
    application_sha,
    config_digest,
    database_image,
    database_image_id,
    database_volume,
) = sys.argv[3:]
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
assert manifest["database"]["version"] == "8.4.11"
assert manifest["database"]["image"] == database_image
assert manifest["database"]["imageId"] == database_image_id
assert manifest["database"]["volume"] == database_volume
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
  case "${expected_offsite_state}" in
    published)
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
      ;;
    publish-failed)
      test "$(
        /usr/bin/find "${backup_root}-icloud" \
          -mindepth 1 \
          -maxdepth 1 \
          -print \
          | /usr/bin/wc -l \
          | /usr/bin/tr -d ' '
      )" = 0
      retained_ciphertext="$(
        /usr/bin/find "${backup_root}-offsite" \
          -mindepth 1 \
          -maxdepth 1 \
          -type f \
          -name 'cubing-hub-production-*.tar.age'
      )"
      test "$(printf '%s\n' "${retained_ciphertext}" | /usr/bin/grep -c .)" = 1
      /usr/bin/head -n 1 "${retained_ciphertext}" \
        | /usr/bin/grep -Fqx 'age-encryption.org/v1'
      ;;
    *)
      printf 'Unsupported expected offsite state: %s\n' \
        "${expected_offsite_state}" \
        >&2
      exit 1
      ;;
  esac
}

assert_maintenance_snapshot_contract() {
  local backup_root="$1"
  local evidence_id="$2"
  local quiesced_at="$3"
  local evidence_file="$4"
  local snapshot

  snapshot="$(
    /usr/bin/find "${backup_root}" \
      -mindepth 1 \
      -maxdepth 2 \
      -type f \
      -name manifest.json \
      -exec /usr/bin/grep -l '"trigger": "maintenance-final"' {} +
  )"
  test "$(printf '%s\n' "${snapshot}" | /usr/bin/grep -c .)" = 1
  snapshot="${snapshot%/manifest.json}"
  /usr/bin/python3 - \
    "${snapshot}" \
    "${APPLICATION_SHA}" \
    "${CONFIG_DIGEST}" \
    "${MYSQL_80_IMAGE_EXACT}" \
    "${MYSQL_80_IMAGE_ID}" \
    "${MYSQL_VOLUME}" \
    "${evidence_id}" \
    "${TARGET_CONFIG_SHA}" \
    "${TARGET_CONFIG_DIGEST}" \
    "${quiesced_at}" \
    "${evidence_file}" <<'PY'
import datetime as dt
import hashlib
import json
import pathlib
import sys

(
    snapshot_value,
    application_sha,
    source_runtime_digest,
    database_image,
    database_image_id,
    database_volume,
    worker_evidence_id,
    worker_runtime_revision,
    worker_runtime_digest,
    quiesced_at_value,
    evidence_file_value,
) = sys.argv[1:]
snapshot = pathlib.Path(snapshot_value)
manifest = json.loads((snapshot / "manifest.json").read_text(encoding="utf-8"))
evidence = dict(
    line.split("=", 1)
    for line in pathlib.Path(evidence_file_value).read_text(
        encoding="utf-8"
    ).splitlines()
)
dump = snapshot / manifest["database"]["dumpFile"]
started_at = dt.datetime.strptime(manifest["startedAt"], "%Y-%m-%dT%H:%M:%SZ")
quiesced_at = dt.datetime.strptime(quiesced_at_value, "%Y-%m-%dT%H:%M:%SZ")
assert (snapshot / "SUCCESS").is_file()
assert manifest["trigger"] == "maintenance-final"
assert manifest["source"] == {
    "applicationSha": application_sha,
    "runtimeConfigDigest": source_runtime_digest,
}
assert manifest["database"]["engine"] == "mysql"
assert manifest["database"]["version"] == "8.0.46"
assert manifest["database"]["image"] == database_image
assert manifest["database"]["imageId"] == database_image_id
assert manifest["database"]["volume"] == database_volume
assert manifest["database"]["sha256"] == hashlib.sha256(dump.read_bytes()).hexdigest()
assert manifest["maintenanceFinal"]["backupWorkerEvidenceId"] == worker_evidence_id
assert manifest["maintenanceFinal"]["runtimeConfigRevision"] == worker_runtime_revision
assert manifest["maintenanceFinal"]["runtimeConfigDigest"] == worker_runtime_digest
assert manifest["maintenanceFinal"]["quiesceEvidenceId"] == evidence["QUIESCE_EVIDENCE_ID"]
assert (
    manifest["maintenanceFinal"]["runtimeConfigContentSha256"]
    == evidence["TARGET_RUNTIME_CONFIG_CONTENT_SHA256"]
)
assert (
    manifest["maintenanceFinal"]["backupWorkerSha256"]
    == evidence["BACKUP_WORKER_SHA256"]
)
assert started_at > quiesced_at
PY
}

v2_app="${test_root}/v2-app"
v2_backups="${test_root}/v2-backups"
v2_post_images="${test_root}/v2-post-images"
v2_script="${test_root}/v2-backup.sh"
v2_output="${test_root}/v2-backup.out"
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

set +e
"${v2_script}" --worker-evidence ../../arbitrary-worker >/dev/null 2>&1
arbitrary_worker_path_exit_code="$?"
"${v2_script}" --trigger maintenance-final >/dev/null 2>&1
missing_worker_evidence_exit_code="$?"
set -e
if [[ "${arbitrary_worker_path_exit_code}" -ne 64 ]] \
  || [[ "${missing_worker_evidence_exit_code}" -ne 64 ]]
then
  printf 'Backup worker must reject unsafe or incomplete maintenance overrides\n' >&2
  exit 1
fi

preflight_failure_app="${test_root}/preflight-failure-app"
preflight_failure_backups="${test_root}/preflight-failure-backups"
preflight_failure_post_images="${test_root}/preflight-failure-post-images"
preflight_failure_script="${test_root}/preflight-failure-backup.sh"
/bin/mkdir -p "${preflight_failure_backups}"
prepare_app "${preflight_failure_app}" "${preflight_failure_post_images}"
prepare_script \
  "${preflight_failure_app}" \
  "${preflight_failure_backups}" \
  "${preflight_failure_script}"
: >"${event_log}"
set +e
DOCKER_LOG="${docker_log}" \
HOMEOPS_EVENT_LOG="${event_log}" \
FAKE_RUNNING_SERVICES=redis \
MOCK_POST_IMAGES_DIR="${preflight_failure_post_images}" \
  "${preflight_failure_script}" >/dev/null 2>&1
preflight_failure_exit_code="$?"
set -e
if [[ "${preflight_failure_exit_code}" -ne 1 ]]; then
  printf 'Backup DB preflight failure must fail\n' >&2
  exit 1
fi
/usr/bin/grep -Fq 'backups {"eventKey":"cubing-hub:backup:' "${event_log}"
/usr/bin/grep -Fq '"status":"RUNNING"' "${event_log}"
/usr/bin/grep -Fq '"status":"FAILED"' "${event_log}"

if ! COMPOSE_PROJECT_NAME=ambient-project \
  POST_IMAGES_HOST_DIR="${test_root}/ambient-post-images" \
  DOCKER_LOG="${docker_log}" \
  HEARTBEAT_LOG="${heartbeat_log}" \
  FAIL_HOMEOPS_SIZE=true \
  MOCK_POST_IMAGES_DIR="${v2_post_images}" \
    "${v2_script}" >"${v2_output}" 2>&1
then
  /bin/cat "${v2_output}" >&2
  exit 1
fi
expected_release="${v2_app}/runtime-config/releases/${CONFIG_DIGEST#sha256:}"
/usr/bin/grep -Fq -- "--project-name cubing-hub" "${docker_log}"
/usr/bin/grep -Fq -- "--project-directory ${expected_release}" "${docker_log}"
/usr/bin/grep -Fq -- "--file ${expected_release}/compose.yaml" "${docker_log}"
if /usr/bin/grep -Eq 'BACKUP_QUERY=(attachment-keys|record-counts)' "${docker_log}"; then
  printf 'Snapshot metadata must not be queried from the live database after dump\n' >&2
  exit 1
fi
test "$(find "${v2_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" -ge 1
assert_retention_matrix "${v2_backups}" "${v2_retention_expected}"
assert_snapshot_contract "${v2_backups}" scheduled
test "$(/usr/bin/wc -l <"${heartbeat_log}" | /usr/bin/tr -d ' ')" = 2
/usr/bin/grep -Fq '/api/push/cubing-local-test' "${heartbeat_log}"
/usr/bin/grep -Fq '/api/push/cubing-icloud-test' "${heartbeat_log}"
/usr/bin/grep -Fq 'HomeOps backup size could not be measured' "${v2_output}"
/usr/bin/grep -Fq '"status":"SUCCESS"' "${event_log}"
/usr/bin/grep -Fq '"sizeBytes":null' "${event_log}"

final_move_scheduled_app="${test_root}/final-move-scheduled-app"
final_move_scheduled_backups="${test_root}/final-move-scheduled-backups"
final_move_scheduled_post_images="${test_root}/final-move-scheduled-post-images"
final_move_scheduled_script="${test_root}/final-move-scheduled-backup.sh"
final_move_scheduled_output="${test_root}/final-move-scheduled.out"
prepare_app \
  "${final_move_scheduled_app}" \
  "${final_move_scheduled_post_images}"
printf 'image-one\n' >"${final_move_scheduled_post_images}/image-one.jpg"
/bin/mkdir -p "${final_move_scheduled_backups}"
printf '%s\n' \
  'LOCAL_HEARTBEAT_URL=https://heartbeat.invalid/api/push/cubing-local-test' \
  'ICLOUD_STAGE_HEARTBEAT_URL=https://heartbeat.invalid/api/push/cubing-icloud-test' \
  >"${final_move_scheduled_app}/backup-heartbeats.conf"
/bin/chmod 600 "${final_move_scheduled_app}/backup-heartbeats.conf"
prepare_script \
  "${final_move_scheduled_app}" \
  "${final_move_scheduled_backups}" \
  "${final_move_scheduled_script}" \
  "${mock_final_move}"
prepare_runtime_state \
  "${final_move_scheduled_app}" \
  "${final_move_scheduled_script}"
: >"${heartbeat_log}"
: >"${final_move_log}"

if DOCKER_LOG="${docker_log}" \
  HEARTBEAT_LOG="${heartbeat_log}" \
  FINAL_MOVE_LOG="${final_move_log}" \
  MOCK_POST_IMAGES_DIR="${final_move_scheduled_post_images}" \
  "${final_move_scheduled_script}" >"${final_move_scheduled_output}" 2>&1
then
  printf 'scheduled backup accepted a failed final iCloud move\n' >&2
  exit 1
fi
test "$(/usr/bin/wc -l <"${final_move_log}" | /usr/bin/tr -d ' ')" = 1
/usr/bin/grep -Fq \
  'Offsite stage failed: iCloud final publish failed' \
  "${final_move_scheduled_output}"
/usr/bin/grep -Fq \
  'local snapshot succeeded but offsite staging failed' \
  "${final_move_scheduled_output}"
if /usr/bin/grep -Fq 'OFFSITE_QUEUED=' "${final_move_scheduled_output}"; then
  printf 'scheduled backup announced a failed iCloud handoff\n' >&2
  exit 1
fi
assert_snapshot_contract \
  "${final_move_scheduled_backups}" \
  scheduled \
  publish-failed
test "$(/usr/bin/wc -l <"${heartbeat_log}" | /usr/bin/tr -d ' ')" = 1
/usr/bin/grep -Fq '/api/push/cubing-local-test' "${heartbeat_log}"
if /usr/bin/grep -Fq '/api/push/cubing-icloud-test' "${heartbeat_log}"; then
  printf 'scheduled backup sent iCloud heartbeat after final move failure\n' >&2
  exit 1
fi

final_move_predeploy_app="${test_root}/final-move-predeploy-app"
final_move_predeploy_backups="${test_root}/final-move-predeploy-backups"
final_move_predeploy_post_images="${test_root}/final-move-predeploy-post-images"
final_move_predeploy_script="${test_root}/final-move-predeploy-backup.sh"
final_move_predeploy_output="${test_root}/final-move-predeploy.out"
prepare_app \
  "${final_move_predeploy_app}" \
  "${final_move_predeploy_post_images}"
printf 'image-one\n' >"${final_move_predeploy_post_images}/image-one.jpg"
/bin/mkdir -p "${final_move_predeploy_backups}"
printf '%s\n' \
  'LOCAL_HEARTBEAT_URL=https://heartbeat.invalid/api/push/cubing-local-test' \
  'ICLOUD_STAGE_HEARTBEAT_URL=https://heartbeat.invalid/api/push/cubing-icloud-test' \
  >"${final_move_predeploy_app}/backup-heartbeats.conf"
/bin/chmod 600 "${final_move_predeploy_app}/backup-heartbeats.conf"
prepare_script \
  "${final_move_predeploy_app}" \
  "${final_move_predeploy_backups}" \
  "${final_move_predeploy_script}" \
  "${mock_final_move}"
prepare_runtime_state \
  "${final_move_predeploy_app}" \
  "${final_move_predeploy_script}"
: >"${heartbeat_log}"
: >"${final_move_log}"

DOCKER_LOG="${docker_log}" \
HEARTBEAT_LOG="${heartbeat_log}" \
FINAL_MOVE_LOG="${final_move_log}" \
MOCK_POST_IMAGES_DIR="${final_move_predeploy_post_images}" \
  "${final_move_predeploy_script}" \
    --trigger predeploy \
    >"${final_move_predeploy_output}" 2>&1
test "$(/usr/bin/wc -l <"${final_move_log}" | /usr/bin/tr -d ' ')" = 1
/usr/bin/grep -Fq \
  'Offsite stage failed: iCloud final publish failed' \
  "${final_move_predeploy_output}"
/usr/bin/grep -Fq \
  'Predeploy continues because the verified local snapshot succeeded' \
  "${final_move_predeploy_output}"
if /usr/bin/grep -Fq 'OFFSITE_QUEUED=' "${final_move_predeploy_output}"; then
  printf 'predeploy backup announced a failed iCloud handoff\n' >&2
  exit 1
fi
assert_snapshot_contract \
  "${final_move_predeploy_backups}" \
  predeploy \
  publish-failed
test "$(/usr/bin/wc -l <"${heartbeat_log}" | /usr/bin/tr -d ' ')" = 1
/usr/bin/grep -Fq '/api/push/cubing-local-test' "${heartbeat_log}"
if /usr/bin/grep -Fq '/api/push/cubing-icloud-test' "${heartbeat_log}"; then
  printf 'predeploy backup sent iCloud heartbeat after final move failure\n' >&2
  exit 1
fi

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

# A maintenance final snapshot executes the exact staged target worker while
# reading the still-active source runtime, source DB, and source post-image
# directory. The target runtime is worker-code provenance, never backup source
# provenance or runtime activation.
maintenance_app="${test_root}/maintenance-app"
maintenance_backups="${test_root}/maintenance-backups"
maintenance_post_images="${test_root}/maintenance-post-images"
maintenance_current_script="${test_root}/maintenance-current-backup.sh"
maintenance_target_release="${maintenance_app}/runtime-config/releases/${TARGET_CONFIG_DIGEST#sha256:}"
maintenance_target_script="${maintenance_target_release}/scripts/backup-cubing-hub.sh"
maintenance_docker_log="${test_root}/maintenance-docker.log"
prepare_app "${maintenance_app}" "${maintenance_post_images}"
printf 'image-one\n' >"${maintenance_post_images}/image-one.jpg"
/bin/mkdir -p "${maintenance_backups}"
prepare_script \
  "${maintenance_app}" \
  "${maintenance_backups}" \
  "${maintenance_current_script}"
prepare_runtime_state \
  "${maintenance_app}" \
  "${maintenance_current_script}"
{
  printf 'API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:%s\n' "${APPLICATION_SHA}"
  printf 'WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:%s\n' "${APPLICATION_SHA}"
  printf 'DB_IMAGE=%s\n' "${MYSQL_80_IMAGE_EXACT}"
  printf 'DB_VOLUME_NAME=%s\n' "${MYSQL_VOLUME}"
  printf 'POST_IMAGES_HOST_DIR=%s\n' "${maintenance_post_images}"
} >"${maintenance_app}/.env"

/bin/mkdir -p \
  "${maintenance_target_release}/nginx" \
  "${maintenance_target_release}/scripts"
/bin/cp \
  "${maintenance_app}/runtime-config/releases/${CONFIG_DIGEST#sha256:}/compose.yaml" \
  "${maintenance_target_release}/compose.yaml"
/bin/cp \
  "${maintenance_app}/runtime-config/releases/${CONFIG_DIGEST#sha256:}/nginx/cloudflare-edge-real-ip.conf" \
  "${maintenance_target_release}/nginx/cloudflare-edge-real-ip.conf"
prepare_script \
  "${maintenance_app}" \
  "${maintenance_backups}" \
  "${maintenance_target_script}"
/bin/cp \
  "${SCRIPT_DIR}/deploy-home-server.sh" \
  "${maintenance_target_release}/scripts/deploy-cubing-hub.sh"
/bin/chmod 700 \
  "${maintenance_target_script}" \
  "${maintenance_target_release}/scripts/deploy-cubing-hub.sh"
maintenance_target_content_sha="$(
  runtime_content_sha256 "${maintenance_target_release}"
)"
maintenance_worker_sha="$(
  /usr/bin/shasum -a 256 "${maintenance_target_script}" \
    | /usr/bin/awk '{print $1}'
)"
maintenance_source_content_sha="$(
  /usr/bin/sed -n 's/^RUNTIME_CONFIG_CONTENT_SHA256=//p' \
    "${maintenance_app}/runtime-config/state"
)"
maintenance_root="${maintenance_app}/runtime-config/mysql-maintenance"
maintenance_worker_root="${maintenance_root}/final-backup-workers"
/bin/mkdir -p "${maintenance_worker_root}"
/bin/chmod 700 "${maintenance_root}" "${maintenance_worker_root}"
maintenance_quiesce_temp="${maintenance_root}/quiesce.state.tmp"
{
  printf 'SCHEMA_VERSION=1\n'
  printf 'APPLICATION_REVISION=%s\n' "${APPLICATION_SHA}"
  printf 'API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:%s\n' "${APPLICATION_SHA}"
  printf 'WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:%s\n' "${APPLICATION_SHA}"
  printf 'RUNTIME_CONFIG_REVISION=%s\n' "${CONFIG_SHA}"
  printf 'RUNTIME_CONFIG_DIGEST=%s\n' "${CONFIG_DIGEST}"
  printf 'RUNTIME_CONFIG_CONTENT_SHA256=%s\n' "${maintenance_source_content_sha}"
  printf 'DB_IMAGE_EXACT=%s\n' "${MYSQL_80_IMAGE_EXACT}"
  printf 'DB_IMAGE_ID=%s\n' "${MYSQL_80_IMAGE_ID}"
  printf 'DB_VOLUME=%s\n' "${MYSQL_VOLUME}"
  printf 'MYSQL_VERSION=8.0.46\n'
  printf 'QUIESCED_AT=2000-01-01T00:00:00Z\n'
} >"${maintenance_quiesce_temp}"
maintenance_quiesce_id="$(
  /usr/bin/shasum -a 256 "${maintenance_quiesce_temp}" \
    | /usr/bin/awk '{print $1}'
)"
printf 'EVIDENCE_ID=%s\n' "${maintenance_quiesce_id}" \
  >>"${maintenance_quiesce_temp}"
/bin/mv "${maintenance_quiesce_temp}" "${maintenance_root}/quiesce.state"
/bin/chmod 400 "${maintenance_root}/quiesce.state"

maintenance_worker_temp="${maintenance_root}/worker.env.tmp"
{
  printf 'SCHEMA_VERSION=1\n'
  printf 'PROJECT=cubing-hub\n'
  printf 'QUIESCE_EVIDENCE_ID=%s\n' "${maintenance_quiesce_id}"
  printf 'APPLICATION_REVISION=%s\n' "${APPLICATION_SHA}"
  printf 'API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:%s\n' "${APPLICATION_SHA}"
  printf 'WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:%s\n' "${APPLICATION_SHA}"
  printf 'SOURCE_RUNTIME_CONFIG_REVISION=%s\n' "${CONFIG_SHA}"
  printf 'SOURCE_RUNTIME_CONFIG_DIGEST=%s\n' "${CONFIG_DIGEST}"
  printf 'SOURCE_RUNTIME_CONFIG_CONTENT_SHA256=%s\n' "${maintenance_source_content_sha}"
  printf 'SOURCE_DB_IMAGE_EXACT=%s\n' "${MYSQL_80_IMAGE_EXACT}"
  printf 'SOURCE_DB_IMAGE_ID=%s\n' "${MYSQL_80_IMAGE_ID}"
  printf 'SOURCE_DB_VOLUME=%s\n' "${MYSQL_VOLUME}"
  printf 'SOURCE_MYSQL_VERSION=8.0.46\n'
  printf 'TARGET_RUNTIME_CONFIG_REVISION=%s\n' "${TARGET_CONFIG_SHA}"
  printf 'TARGET_RUNTIME_CONFIG_DIGEST=%s\n' "${TARGET_CONFIG_DIGEST}"
  printf 'TARGET_RUNTIME_CONFIG_CONTENT_SHA256=%s\n' \
    "${maintenance_target_content_sha}"
  printf 'BACKUP_WORKER_SHA256=%s\n' "${maintenance_worker_sha}"
  printf 'CREATED_AT=2026-08-15T00:00:00Z\n'
} >"${maintenance_worker_temp}"
maintenance_worker_evidence_id="$(
  /usr/bin/shasum -a 256 "${maintenance_worker_temp}" \
    | /usr/bin/awk '{print $1}'
)"
printf 'EVIDENCE_ID=%s\n' "${maintenance_worker_evidence_id}" \
  >>"${maintenance_worker_temp}"
maintenance_worker_evidence_dir="${maintenance_worker_root}/${maintenance_worker_evidence_id}"
/bin/mkdir "${maintenance_worker_evidence_dir}"
/bin/mv \
  "${maintenance_worker_temp}" \
  "${maintenance_worker_evidence_dir}/worker.env"
/bin/chmod 400 "${maintenance_worker_evidence_dir}/worker.env"
/bin/chmod 500 "${maintenance_worker_evidence_dir}"

run_maintenance_backup() {
  DOCKER_LOG="${maintenance_docker_log}" \
  MOCK_POST_IMAGES_DIR="${maintenance_post_images}" \
  FAKE_DB_CONFIG_IMAGE=mysql:8.0.46 \
  FAKE_DB_IMAGE_ID="${MYSQL_80_IMAGE_ID}" \
  FAKE_DB_REPO_DIGEST="sha256:${MYSQL_80_IMAGE_DIGEST}" \
  FAKE_DB_VERSION=8.0.46 \
  FAKE_DB_VOLUME="${FAKE_DB_VOLUME:-${MYSQL_VOLUME}}" \
  FAKE_API_STATE="${FAKE_API_STATE:-exited}" \
  FAKE_WEB_STATE="${FAKE_WEB_STATE:-exited}" \
  FAKE_DB_HEALTH="${FAKE_DB_HEALTH:-healthy}" \
  FAKE_REDIS_HEALTH="${FAKE_REDIS_HEALTH:-healthy}" \
    "${maintenance_target_script}" \
      --trigger maintenance-final \
      --worker-evidence "${maintenance_worker_evidence_id}"
}

state_before_final_backup="$(
  /usr/bin/shasum -a 256 "${maintenance_app}/runtime-config/state" \
    | /usr/bin/awk '{print $1}'
)"
env_before_final_backup="$(
  /usr/bin/shasum -a 256 "${maintenance_app}/.env" \
    | /usr/bin/awk '{print $1}'
)"
current_before_final_backup="$(
  /usr/bin/readlink "${maintenance_app}/runtime-config/current"
)"
: >"${maintenance_docker_log}"

if FAKE_API_STATE=running run_maintenance_backup >/dev/null 2>&1; then
  printf 'maintenance final backup accepted a running API write path\n' >&2
  exit 1
fi
printf 'foreign pending\n' >"${maintenance_app}/runtime-config/pending"
if run_maintenance_backup >/dev/null 2>&1; then
  printf 'maintenance final backup accepted pending recovery state\n' >&2
  exit 1
fi
/bin/unlink "${maintenance_app}/runtime-config/pending"
/bin/chmod 600 "${maintenance_worker_evidence_dir}/worker.env"
if run_maintenance_backup >/dev/null 2>&1; then
  printf 'maintenance final backup accepted mutable worker evidence\n' >&2
  exit 1
fi
/bin/chmod 400 "${maintenance_worker_evidence_dir}/worker.env"
/bin/chmod 700 "${maintenance_worker_evidence_dir}"
/bin/mv \
  "${maintenance_worker_evidence_dir}/worker.env" \
  "${maintenance_worker_evidence_dir}/worker.env.hold"
/bin/ln -s \
  worker.env.hold \
  "${maintenance_worker_evidence_dir}/worker.env"
/bin/chmod 500 "${maintenance_worker_evidence_dir}"
if run_maintenance_backup >/dev/null 2>&1; then
  printf 'maintenance final backup accepted symlink worker evidence\n' >&2
  exit 1
fi
/bin/chmod 700 "${maintenance_worker_evidence_dir}"
/bin/unlink "${maintenance_worker_evidence_dir}/worker.env"
/bin/mv \
  "${maintenance_worker_evidence_dir}/worker.env.hold" \
  "${maintenance_worker_evidence_dir}/worker.env"
/bin/chmod 500 "${maintenance_worker_evidence_dir}"
/bin/mv \
  "${maintenance_root}/quiesce.state" \
  "${maintenance_root}/quiesce.state.hold"
if run_maintenance_backup >/dev/null 2>&1; then
  printf 'maintenance final backup accepted missing quiesce evidence\n' >&2
  exit 1
fi
/bin/mv \
  "${maintenance_root}/quiesce.state.hold" \
  "${maintenance_root}/quiesce.state"
if FAKE_DB_VOLUME=cubing-hub_mysql-other run_maintenance_backup >/dev/null 2>&1; then
  printf 'maintenance final backup accepted DB volume drift\n' >&2
  exit 1
fi
if FAKE_DB_HEALTH=unhealthy run_maintenance_backup >/dev/null 2>&1; then
  printf 'maintenance final backup accepted unhealthy source DB\n' >&2
  exit 1
fi

if ! run_maintenance_backup >/dev/null; then
  printf 'maintenance final backup failed with valid staged worker evidence\n' >&2
  exit 1
fi
assert_maintenance_snapshot_contract \
  "${maintenance_backups}" \
  "${maintenance_worker_evidence_id}" \
  2000-01-01T00:00:00Z \
  "${maintenance_worker_evidence_dir}/worker.env"
test "$(/usr/bin/shasum -a 256 "${maintenance_app}/runtime-config/state" | /usr/bin/awk '{print $1}')" \
  = "${state_before_final_backup}"
test "$(/usr/bin/shasum -a 256 "${maintenance_app}/.env" | /usr/bin/awk '{print $1}')" \
  = "${env_before_final_backup}"
test "$(/usr/bin/readlink "${maintenance_app}/runtime-config/current")" \
  = "${current_before_final_backup}"
test ! -e "${maintenance_app}/runtime-config/pending"
if /usr/bin/grep -Eq ' (up|down|stop|start|restart|rm) ' "${maintenance_docker_log}"; then
  printf 'maintenance final backup mutated production container state\n' >&2
  exit 1
fi

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
HOMEOPS_EVENT_LOG="${event_log}" \
  "${legacy_script}" >/dev/null
/usr/bin/grep -Fq -- "--project-name cubing-hub" "${docker_log}"
/usr/bin/grep -Fq -- "--project-directory ${legacy_app}" "${docker_log}"
/usr/bin/grep -Fq -- "--file ${legacy_app}/compose.yaml" "${docker_log}"
/usr/bin/grep -Fq 'backups {"eventKey":"cubing-hub:backup:' "${event_log}"
/usr/bin/grep -Fq '"status":"RUNNING"' "${event_log}"
/usr/bin/grep -Fq '"status":"SUCCESS"' "${event_log}"

printf 'Cubing Hub production backup selection tests passed\n'
