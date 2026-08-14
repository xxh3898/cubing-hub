#!/bin/bash

set -Eeuo pipefail

method=GET
data=
url=

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --request)
      method="$2"
      shift 2
      ;;
    --data)
      data="$2"
      shift 2
      ;;
    --header|--retry)
      shift 2
      ;;
    --fail|--silent|--show-error)
      shift
      ;;
    http://*|https://*)
      url="$1"
      shift
      ;;
    *)
      printf 'Unexpected mock curl argument: %s\n' "$1" >&2
      exit 64
      ;;
  esac
done

[[ -n "${url}" ]] || exit 64
[[ -d "${FAKE_GITHUB_API_FIXTURE_DIR:-}" ]] || exit 64

if [[ -n "${FAKE_GITHUB_API_LOG:-}" ]]; then
  jq -cn \
    --arg method "${method}" \
    --arg url "${url}" \
    --argjson data "${data:-null}" \
    '{method: $method, url: $url, data: $data}' \
    >>"${FAKE_GITHUB_API_LOG}"
fi

case "${method} ${url}" in
  "GET "*'/deployments?'*)
    environment="$(
      /usr/bin/sed -E 's#.*[?&]environment=([^&]+).*#\1#' <<<"${url}"
    )"
    page="$(/usr/bin/sed -E 's#.*[?&]page=([0-9]+).*#\1#' <<<"${url}")"
    fixture="${FAKE_GITHUB_API_FIXTURE_DIR}/${environment}-deployments-page-${page}.json"
    ;;
  "GET "*'/deployments/'*'/statuses?'*)
    deployment_id="$(
      /usr/bin/sed -E 's#^.*/deployments/([0-9]+)/statuses.*#\1#' <<<"${url}"
    )"
    fixture="${FAKE_GITHUB_API_FIXTURE_DIR}/deployment-${deployment_id}-statuses.json"
    ;;
  "POST "*'/deployments/'*'/statuses')
    [[ "${FAKE_GITHUB_STATUS_FAIL:-false}" != true ]] || exit 22
    deployment_id="$(
      /usr/bin/sed -E 's#^.*/deployments/([0-9]+)/statuses$#\1#' <<<"${url}"
    )"
    state="${FAKE_GITHUB_STATUS_STATE:-success}"
    environment="$(jq -r '.environment' <<<"${data}")"
    jq -cn \
      --argjson id "${deployment_id}" \
      --arg state "${state}" \
      --arg environment "${environment}" \
      '{id: $id, state: $state, environment: $environment}'
    exit 0
    ;;
  "POST "*'/deployments')
    [[ "${FAKE_GITHUB_DEPLOYMENT_FAIL:-false}" != true ]] || exit 22
    deployment_id="${FAKE_GITHUB_DEPLOYMENT_ID:-900}"
    revision="$(jq -r '.ref' <<<"${data}")"
    environment="$(jq -r '.environment' <<<"${data}")"
    jq -cn \
      --argjson id "${deployment_id}" \
      --arg sha "${revision}" \
      --arg environment "${environment}" \
      '{id: $id, sha: $sha, environment: $environment}'
    exit 0
    ;;
  *)
    printf 'Unexpected mock GitHub API request: %s %s\n' "${method}" "${url}" >&2
    exit 64
    ;;
esac

[[ -f "${fixture}" ]] || exit 22
/bin/cat "${fixture}"
