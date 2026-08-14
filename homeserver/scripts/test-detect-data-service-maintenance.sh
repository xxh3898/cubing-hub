#!/bin/bash

set -Eeuo pipefail

readonly PROJECT_ROOT="$(
  CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd
)"
readonly DETECTOR="${PROJECT_ROOT}/homeserver/scripts/detect-data-service-maintenance.sh"

test_root="$(
  /usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-data-service-detector-test.XXXXXX"
)"

cleanup() {
  if [[ "$(/usr/bin/basename "${test_root}")" == cubing-data-service-detector-test.* ]]; then
    /bin/rm -rf -- "${test_root}"
  fi
}

trap cleanup EXIT INT TERM

write_compose() {
  local target="$1"
  local db_image="$2"
  local db_volume="$3"
  local safe_marker="$4"

  {
    printf 'name: cubing-hub\n'
    printf 'services:\n'
    printf '  db:\n'
    printf '    image: ${DB_IMAGE:-%s}\n' "${db_image}"
    printf '    volumes:\n'
    printf '      - mysql-data:/var/lib/mysql\n'
    printf '  web:\n'
    printf '    image: ${WEB_IMAGE:?WEB_IMAGE must be set}\n'
    printf '    labels:\n'
    printf '      io.chochiho.runtime-safe: "%s"\n' "${safe_marker}"
    printf 'volumes:\n'
    printf '  mysql-data:\n'
    if [[ "${db_volume}" != project-default ]]; then
      printf '    name: %s\n' "${db_volume}"
    fi
  } >"${target}"
}

assert_case() {
  local case_name="$1"
  local expected="$2"
  local before_image="$3"
  local before_volume="$4"
  local before_marker="$5"
  local after_image="$6"
  local after_volume="$7"
  local after_marker="$8"
  local change_application_only="$9"
  local case_dir="${test_root}/${case_name}"
  local before_sha
  local after_sha
  local actual

  /bin/mkdir -p "${case_dir}/homeserver" "${case_dir}/frontend"
  git -C "${case_dir}" init --quiet
  git -C "${case_dir}" config user.email test@example.invalid
  git -C "${case_dir}" config user.name "Data Service Detector Test"
  write_compose \
    "${case_dir}/homeserver/docker-compose.yml" \
    "${before_image}" \
    "${before_volume}" \
    "${before_marker}"
  printf 'base\n' >"${case_dir}/frontend/app.txt"
  git -C "${case_dir}" add homeserver/docker-compose.yml frontend/app.txt
  git -C "${case_dir}" commit --quiet -m base
  before_sha="$(git -C "${case_dir}" rev-parse HEAD)"

  write_compose \
    "${case_dir}/homeserver/docker-compose.yml" \
    "${after_image}" \
    "${after_volume}" \
    "${after_marker}"
  if [[ "${change_application_only}" == true ]]; then
    printf 'changed\n' >>"${case_dir}/frontend/app.txt"
  fi
  git -C "${case_dir}" add homeserver/docker-compose.yml frontend/app.txt
  git -C "${case_dir}" commit --quiet -m candidate
  after_sha="$(git -C "${case_dir}" rev-parse HEAD)"

  actual="$(
    cd "${case_dir}"
    /bin/bash "${DETECTOR}" "${before_sha}" "${after_sha}"
  )"
  if [[ "${actual}" != "${expected}" ]]; then
    printf 'Expected %s for %s, got %s\n' \
      "${expected}" \
      "${case_name}" \
      "${actual}" \
      >&2
    exit 1
  fi
}

assert_case \
  application-only \
  false \
  mysql:8.0.46 \
  project-default \
  base \
  mysql:8.0.46 \
  cubing-hub_mysql-data \
  base \
  true

assert_case \
  safe-runtime-update \
  false \
  mysql:8.0.46 \
  cubing-hub_mysql-data \
  base \
  mysql:8.0.46 \
  cubing-hub_mysql-data \
  changed \
  false

assert_case \
  db-image-change \
  true \
  mysql:8.0.46 \
  cubing-hub_mysql-data \
  base \
  mysql:8.4.11 \
  cubing-hub_mysql-data \
  base \
  false

assert_case \
  db-volume-change \
  true \
  mysql:8.0.46 \
  cubing-hub_mysql-data \
  base \
  mysql:8.0.46 \
  cubing-hub_mysql-data-next \
  base \
  false

assert_case \
  db-image-and-volume-change \
  true \
  mysql:8.0.46 \
  cubing-hub_mysql-data \
  base \
  mysql:8.4.11 \
  cubing-hub_mysql-data-next \
  base \
  false

bootstrap_dir="${test_root}/bootstrap"
/bin/mkdir -p "${bootstrap_dir}/homeserver"
git -C "${bootstrap_dir}" init --quiet
git -C "${bootstrap_dir}" config user.email test@example.invalid
git -C "${bootstrap_dir}" config user.name "Data Service Detector Test"
write_compose \
  "${bootstrap_dir}/homeserver/docker-compose.yml" \
  mysql:8.4.11 \
  cubing-hub_mysql-data \
  base
git -C "${bootstrap_dir}" add homeserver/docker-compose.yml
git -C "${bootstrap_dir}" commit --quiet -m bootstrap
bootstrap_sha="$(git -C "${bootstrap_dir}" rev-parse HEAD)"

test "$(
  cd "${bootstrap_dir}"
  /bin/bash "${DETECTOR}" \
    0000000000000000000000000000000000000000 \
    "${bootstrap_sha}"
)" = false

if (
  cd "${bootstrap_dir}"
  /bin/bash "${DETECTOR}" \
    aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
    "${bootstrap_sha}"
) >/dev/null 2>&1; then
  printf 'Missing baseline revision was accepted\n' >&2
  exit 1
fi

if (
  cd "${bootstrap_dir}"
  /bin/bash "${DETECTOR}" bad "${bootstrap_sha}"
) >/dev/null 2>&1; then
  printf 'Invalid revision was accepted\n' >&2
  exit 1
fi

if (
  cd "${bootstrap_dir}"
  /bin/bash "${DETECTOR}" \
    "${bootstrap_sha}" \
    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
) >/dev/null 2>&1; then
  printf 'Missing candidate revision was accepted\n' >&2
  exit 1
fi

printf 'Cubing Hub data-service maintenance detector tests passed\n'
