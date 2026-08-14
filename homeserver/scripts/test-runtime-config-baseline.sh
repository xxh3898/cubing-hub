#!/bin/bash

set -Eeuo pipefail

readonly PROJECT_ROOT="$(
  CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd
)"
readonly RESOLVER="${PROJECT_ROOT}/homeserver/scripts/resolve-runtime-config-baseline.sh"
readonly RECORDER="${PROJECT_ROOT}/homeserver/scripts/record-runtime-config-baseline.sh"
readonly MOCK_CURL="${PROJECT_ROOT}/homeserver/scripts/fixtures/mock-github-deployments-curl.sh"
readonly APPLICATION_REVISION=1111111111111111111111111111111111111111
readonly RUNTIME_REVISION=2222222222222222222222222222222222222222
readonly LEGACY_REVISION=3333333333333333333333333333333333333333
readonly RUNTIME_DIGEST=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
readonly DB_IMAGE=mysql:8.4.11@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
readonly DB_VOLUME=cubing-hub_mysql-data
readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000

test_root="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-runtime-baseline-test.XXXXXX")"

cleanup() {
  if [[ "$(/usr/bin/basename "${test_root}")" == cubing-runtime-baseline-test.* ]]; then
    /bin/rm -rf -- "${test_root}"
  fi
}

trap cleanup EXIT INT TERM

new_fixture() {
  fixture_dir="${test_root}/$1"
  /bin/mkdir -p "${fixture_dir}"
}

write_deployments() {
  local environment="$1"
  local page="$2"
  local target="$3"
  shift 3

  printf '%s\n' "$@" | jq -Rn \
    --arg application "${APPLICATION_REVISION}" \
    --arg digest "${RUNTIME_DIGEST}" \
    --arg environment "${environment}" '
      [inputs | select(length > 0) | split("\t") |
        {id: (.[0] | tonumber), sha: .[1], environment: $environment} |
        if $environment == "production-runtime-config" then
          . + {
            task: "runtime-config:baseline",
            payload: {
              operation: "normal-update",
              applicationRevision: $application,
              runtimeConfigRevision: .sha,
              runtimeConfigDigest: $digest
            }
          }
        else . end
      ]
    ' >"${target}/${environment}-deployments-page-${page}.json"
}

write_status() {
  local deployment_id="$1"
  local state="$2"

  jq -cn --arg state "${state}" '[{state: $state}]' \
    >"${fixture_dir}/deployment-${deployment_id}-statuses.json"
}

write_full_failure_page() {
  local environment="$1"
  local page="$2"

  "${PYTHON_BIN:-/usr/bin/python3}" - \
    "${fixture_dir}/${environment}-deployments-page-${page}.json" \
    "${environment}" \
    "${APPLICATION_REVISION}" \
    "${RUNTIME_DIGEST}" <<'PY'
import json
import pathlib
import sys

pathlib.Path(sys.argv[1]).write_text(
    json.dumps([
        ({
            "id": index,
            "sha": f"{index:040x}",
            "environment": sys.argv[2],
        } | ({
            "task": "runtime-config:baseline",
            "payload": {
                "operation": "normal-update",
                "applicationRevision": sys.argv[3],
                "runtimeConfigRevision": f"{index:040x}",
                "runtimeConfigDigest": sys.argv[4],
            },
        } if sys.argv[2] == "production-runtime-config" else {}))
        for index in range(1, 101)
    ]),
    encoding="utf-8",
)
PY
  for deployment_id in $(/usr/bin/jot 100 1 100 2>/dev/null || /usr/bin/seq 1 100); do
    write_status "${deployment_id}" failure
  done
}

run_resolver() {
  /usr/bin/env \
    CURL_BIN="${MOCK_CURL}" \
    FAKE_GITHUB_API_FIXTURE_DIR="${fixture_dir}" \
    GH_TOKEN=test-token \
    GITHUB_API_URL=https://api.github.test \
    GITHUB_REPOSITORY=xxh3898/cubing-hub \
    /bin/bash "${RESOLVER}"
}

new_fixture runtime-success
write_deployments production-runtime-config 1 "${fixture_dir}" \
  $'10\t'"${RUNTIME_REVISION}"
write_status 10 success
result="$(run_resolver)"
/usr/bin/grep -Fxq "revision=${RUNTIME_REVISION}" <<<"${result}"
/usr/bin/grep -Fxq "digest=${RUNTIME_DIGEST}" <<<"${result}"
/usr/bin/grep -Fxq 'source=runtime' <<<"${result}"

new_fixture paginated-runtime-success
write_full_failure_page production-runtime-config 1
write_deployments production-runtime-config 2 "${fixture_dir}" \
  $'101\t'"${RUNTIME_REVISION}"
write_status 101 success
result="$(run_resolver)"
/usr/bin/grep -Fxq "revision=${RUNTIME_REVISION}" <<<"${result}"
/usr/bin/grep -Fxq "digest=${RUNTIME_DIGEST}" <<<"${result}"
/usr/bin/grep -Fxq 'source=runtime' <<<"${result}"

new_fixture pagination-failure
write_full_failure_page production-runtime-config 1
if run_resolver >/dev/null 2>&1; then
  printf 'A failed runtime deployment history page request must fail closed\n' >&2
  exit 1
fi

new_fixture legacy-bootstrap
printf '[]\n' >"${fixture_dir}/production-runtime-config-deployments-page-1.json"
write_deployments production 1 "${fixture_dir}" $'20\t'"${LEGACY_REVISION}"
write_status 20 success
result="$(run_resolver)"
/usr/bin/grep -Fxq "revision=${LEGACY_REVISION}" <<<"${result}"
/usr/bin/grep -Fxq "digest=${ZERO_DIGEST}" <<<"${result}"
/usr/bin/grep -Fxq 'source=legacy-bootstrap' <<<"${result}"

new_fixture new-install-bootstrap
printf '[]\n' >"${fixture_dir}/production-runtime-config-deployments-page-1.json"
printf '[]\n' >"${fixture_dir}/production-deployments-page-1.json"
result="$(run_resolver)"
/usr/bin/grep -Fxq "revision=${ZERO_SHA}" <<<"${result}"
/usr/bin/grep -Fxq "digest=${ZERO_DIGEST}" <<<"${result}"
/usr/bin/grep -Fxq 'source=new-install-bootstrap' <<<"${result}"

new_fixture runtime-history-without-success
write_deployments production-runtime-config 1 "${fixture_dir}" \
  $'30\t'"${RUNTIME_REVISION}"
write_status 30 failure
if run_resolver >/dev/null 2>&1; then
  printf 'Runtime history without success must fail closed\n' >&2
  exit 1
fi

new_fixture invalid-runtime-response
printf '{invalid\n' >"${fixture_dir}/production-runtime-config-deployments-page-1.json"
if run_resolver >/dev/null 2>&1; then
  printf 'Invalid runtime history response must fail closed\n' >&2
  exit 1
fi

new_fixture invalid-runtime-payload
jq -cn \
  --arg revision "${RUNTIME_REVISION}" \
  '[{id: 40, sha: $revision, environment: "production-runtime-config"}]' \
  >"${fixture_dir}/production-runtime-config-deployments-page-1.json"
write_status 40 success
if run_resolver >/dev/null 2>&1; then
  printf 'A runtime baseline without verified payload metadata must fail closed\n' >&2
  exit 1
fi

new_fixture record-success
api_log="${fixture_dir}/api.log"
result="$(
  /usr/bin/env \
    CURL_BIN="${MOCK_CURL}" \
    FAKE_GITHUB_API_FIXTURE_DIR="${fixture_dir}" \
    FAKE_GITHUB_API_LOG="${api_log}" \
    GH_TOKEN=test-token \
    GITHUB_API_URL=https://api.github.test \
    GITHUB_REPOSITORY=xxh3898/cubing-hub \
    /bin/bash "${RECORDER}" \
      maintenance-reconcile \
      "${APPLICATION_REVISION}" \
      "${RUNTIME_REVISION}" \
      "${RUNTIME_DIGEST}" \
      "${DB_IMAGE}" \
      "${DB_VOLUME}" \
      8.4.11
)"
/usr/bin/grep -Fxq 'deployment_id=900' <<<"${result}"
deployment_request="$(/usr/bin/sed -n '1p' "${api_log}")"
status_request="$(/usr/bin/sed -n '2p' "${api_log}")"
jq -e \
  --arg application "${APPLICATION_REVISION}" \
  --arg runtime "${RUNTIME_REVISION}" \
  --arg digest "${RUNTIME_DIGEST}" \
  --arg image "${DB_IMAGE}" \
  --arg volume "${DB_VOLUME}" '
    .method == "POST" and
    .data.ref == $runtime and
    .data.environment == "production-runtime-config" and
    .data.auto_merge == false and
    .data.required_contexts == [] and
    .data.payload.operation == "maintenance-reconcile" and
    .data.payload.applicationRevision == $application and
    .data.payload.runtimeConfigRevision == $runtime and
    .data.payload.runtimeConfigDigest == $digest and
    .data.payload.dbImage == $image and
    .data.payload.dbVolume == $volume and
    .data.payload.mysqlVersion == "8.4.11"
  ' <<<"${deployment_request}" >/dev/null
jq -e \
  '.method == "POST" and
   .data.state == "success" and
   .data.environment == "production-runtime-config" and
   .data.auto_inactive == false' \
  <<<"${status_request}" >/dev/null
! /usr/bin/grep -Fq test-token "${api_log}"

new_fixture record-status-failure
if /usr/bin/env \
  CURL_BIN="${MOCK_CURL}" \
  FAKE_GITHUB_API_FIXTURE_DIR="${fixture_dir}" \
  FAKE_GITHUB_STATUS_STATE=failure \
  GH_TOKEN=test-token \
  GITHUB_API_URL=https://api.github.test \
  GITHUB_REPOSITORY=xxh3898/cubing-hub \
  /bin/bash "${RECORDER}" \
    normal-update \
    "${APPLICATION_REVISION}" \
    "${RUNTIME_REVISION}" \
    "${RUNTIME_DIGEST}" \
    - - - \
    >/dev/null 2>&1
then
  printf 'A non-success deployment status must fail closed\n' >&2
  exit 1
fi

new_fixture record-deployment-request-failure
if /usr/bin/env \
  CURL_BIN="${MOCK_CURL}" \
  FAKE_GITHUB_API_FIXTURE_DIR="${fixture_dir}" \
  FAKE_GITHUB_DEPLOYMENT_FAIL=true \
  GH_TOKEN=test-token \
  GITHUB_API_URL=https://api.github.test \
  GITHUB_REPOSITORY=xxh3898/cubing-hub \
  /bin/bash "${RECORDER}" \
    normal-update \
    "${APPLICATION_REVISION}" \
    "${RUNTIME_REVISION}" \
    "${RUNTIME_DIGEST}" \
    - - - \
    >/dev/null 2>&1
then
  printf 'A failed deployment creation request must fail closed\n' >&2
  exit 1
fi

new_fixture record-status-request-failure
if /usr/bin/env \
  CURL_BIN="${MOCK_CURL}" \
  FAKE_GITHUB_API_FIXTURE_DIR="${fixture_dir}" \
  FAKE_GITHUB_STATUS_FAIL=true \
  GH_TOKEN=test-token \
  GITHUB_API_URL=https://api.github.test \
  GITHUB_REPOSITORY=xxh3898/cubing-hub \
  /bin/bash "${RECORDER}" \
    normal-update \
    "${APPLICATION_REVISION}" \
    "${RUNTIME_REVISION}" \
    "${RUNTIME_DIGEST}" \
    - - - \
    >/dev/null 2>&1
then
  printf 'A failed deployment status request must fail closed\n' >&2
  exit 1
fi

printf 'Cubing Hub runtime config baseline tests passed\n'
