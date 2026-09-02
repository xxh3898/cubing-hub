#!/bin/bash

set -Eeuo pipefail

readonly EXPECTED_REPOSITORY=xxh3898/cubing-hub
readonly EXPECTED_WORKFLOW=.github/workflows/release.yml
readonly API_IMAGE_REPOSITORY=ghcr.io/xxh3898/cubing-hub-api
readonly WEB_IMAGE_REPOSITORY=ghcr.io/xxh3898/cubing-hub-web
readonly RUNTIME_CONFIG_IMAGE_REPOSITORY=ghcr.io/xxh3898/cubing-hub-runtime-config

usage() {
  printf '%s\n' \
    'Usage:' \
    '  release-manifest.sh write <manifest-path>' \
    '  release-manifest.sh validate <manifest-path> <release-sha> <run-id> <run-attempt>' \
    >&2
}

fail() {
  printf 'Release manifest validation failed: %s\n' "$1" >&2
  exit 1
}

is_revision() {
  [[ "$1" =~ ^[0-9a-f]{40}$ ]]
}

is_positive_integer() {
  [[ "$1" =~ ^[1-9][0-9]*$ ]]
}

is_digest() {
  [[ "$1" =~ ^sha256:[0-9a-f]{64}$ ]]
}

manifest_keys() {
  printf '%s\n' \
    manifest_version \
    repository \
    release_revision \
    release_run_id \
    release_run_attempt \
    release_workflow \
    api_image \
    api_digest \
    web_image \
    web_digest \
    runtime_config_image \
    runtime_config_mode \
    runtime_config_revision \
    runtime_config_digest \
    runtime_baseline_revision \
    runtime_baseline_digest \
    runtime_baseline_source \
    data_service_maintenance_required
}

validate_manifest() {
  local manifest_path="$1"
  local expected_revision="$2"
  local expected_run_id="$3"
  local expected_run_attempt="$4"
  local actual_keys
  local expected_keys
  local key
  local value
  local manifest_version=
  local repository=
  local release_revision=
  local release_run_id=
  local release_run_attempt=
  local release_workflow=
  local api_image=
  local api_digest=
  local web_image=
  local web_digest=
  local runtime_config_image=
  local runtime_config_mode=
  local runtime_config_revision=
  local runtime_config_digest=
  local runtime_baseline_revision=
  local runtime_baseline_digest=
  local runtime_baseline_source=
  local data_service_maintenance_required=

  if [[ ! -f "${manifest_path}" || -L "${manifest_path}" ]]; then
    fail "manifest is missing or unsafe"
  fi
  if ! is_revision "${expected_revision}" \
    || ! is_positive_integer "${expected_run_id}" \
    || ! is_positive_integer "${expected_run_attempt}"
  then
    fail "expected release authority has an invalid format"
  fi

  expected_keys="$(manifest_keys)"
  actual_keys="$(/usr/bin/sed 's/=.*//' "${manifest_path}")"
  if [[ "${actual_keys}" != "${expected_keys}" ]]; then
    fail "manifest keys or ordering do not match the contract"
  fi

  while IFS='=' read -r key value; do
    case "${key}" in
      manifest_version) manifest_version="${value}" ;;
      repository) repository="${value}" ;;
      release_revision) release_revision="${value}" ;;
      release_run_id) release_run_id="${value}" ;;
      release_run_attempt) release_run_attempt="${value}" ;;
      release_workflow) release_workflow="${value}" ;;
      api_image) api_image="${value}" ;;
      api_digest) api_digest="${value}" ;;
      web_image) web_image="${value}" ;;
      web_digest) web_digest="${value}" ;;
      runtime_config_image) runtime_config_image="${value}" ;;
      runtime_config_mode) runtime_config_mode="${value}" ;;
      runtime_config_revision) runtime_config_revision="${value}" ;;
      runtime_config_digest) runtime_config_digest="${value}" ;;
      runtime_baseline_revision) runtime_baseline_revision="${value}" ;;
      runtime_baseline_digest) runtime_baseline_digest="${value}" ;;
      runtime_baseline_source) runtime_baseline_source="${value}" ;;
      data_service_maintenance_required)
        data_service_maintenance_required="${value}"
        ;;
      *) fail "manifest contains an unknown key" ;;
    esac
  done <"${manifest_path}"

  [[ "${manifest_version}" == 1 ]] \
    || fail "manifest version is unsupported"
  [[ "${repository}" == "${EXPECTED_REPOSITORY}" ]] \
    || fail "repository authority does not match"
  [[ "${release_workflow}" == "${EXPECTED_WORKFLOW}" ]] \
    || fail "release workflow authority does not match"
  [[ "${release_revision}" == "${expected_revision}" ]] \
    || fail "release revision does not match"
  [[ "${release_run_id}" == "${expected_run_id}" ]] \
    || fail "release run ID does not match"
  [[ "${release_run_attempt}" == "${expected_run_attempt}" ]] \
    || fail "release run attempt does not match"
  [[ "${api_image}" == "${API_IMAGE_REPOSITORY}:${release_revision}" ]] \
    || fail "API image revision does not match"
  is_digest "${api_digest}" \
    || fail "API image digest has an invalid format"
  [[ "${web_image}" == "${WEB_IMAGE_REPOSITORY}:${release_revision}" ]] \
    || fail "Web image revision does not match"
  is_digest "${web_digest}" \
    || fail "Web image digest has an invalid format"
  is_revision "${runtime_baseline_revision}" \
    || fail "runtime baseline revision has an invalid format"
  is_digest "${runtime_baseline_digest}" \
    || fail "runtime baseline digest has an invalid format"
  case "${runtime_baseline_source}" in
    runtime|legacy-bootstrap|new-install-bootstrap)
      ;;
    *) fail "runtime baseline source is invalid" ;;
  esac
  case "${data_service_maintenance_required}" in
    true|false)
      ;;
    *) fail "data-service maintenance state is invalid" ;;
  esac

  case "${runtime_config_mode}" in
    keep)
      if [[ -n "${runtime_config_image}" \
        || -n "${runtime_config_revision}" \
        || -n "${runtime_config_digest}" ]]
      then
        fail "keep mode must not claim a newly published runtime config"
      fi
      ;;
    update)
      [[ "${runtime_config_image}" == "${RUNTIME_CONFIG_IMAGE_REPOSITORY}:${release_revision}" ]] \
        || fail "runtime config image revision does not match"
      [[ "${runtime_config_revision}" == "${release_revision}" ]] \
        || fail "runtime config revision does not match"
      is_digest "${runtime_config_digest}" \
        || fail "runtime config digest has an invalid format"
      ;;
    *) fail "runtime config mode is invalid" ;;
  esac

  if [[ "${data_service_maintenance_required}" == true \
    && "${runtime_config_mode}" != update ]]
  then
    fail "data-service maintenance requires a runtime config artifact"
  fi
}

write_manifest() {
  local manifest_path="$1"
  local manifest_temp
  local runtime_config_image=

  : "${RELEASE_REVISION:?RELEASE_REVISION is required}"
  : "${RELEASE_RUN_ID:?RELEASE_RUN_ID is required}"
  : "${RELEASE_RUN_ATTEMPT:?RELEASE_RUN_ATTEMPT is required}"
  : "${API_IMAGE_DIGEST:?API_IMAGE_DIGEST is required}"
  : "${WEB_IMAGE_DIGEST:?WEB_IMAGE_DIGEST is required}"
  : "${RUNTIME_CONFIG_MODE:?RUNTIME_CONFIG_MODE is required}"
  : "${RUNTIME_BASELINE_REVISION:?RUNTIME_BASELINE_REVISION is required}"
  : "${RUNTIME_BASELINE_DIGEST:?RUNTIME_BASELINE_DIGEST is required}"
  : "${RUNTIME_BASELINE_SOURCE:?RUNTIME_BASELINE_SOURCE is required}"
  : "${DATA_SERVICE_MAINTENANCE_REQUIRED:?DATA_SERVICE_MAINTENANCE_REQUIRED is required}"

  if [[ "${RUNTIME_CONFIG_MODE}" == update ]]; then
    runtime_config_image="${RUNTIME_CONFIG_IMAGE_REPOSITORY}:${RELEASE_REVISION}"
  fi

  manifest_temp="$(/usr/bin/mktemp "${manifest_path}.tmp.XXXXXX")"
  trap '/bin/rm -f -- "${manifest_temp}"' EXIT INT TERM
  {
    printf 'manifest_version=1\n'
    printf 'repository=%s\n' "${EXPECTED_REPOSITORY}"
    printf 'release_revision=%s\n' "${RELEASE_REVISION}"
    printf 'release_run_id=%s\n' "${RELEASE_RUN_ID}"
    printf 'release_run_attempt=%s\n' "${RELEASE_RUN_ATTEMPT}"
    printf 'release_workflow=%s\n' "${EXPECTED_WORKFLOW}"
    printf 'api_image=%s:%s\n' "${API_IMAGE_REPOSITORY}" "${RELEASE_REVISION}"
    printf 'api_digest=%s\n' "${API_IMAGE_DIGEST}"
    printf 'web_image=%s:%s\n' "${WEB_IMAGE_REPOSITORY}" "${RELEASE_REVISION}"
    printf 'web_digest=%s\n' "${WEB_IMAGE_DIGEST}"
    printf 'runtime_config_image=%s\n' "${runtime_config_image}"
    printf 'runtime_config_mode=%s\n' "${RUNTIME_CONFIG_MODE}"
    printf 'runtime_config_revision=%s\n' "${RUNTIME_CONFIG_REVISION:-}"
    printf 'runtime_config_digest=%s\n' "${RUNTIME_CONFIG_DIGEST:-}"
    printf 'runtime_baseline_revision=%s\n' "${RUNTIME_BASELINE_REVISION}"
    printf 'runtime_baseline_digest=%s\n' "${RUNTIME_BASELINE_DIGEST}"
    printf 'runtime_baseline_source=%s\n' "${RUNTIME_BASELINE_SOURCE}"
    printf 'data_service_maintenance_required=%s\n' \
      "${DATA_SERVICE_MAINTENANCE_REQUIRED}"
  } >"${manifest_temp}"

  validate_manifest \
    "${manifest_temp}" \
    "${RELEASE_REVISION}" \
    "${RELEASE_RUN_ID}" \
    "${RELEASE_RUN_ATTEMPT}"
  /bin/mv "${manifest_temp}" "${manifest_path}"
  trap - EXIT INT TERM
}

case "$#" in
  2)
    if [[ "$1" != write ]]; then
      usage
      exit 64
    fi
    write_manifest "$2"
    ;;
  5)
    if [[ "$1" != validate ]]; then
      usage
      exit 64
    fi
    validate_manifest "$2" "$3" "$4" "$5"
    ;;
  *)
    usage
    exit 64
    ;;
esac
