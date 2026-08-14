#!/bin/bash

set -Eeuo pipefail

readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly DOCKER_BIN="${DOCKER_BIN:-docker}"
readonly PYTHON_BIN="${PYTHON_BIN:-python3}"

if [[ "$#" -ne 2 ]]; then
  printf 'Usage: detect-data-service-maintenance.sh <before-sha> <after-sha>\n' >&2
  exit 64
fi

before_sha="$1"
after_sha="$2"

if [[ ! "${before_sha}" =~ ^[0-9a-fA-F]{40}$ ]] \
  || [[ ! "${after_sha}" =~ ^[0-9a-fA-F]{40}$ ]]
then
  printf 'Git revisions must contain exactly 40 hexadecimal characters\n' >&2
  exit 64
fi

repo_root="$(git rev-parse --show-toplevel)" \
  || {
    printf 'Git repository root could not be resolved\n' >&2
    exit 1
  }

if ! git -C "${repo_root}" cat-file -e "${after_sha}^{commit}" 2>/dev/null; then
  printf 'Candidate Git revision is unavailable\n' >&2
  exit 1
fi

if [[ "${before_sha}" == "${ZERO_SHA}" ]]; then
  printf 'false\n'
  exit 0
fi
if ! git -C "${repo_root}" cat-file -e "${before_sha}^{commit}" 2>/dev/null; then
  printf 'Baseline Git revision is unavailable\n' >&2
  exit 1
fi

if ! command -v "${DOCKER_BIN}" >/dev/null 2>&1; then
  printf 'Docker CLI is unavailable\n' >&2
  exit 1
fi
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  printf 'Python is unavailable\n' >&2
  exit 1
fi

test_root="$(
  /usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-data-service-detector.XXXXXX"
)"

cleanup() {
  if [[ -n "${test_root:-}" ]] \
    && [[ -d "${test_root}" ]] \
    && [[ "$(/usr/bin/basename "${test_root}")" == cubing-data-service-detector.* ]]
  then
    /bin/rm -rf -- "${test_root}"
  fi
}

trap cleanup EXIT INT TERM

extract_compose() {
  local revision="$1"
  local snapshot_dir="$2"

  /bin/mkdir -p "${snapshot_dir}/nginx"
  : >"${snapshot_dir}/.env"
  : >"${snapshot_dir}/nginx/cloudflare-edge-real-ip.conf"
  if ! git -C "${repo_root}" show \
      "${revision}:homeserver/docker-compose.yml" \
      >"${snapshot_dir}/compose.yaml"
  then
    printf 'Runtime Compose is unavailable at revision %s\n' "${revision}" >&2
    exit 1
  fi
  if [[ ! -s "${snapshot_dir}/compose.yaml" ]]; then
    printf 'Runtime Compose is empty at revision %s\n' "${revision}" >&2
    exit 1
  fi
}

render_db_contract() {
  local snapshot_dir="$1"
  local rendered

  rendered="$(
    API_IMAGE=ghcr.io/xxh3898/cubing-hub-api:0000000000000000000000000000000000000000 \
    WEB_IMAGE=ghcr.io/xxh3898/cubing-hub-web:0000000000000000000000000000000000000000 \
    DB_IMAGE= \
    DB_VOLUME_NAME= \
    DB_NAME=cubing_hub \
    DB_USERNAME=cubing_hub \
    DB_PASSWORD=detector-placeholder \
    MYSQL_ROOT_PASSWORD=detector-placeholder \
    JWT_SECRET=detector-placeholder \
    POST_IMAGES_HOST_DIR=/tmp/cubing-hub-post-images \
      "${DOCKER_BIN}" compose \
        --project-name cubing-hub \
        --project-directory "${snapshot_dir}" \
        --env-file "${snapshot_dir}/.env" \
        --file "${snapshot_dir}/compose.yaml" \
        config \
        --no-env-resolution \
        --format json
  )" || {
    printf 'Runtime Compose could not be rendered\n' >&2
    exit 1
  }

  printf '%s' "${rendered}" | "${PYTHON_BIN}" -c '
import json
import re
import sys

config = json.load(sys.stdin)
db = config.get("services", {}).get("db", {})
image = db.get("image")
volume = config.get("volumes", {}).get("mysql-data", {})
volume_name = volume.get("name")
mounts = [
    value
    for value in db.get("volumes", [])
    if isinstance(value, dict) and value.get("target") == "/var/lib/mysql"
]
if not isinstance(image, str) or not image:
    raise SystemExit("MySQL image contract is invalid")
if (
    not isinstance(volume_name, str)
    or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", volume_name)
):
    raise SystemExit("MySQL volume contract is invalid")
if (
    len(mounts) != 1
    or mounts[0].get("type") != "volume"
    or mounts[0].get("source") != "mysql-data"
):
    raise SystemExit("MySQL volume binding is invalid")
print(f"{image}\t{volume_name}")
'
}

before_dir="${test_root}/before"
after_dir="${test_root}/after"
extract_compose "${before_sha}" "${before_dir}"
extract_compose "${after_sha}" "${after_dir}"

before_contract="$(render_db_contract "${before_dir}")"
after_contract="$(render_db_contract "${after_dir}")"

if [[ "${before_contract}" == "${after_contract}" ]]; then
  printf 'false\n'
else
  printf 'true\n'
fi
