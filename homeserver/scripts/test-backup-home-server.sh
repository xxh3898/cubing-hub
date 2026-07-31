#!/bin/bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1
  pwd -P
)"
readonly SOURCE_SCRIPT="${SCRIPT_DIR}/backup-home-server.sh"
readonly PRODUCTION_BACKUP_ROOT=/Users/homeserver/Server/backups/cubing-hub/data
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
docker_log="${test_root}/docker.log"

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
    'elif [[ " $* " == *"mysqldump"* ]]; then' \
    '  printf "%s\n" "-- mock MySQL dump"' \
    'elif [[ " $* " == *" exec -T db /bin/sh -ceu "* ]]; then' \
    '  :' \
    'else' \
    '  printf "unexpected Docker invocation: %s\n" "$*" >&2' \
    '  exit 1' \
    'fi'
} >"${mock_docker}"
/bin/chmod 700 "${mock_docker}"

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
    -e "s#readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub#readonly APP_DIR=${app_dir}#" \
    -e "s#readonly BACKUP_BOOTSTRAP_SCRIPT=/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh#readonly BACKUP_BOOTSTRAP_SCRIPT=${target_script}#" \
    -e "s#readonly BACKUP_ROOT=${PRODUCTION_BACKUP_ROOT}#readonly BACKUP_ROOT=${backup_root}#" \
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
}

v2_app="${test_root}/v2-app"
v2_backups="${test_root}/v2-backups"
v2_post_images="${test_root}/v2-post-images"
v2_script="${test_root}/v2-backup.sh"
prepare_app "${v2_app}" "${v2_post_images}"
/bin/mkdir -p "${v2_backups}"
prepare_script "${v2_app}" "${v2_backups}" "${v2_script}"
prepare_runtime_state "${v2_app}" "${v2_script}"

COMPOSE_PROJECT_NAME=ambient-project \
POST_IMAGES_HOST_DIR="${test_root}/ambient-post-images" \
DOCKER_LOG="${docker_log}" \
MOCK_POST_IMAGES_DIR="${v2_post_images}" \
  "${v2_script}" >/dev/null
expected_release="${v2_app}/runtime-config/releases/${CONFIG_DIGEST#sha256:}"
/usr/bin/grep -Fq -- "--project-name cubing-hub" "${docker_log}"
/usr/bin/grep -Fq -- "--project-directory ${expected_release}" "${docker_log}"
/usr/bin/grep -Fq -- "--file ${expected_release}/compose.yaml" "${docker_log}"
test "$(find "${v2_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 1

legacy_v2_app="${test_root}/legacy-v2-app"
legacy_v2_backups="${test_root}/legacy-v2-backups"
legacy_v2_post_images="${test_root}/legacy-v2-post-images"
legacy_v2_script="${test_root}/legacy-v2-backup.sh"
prepare_app "${legacy_v2_app}" "${legacy_v2_post_images}"
/bin/mkdir -p "${legacy_v2_backups}"
prepare_script \
  "${legacy_v2_app}" \
  "${legacy_v2_backups}" \
  "${legacy_v2_script}"
prepare_runtime_state "${legacy_v2_app}" "${legacy_v2_script}" false

: >"${docker_log}"
DOCKER_LOG="${docker_log}" \
MOCK_POST_IMAGES_DIR="${legacy_v2_post_images}" \
  "${legacy_v2_script}" >/dev/null
legacy_v2_release="${legacy_v2_app}/runtime-config/releases/${CONFIG_DIGEST#sha256:}"
/usr/bin/grep -Fq -- "--file ${legacy_v2_release}/compose.yaml" "${docker_log}"
test "$(find "${legacy_v2_backups}" -name 'cubing-hub-production-*' -type d | wc -l | tr -d ' ')" = 1

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
