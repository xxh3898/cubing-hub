#!/bin/bash

set -euo pipefail

readonly PROJECT_NAME="cubing-hub-smoke"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly REPOSITORY_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly COMPOSE_FILE="${REPOSITORY_DIR}/homeserver/docker-compose.smoke.yml"
readonly ENV_FILE="${REPOSITORY_DIR}/homeserver/.env.smoke"
readonly DEFAULT_SMOKE_ORIGIN="http://smoke.localhost:18080"

usage() {
  cat <<'USAGE'
Usage: homeserver/scripts/smoke-v2-1.sh <up|status|logs|flyway|down|destroy>

up       Build the smoke API artifact and start the isolated stack.
status   Show only cubing-hub-smoke service status.
logs     Show only cubing-hub-smoke logs.
flyway   Print Flyway history from the smoke MySQL service.
down     Stop/remove smoke containers and network while retaining smoke volumes.
destroy  Remove only smoke containers, network, and disposable smoke volumes.
USAGE
}

require_smoke_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    printf 'Missing %s. Copy homeserver/.env.smoke.example first.\n' "${ENV_FILE}" >&2
    exit 1
  fi

  if /usr/bin/grep -Eq '/Users/homeserver/Server|api\.cubing-hub\.com|cubing-hub\.com' "${ENV_FILE}"; then
    printf 'Smoke environment file must not reference a production path or origin.\n' >&2
    exit 1
  fi

  if /usr/bin/grep -Eq '^SMOKE_(DB_PASSWORD|MYSQL_ROOT_PASSWORD|JWT_SECRET)=($|replace-with-)' "${ENV_FILE}"; then
    printf 'Replace every smoke credential placeholder in %s before starting.\n' "${ENV_FILE}" >&2
    exit 1
  fi
}

compose() {
  SMOKE_UID="$(/usr/bin/id -u)" \
  SMOKE_GID="$(/usr/bin/id -g)" \
    /usr/local/bin/docker compose \
      --project-name "${PROJECT_NAME}" \
      --env-file "${ENV_FILE}" \
      --file "${COMPOSE_FILE}" \
      "$@"
}

verify_local_origin() {
  local smoke_origin
  smoke_origin="$(/usr/bin/sed -n 's/^SMOKE_ORIGIN=//p' "${ENV_FILE}" | /usr/bin/tail -n 1)"

  if [[ -z "${smoke_origin}" ]]; then
    smoke_origin="${DEFAULT_SMOKE_ORIGIN}"
  fi

  if [[ "${smoke_origin}" != "${DEFAULT_SMOKE_ORIGIN}" ]]; then
    printf 'Stack is healthy. HTTP probe is skipped because SMOKE_ORIGIN is %s.\n' "${smoke_origin}"
    return
  fi

  /usr/bin/curl \
    --fail \
    --silent \
    --show-error \
    --resolve smoke.localhost:18080:127.0.0.1 \
    "${DEFAULT_SMOKE_ORIGIN}/actuator/health"
  /usr/bin/curl \
    --fail \
    --silent \
    --show-error \
    --resolve smoke.localhost:18080:127.0.0.1 \
    "${DEFAULT_SMOKE_ORIGIN}/" \
    >/dev/null
}

if [[ "$#" -ne 1 ]]; then
  usage >&2
  exit 1
fi

require_smoke_env

case "$1" in
  up)
    compose --profile build run --rm api-build
    compose up --detach --build --wait --wait-timeout 180
    compose ps
    verify_local_origin
    ;;
  status)
    compose ps
    ;;
  logs)
    compose logs --tail 200
    ;;
  flyway)
    compose exec -T mysql sh -ec \
      'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -h 127.0.0.1 -u root -e "SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank" "$MYSQL_DATABASE"'
    ;;
  down)
    compose --profile build down --remove-orphans
    ;;
  destroy)
    compose --profile build down --volumes --remove-orphans
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
