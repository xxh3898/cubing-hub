#!/bin/bash

set -Eeuo pipefail

readonly CURL_BIN="${CURL_BIN:-curl}"
readonly JQ_BIN="${JQ_BIN:-jq}"
readonly RUNTIME_ENVIRONMENT=production-runtime-config
readonly LEGACY_ENVIRONMENT=production
readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000
readonly PAGE_SIZE=100

fail() {
  printf 'Runtime config baseline resolution failed: %s\n' "$1" >&2
  exit 1
}

if [[ "$#" -ne 0 ]]; then
  printf 'Usage: resolve-runtime-config-baseline.sh\n' >&2
  exit 64
fi

if [[ -z "${GH_TOKEN:-}" ]] \
  || [[ -z "${GITHUB_API_URL:-}" ]] \
  || [[ ! "${GITHUB_REPOSITORY:-}" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]
then
  printf 'GitHub API context is incomplete\n' >&2
  exit 64
fi
if ! command -v "${CURL_BIN}" >/dev/null 2>&1 \
  || ! command -v "${JQ_BIN}" >/dev/null 2>&1
then
  fail "curl or jq is unavailable"
fi

curl_config=
cleanup_curl_config() {
  GH_TOKEN=
  if [[ -n "${curl_config}" \
    && -f "${curl_config}" \
    && ! -L "${curl_config}" \
    && "$(/usr/bin/basename "${curl_config}")" == cubing-hub-github-curl.* ]]
  then
    /bin/rm -f -- "${curl_config}"
  fi
}
trap cleanup_curl_config EXIT INT TERM
umask 077
curl_config="$(
  GH_TOKEN= /usr/bin/mktemp \
    "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/cubing-hub-github-curl.XXXXXX"
)"
{
  printf 'header = "Accept: application/vnd.github+json"\n'
  printf 'header = "Authorization: Bearer %s"\n' "${GH_TOKEN}"
  printf 'header = "X-GitHub-Api-Version: 2022-11-28"\n'
} >"${curl_config}"
GH_TOKEN=
/bin/chmod 600 "${curl_config}"

api_get() {
  "${CURL_BIN}" \
    --config "${curl_config}" \
    --fail \
    --retry 3 \
    --silent \
    --show-error \
    "$1"
}

resolved_sha=
resolved_digest=
resolution_state=

resolve_environment() {
  local deployment_count
  local deployment_id
  local deployment_digest
  local deployment_sha
  local deployments
  local environment="$1"
  local history_kind="$2"
  local page=1
  local saw_deployment=false
  local state
  local statuses

  resolved_sha=
  resolved_digest=
  resolution_state=
  while :; do
    deployments="$(
      api_get \
        "${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/deployments?environment=${environment}&per_page=${PAGE_SIZE}&page=${page}"
    )" || fail "${environment} deployment history request failed"
    if ! "${JQ_BIN}" -e \
      --arg environment "${environment}" \
      --arg history_kind "${history_kind}" \
      --arg zero_digest "${ZERO_DIGEST}" \
      --arg zero_sha "${ZERO_SHA}" \
      'type == "array" and all(.[];
        (.id | type == "number") and
        (.sha | type == "string" and test("^[0-9a-f]{40}$")) and
        .sha != $zero_sha and
        .environment == $environment and
        ($history_kind != "runtime" or (
          .task == "runtime-config:baseline" and
          (.payload | type == "object") and
          (.payload.operation == "normal-update" or
           .payload.operation == "maintenance-reconcile") and
          (.payload.applicationRevision |
            type == "string" and test("^[0-9a-f]{40}$")) and
          .payload.applicationRevision != $zero_sha and
          .payload.runtimeConfigRevision == .sha and
          (.payload.runtimeConfigDigest |
            type == "string" and test("^sha256:[0-9a-f]{64}$")) and
          .payload.runtimeConfigDigest != $zero_digest and
          (.payload.operation != "maintenance-reconcile" or (
            (.payload.dbImage |
              type == "string" and
              test("^mysql:[0-9]+\\.[0-9]+\\.[0-9]+@sha256:[0-9a-f]{64}$")) and
            (.payload.dbVolume |
              type == "string" and
              test("^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$")) and
            (.payload.mysqlVersion |
              type == "string" and
              test("^[0-9]+\\.[0-9]+\\.[0-9]+$")) and
            (.payload.dbImage |
              capture("^mysql:(?<version>[0-9]+\\.[0-9]+\\.[0-9]+)@sha256:").version) ==
              .payload.mysqlVersion
          ))
        ))
      )' \
      <<<"${deployments}" >/dev/null
    then
      fail "${environment} deployment history response is invalid"
    fi
    deployment_count="$("${JQ_BIN}" -r 'length' <<<"${deployments}")"
    if [[ "${deployment_count}" -eq 0 ]]; then
      if [[ "${saw_deployment}" == false ]]; then
        resolution_state=empty
      else
        resolution_state=no-success
      fi
      return
    fi
    saw_deployment=true

    while IFS=$'\t' read -r \
      deployment_id deployment_sha deployment_digest
    do
      statuses="$(
        api_get \
          "${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/deployments/${deployment_id}/statuses?per_page=1"
      )" || fail "${environment} deployment status request failed"
      if ! "${JQ_BIN}" -e \
        'type == "array" and all(.[];
          (.state | type == "string") and
          (.state == "error" or
           .state == "failure" or
           .state == "inactive" or
           .state == "in_progress" or
           .state == "queued" or
           .state == "pending" or
           .state == "success")
        )' \
        <<<"${statuses}" >/dev/null
      then
        fail "${environment} deployment status response is invalid"
      fi
      state="$("${JQ_BIN}" -r '.[0].state // empty' <<<"${statuses}")"
      if [[ "${state}" == success ]]; then
        resolved_sha="${deployment_sha}"
        resolved_digest="${deployment_digest}"
        resolution_state=success
        return
      fi
    done < <(
      "${JQ_BIN}" -r \
        '.[] | [.id, .sha, (.payload.runtimeConfigDigest // "-")] | @tsv' \
        <<<"${deployments}"
    )

    if [[ "${deployment_count}" -lt "${PAGE_SIZE}" ]]; then
      resolution_state=no-success
      return
    fi
    page="$((page + 1))"
  done
}

resolve_environment "${RUNTIME_ENVIRONMENT}" runtime
case "${resolution_state}" in
  success)
    baseline_revision="${resolved_sha}"
    baseline_digest="${resolved_digest}"
    baseline_source=runtime
    ;;
  empty)
    resolve_environment "${LEGACY_ENVIRONMENT}" legacy
    case "${resolution_state}" in
      success)
        baseline_revision="${resolved_sha}"
        baseline_digest="${ZERO_DIGEST}"
        baseline_source=legacy-bootstrap
        ;;
      empty)
        baseline_revision="${ZERO_SHA}"
        baseline_digest="${ZERO_DIGEST}"
        baseline_source=new-install-bootstrap
        ;;
      no-success)
        fail "legacy production deployments exist without a successful revision"
        ;;
      *)
        fail "legacy production baseline state is invalid"
        ;;
    esac
    ;;
  no-success)
    fail "runtime config deployments exist without a successful baseline"
    ;;
  *)
    fail "runtime config baseline state is invalid"
    ;;
esac

[[ "${baseline_revision}" =~ ^[0-9a-f]{40}$ ]] \
  || fail "resolved revision has an unexpected format"
[[ "${baseline_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] \
  || fail "resolved digest has an unexpected format"
if [[ "${baseline_source}" == runtime && "${baseline_digest}" == "${ZERO_DIGEST}" ]]; then
  fail "verified runtime baseline digest must not be zero"
fi

cleanup_curl_config
trap - EXIT INT TERM
printf 'digest=%s\n' "${baseline_digest}"
printf 'revision=%s\n' "${baseline_revision}"
printf 'source=%s\n' "${baseline_source}"
