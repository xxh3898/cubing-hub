#!/bin/bash

set -Eeuo pipefail

readonly CURL_BIN="${CURL_BIN:-curl}"
readonly JQ_BIN="${JQ_BIN:-jq}"
readonly RUNTIME_ENVIRONMENT=production-runtime-config
readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000

fail() {
  printf 'Runtime config baseline recording failed: %s\n' "$1" >&2
  exit 1
}

if [[ "$#" -ne 7 ]]; then
  printf '%s\n' \
    'Usage: record-runtime-config-baseline.sh <operation> <application-revision> <runtime-revision> <runtime-digest> <db-image|-> <db-volume|-> <mysql-version|->' \
    >&2
  exit 64
fi

operation="$1"
application_revision="$2"
runtime_revision="$3"
runtime_digest="$4"
db_image="$5"
db_volume="$6"
mysql_version="$7"
db_image_version=

case "${operation}" in
  normal-update|maintenance-reconcile)
    ;;
  *)
    printf 'Runtime baseline operation is invalid\n' >&2
    exit 64
    ;;
esac
if [[ ! "${application_revision}" =~ ^[0-9a-f]{40}$ ]] \
  || [[ ! "${runtime_revision}" =~ ^[0-9a-f]{40}$ ]] \
  || [[ ! "${runtime_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] \
  || [[ "${application_revision}" == "${ZERO_SHA}" ]] \
  || [[ "${runtime_revision}" == "${ZERO_SHA}" ]] \
  || [[ "${runtime_digest}" == "${ZERO_DIGEST}" ]]
then
  printf 'Runtime baseline identity is invalid\n' >&2
  exit 64
fi
if [[ "${db_image}" == - && "${db_volume}" == - && "${mysql_version}" == - ]]; then
  if [[ "${operation}" == maintenance-reconcile ]]; then
    printf 'Maintenance reconciliation requires an exact DB binding\n' >&2
    exit 64
  fi
elif [[ "${db_image}" =~ ^mysql:[0-9]+\.[0-9]+\.[0-9]+@sha256:[0-9a-f]{64}$ ]] \
  && [[ "${db_volume}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]] \
  && [[ "${mysql_version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
then
  db_image_version="${db_image#mysql:}"
  db_image_version="${db_image_version%@sha256:*}"
  if [[ "${db_image_version}" != "${mysql_version}" ]]; then
    printf 'Runtime baseline DB version is inconsistent\n' >&2
    exit 64
  fi
else
  printf 'Runtime baseline DB identity is invalid\n' >&2
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

payload="$({
  "${JQ_BIN}" -n \
    --arg operation "${operation}" \
    --arg application_revision "${application_revision}" \
    --arg runtime_revision "${runtime_revision}" \
    --arg runtime_digest "${runtime_digest}" \
    --arg db_image "${db_image}" \
    --arg db_volume "${db_volume}" \
    --arg mysql_version "${mysql_version}" '
      {
        operation: $operation,
        applicationRevision: $application_revision,
        runtimeConfigRevision: $runtime_revision,
        runtimeConfigDigest: $runtime_digest
      }
      + if $db_image == "-" then {}
        else {
          dbImage: $db_image,
          dbVolume: $db_volume,
          mysqlVersion: $mysql_version
        }
        end
    '
})"

deployment_request="$({
  "${JQ_BIN}" -n \
    --arg ref "${runtime_revision}" \
    --arg environment "${RUNTIME_ENVIRONMENT}" \
    --arg description "Verified production runtime config (${operation})" \
    --argjson payload "${payload}" '
      {
        ref: $ref,
        task: "runtime-config:baseline",
        auto_merge: false,
        required_contexts: [],
        payload: $payload,
        environment: $environment,
        description: $description,
        transient_environment: false,
        production_environment: true
      }
    '
})"

deployment_response="$(
  "${CURL_BIN}" \
    --fail \
    --retry 3 \
    --silent \
    --show-error \
    --request POST \
    --header 'Accept: application/vnd.github+json' \
    --header "Authorization: Bearer ${GH_TOKEN}" \
    --header 'X-GitHub-Api-Version: 2022-11-28' \
    --header 'Content-Type: application/json' \
    --data "${deployment_request}" \
    "${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/deployments"
)" || fail "deployment creation request failed"

if ! "${JQ_BIN}" -e \
  --arg revision "${runtime_revision}" \
  --arg environment "${RUNTIME_ENVIRONMENT}" '
    (.id | type == "number") and
    .sha == $revision and
    .environment == $environment
  ' <<<"${deployment_response}" >/dev/null
then
  fail "deployment creation response is invalid"
fi
deployment_id="$("${JQ_BIN}" -r '.id' <<<"${deployment_response}")"

status_request="$({
  "${JQ_BIN}" -n \
    --arg environment "${RUNTIME_ENVIRONMENT}" \
    --arg description 'Production runtime config verified' '
      {
        state: "success",
        environment: $environment,
        description: $description,
        auto_inactive: false
      }
    '
})"

status_response="$(
  "${CURL_BIN}" \
    --fail \
    --retry 3 \
    --silent \
    --show-error \
    --request POST \
    --header 'Accept: application/vnd.github+json' \
    --header "Authorization: Bearer ${GH_TOKEN}" \
    --header 'X-GitHub-Api-Version: 2022-11-28' \
    --header 'Content-Type: application/json' \
    --data "${status_request}" \
    "${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/deployments/${deployment_id}/statuses"
)" || fail "deployment success status request failed"

if ! "${JQ_BIN}" -e \
  --arg environment "${RUNTIME_ENVIRONMENT}" '
    (.id | type == "number") and
    .state == "success" and
    .environment == $environment
  ' <<<"${status_response}" >/dev/null
then
  fail "deployment success status response is invalid"
fi

printf 'deployment_id=%s\n' "${deployment_id}"
