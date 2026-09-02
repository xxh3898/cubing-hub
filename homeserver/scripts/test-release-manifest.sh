#!/bin/bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly MANIFEST_SCRIPT="${SCRIPT_DIR}/release-manifest.sh"
readonly FIXTURE_RELEASE_REVISION=1111111111111111111111111111111111111111
readonly FIXTURE_OTHER_REVISION=2222222222222222222222222222222222222222
readonly FIXTURE_RELEASE_RUN_ID=123456789
readonly FIXTURE_RELEASE_RUN_ATTEMPT=1
readonly DIGEST_ONE=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
readonly DIGEST_TWO=sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
readonly DIGEST_THREE=sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc

test_root="$(mktemp -d "${TMPDIR:-/tmp}/cubing-hub-release-manifest-test.XXXXXX")"
trap '/bin/rm -rf -- "${test_root}"' EXIT INT TERM

write_fixture() {
  local mode="$1"
  local maintenance_required="$2"
  local output="$3"
  local config_revision=
  local config_digest=

  if [[ "${mode}" == update ]]; then
    config_revision="${FIXTURE_RELEASE_REVISION}"
    config_digest="${DIGEST_THREE}"
  fi

  RELEASE_REVISION="${FIXTURE_RELEASE_REVISION}" \
  RELEASE_RUN_ID="${FIXTURE_RELEASE_RUN_ID}" \
  RELEASE_RUN_ATTEMPT="${FIXTURE_RELEASE_RUN_ATTEMPT}" \
  API_IMAGE_DIGEST="${DIGEST_ONE}" \
  WEB_IMAGE_DIGEST="${DIGEST_TWO}" \
  RUNTIME_CONFIG_MODE="${mode}" \
  RUNTIME_CONFIG_REVISION="${config_revision}" \
  RUNTIME_CONFIG_DIGEST="${config_digest}" \
  RUNTIME_BASELINE_REVISION="${FIXTURE_OTHER_REVISION}" \
  RUNTIME_BASELINE_DIGEST="${DIGEST_ONE}" \
  RUNTIME_BASELINE_SOURCE=runtime \
  DATA_SERVICE_MAINTENANCE_REQUIRED="${maintenance_required}" \
    /bin/bash "${MANIFEST_SCRIPT}" write "${output}"
}

expect_valid() {
  /bin/bash "${MANIFEST_SCRIPT}" validate \
    "$1" \
    "${FIXTURE_RELEASE_REVISION}" \
    "${FIXTURE_RELEASE_RUN_ID}" \
    "${FIXTURE_RELEASE_RUN_ATTEMPT}"
}

expect_invalid() {
  if "$@" >/dev/null 2>&1; then
    printf 'Expected command to fail: %q' "$1" >&2
    printf ' %q' "${@:2}" >&2
    printf '\n' >&2
    exit 1
  fi
}

keep_manifest="${test_root}/keep.env"
update_manifest="${test_root}/update.env"
maintenance_manifest="${test_root}/maintenance.env"

write_fixture keep false "${keep_manifest}"
expect_valid "${keep_manifest}"
/bin/bash "${MANIFEST_SCRIPT}" verify-images \
  "${keep_manifest}" \
  "${FIXTURE_RELEASE_REVISION}" \
  "${FIXTURE_RELEASE_RUN_ID}" \
  "${FIXTURE_RELEASE_RUN_ATTEMPT}" \
  "${DIGEST_ONE}" \
  "${DIGEST_TWO}"

expect_invalid \
  /bin/bash "${MANIFEST_SCRIPT}" verify-images \
  "${keep_manifest}" \
  "${FIXTURE_RELEASE_REVISION}" \
  "${FIXTURE_RELEASE_RUN_ID}" \
  "${FIXTURE_RELEASE_RUN_ATTEMPT}" \
  "${DIGEST_THREE}" \
  "${DIGEST_TWO}"
expect_invalid \
  /bin/bash "${MANIFEST_SCRIPT}" verify-images \
  "${keep_manifest}" \
  "${FIXTURE_RELEASE_REVISION}" \
  "${FIXTURE_RELEASE_RUN_ID}" \
  "${FIXTURE_RELEASE_RUN_ATTEMPT}" \
  "${DIGEST_ONE}" \
  "${DIGEST_THREE}"

write_fixture update false "${update_manifest}"
expect_valid "${update_manifest}"

write_fixture update true "${maintenance_manifest}"
expect_valid "${maintenance_manifest}"

expect_invalid \
  /bin/bash "${MANIFEST_SCRIPT}" validate \
  "${keep_manifest}" "${FIXTURE_OTHER_REVISION}" "${FIXTURE_RELEASE_RUN_ID}" "${FIXTURE_RELEASE_RUN_ATTEMPT}"
expect_invalid \
  /bin/bash "${MANIFEST_SCRIPT}" validate \
  "${keep_manifest}" "${FIXTURE_RELEASE_REVISION}" 987654321 "${FIXTURE_RELEASE_RUN_ATTEMPT}"

unknown_key_manifest="${test_root}/unknown-key.env"
/usr/bin/sed \
  's/^manifest_version=1$/unknown_key=1/' \
  "${keep_manifest}" >"${unknown_key_manifest}"
expect_invalid \
  /bin/bash "${MANIFEST_SCRIPT}" validate \
  "${unknown_key_manifest}" "${FIXTURE_RELEASE_REVISION}" "${FIXTURE_RELEASE_RUN_ID}" "${FIXTURE_RELEASE_RUN_ATTEMPT}"

invalid_digest_manifest="${test_root}/invalid-digest.env"
/usr/bin/sed \
  's/^api_digest=.*/api_digest=sha256:invalid/' \
  "${keep_manifest}" >"${invalid_digest_manifest}"
expect_invalid \
  /bin/bash "${MANIFEST_SCRIPT}" validate \
  "${invalid_digest_manifest}" "${FIXTURE_RELEASE_REVISION}" "${FIXTURE_RELEASE_RUN_ID}" "${FIXTURE_RELEASE_RUN_ATTEMPT}"

keep_with_config_manifest="${test_root}/keep-with-config.env"
/usr/bin/sed \
  "s#^runtime_config_digest=.*#runtime_config_digest=${DIGEST_THREE}#" \
  "${keep_manifest}" >"${keep_with_config_manifest}"
expect_invalid \
  /bin/bash "${MANIFEST_SCRIPT}" validate \
  "${keep_with_config_manifest}" "${FIXTURE_RELEASE_REVISION}" "${FIXTURE_RELEASE_RUN_ID}" "${FIXTURE_RELEASE_RUN_ATTEMPT}"

update_without_digest_manifest="${test_root}/update-without-digest.env"
/usr/bin/sed \
  's/^runtime_config_digest=.*/runtime_config_digest=/' \
  "${update_manifest}" >"${update_without_digest_manifest}"
expect_invalid \
  /bin/bash "${MANIFEST_SCRIPT}" validate \
  "${update_without_digest_manifest}" "${FIXTURE_RELEASE_REVISION}" "${FIXTURE_RELEASE_RUN_ID}" "${FIXTURE_RELEASE_RUN_ATTEMPT}"

printf 'Release manifest tests passed\n'
