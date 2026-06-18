#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 sha-abcdef1" >&2
  exit 64
fi

NEW_IMAGE_TAG="$1"
if [[ ! "$NEW_IMAGE_TAG" =~ ^sha-[0-9a-f]{7,40}$ ]]; then
  echo "IMAGE_TAG must use sha-<git-sha> format: $NEW_IMAGE_TAG" >&2
  exit 64
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_ROOT/homeserver/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/homeserver/.env}"
STATE_DIR="${STATE_DIR:-$REPO_ROOT/homeserver/.deploy-state}"
CURRENT_TAG_FILE="$STATE_DIR/current-image-tag"
PREVIOUS_TAG_FILE="$STATE_DIR/previous-image-tag"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:8088/actuator/health}"
HEALTHCHECK_HOST="${HEALTHCHECK_HOST:-api.cubing-hub.com}"
HEALTHCHECK_ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-20}"
HEALTHCHECK_INTERVAL_SECONDS="${HEALTHCHECK_INTERVAL_SECONDS:-3}"
HEALTHCHECK_CONNECT_TIMEOUT_SECONDS="${HEALTHCHECK_CONNECT_TIMEOUT_SECONDS:-5}"
HEALTHCHECK_MAX_TIME_SECONDS="${HEALTHCHECK_MAX_TIME_SECONDS:-10}"
LAST_HEALTHCHECK_FAILURE_REASON=""

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 66
fi

mkdir -p "$STATE_DIR"
PREVIOUS_IMAGE_TAG=""
if [[ -f "$CURRENT_TAG_FILE" ]]; then
  PREVIOUS_IMAGE_TAG="$(cat "$CURRENT_TAG_FILE")"
fi

compose() {
  IMAGE_TAG="$1" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "${@:2}"
}

health_check() {
  local attempt
  local response
  local response_body
  local http_status
  local up_status_pattern='"status"[[:space:]]*:[[:space:]]*"UP"'

  LAST_HEALTHCHECK_FAILURE_REASON="health check timeout"

  for ((attempt = 1; attempt <= HEALTHCHECK_ATTEMPTS; attempt++)); do
    response="$(
      curl -sS \
        -H "Host: $HEALTHCHECK_HOST" \
        --connect-timeout "$HEALTHCHECK_CONNECT_TIMEOUT_SECONDS" \
        --max-time "$HEALTHCHECK_MAX_TIME_SECONDS" \
        -w $'\n__HTTP_STATUS__:%{http_code}' \
        "$HEALTHCHECK_URL" 2>/dev/null || true
    )"
    http_status="${response##*__HTTP_STATUS__:}"
    response_body="${response%$'\n'__HTTP_STATUS__:*}"

    if [[ "$http_status" != "200" ]]; then
      LAST_HEALTHCHECK_FAILURE_REASON="HTTP status is not 200: $http_status"
      echo "Health check attempt $attempt/$HEALTHCHECK_ATTEMPTS returned HTTP $http_status." >&2
    elif [[ ! "$response_body" =~ $up_status_pattern ]]; then
      LAST_HEALTHCHECK_FAILURE_REASON="/actuator/health status is not UP"
      echo "Health check attempt $attempt/$HEALTHCHECK_ATTEMPTS returned HTTP 200 but status is not UP." >&2
    else
      return 0
    fi

    sleep "$HEALTHCHECK_INTERVAL_SECONDS"
  done

  if [[ -z "$LAST_HEALTHCHECK_FAILURE_REASON" ]]; then
    LAST_HEALTHCHECK_FAILURE_REASON="health check timeout"
  fi
  return 1
}

rollback() {
  if [[ -z "$PREVIOUS_IMAGE_TAG" ]]; then
    echo "No previous IMAGE_TAG is available for rollback." >&2
    return 1
  fi

  echo "Rolling back to $PREVIOUS_IMAGE_TAG" >&2
  if ! compose "$PREVIOUS_IMAGE_TAG" pull web app nginx mysql redis; then
    echo "Rollback docker compose pull failed." >&2
    return 1
  fi
  if ! compose "$PREVIOUS_IMAGE_TAG" up -d --remove-orphans; then
    echo "Rollback docker compose up -d failed." >&2
    return 1
  fi
  if ! health_check; then
    echo "Rollback health check failed: $LAST_HEALTHCHECK_FAILURE_REASON" >&2
    return 1
  fi
  printf '%s\n' "$PREVIOUS_IMAGE_TAG" > "$CURRENT_TAG_FILE"
}

handle_deploy_failure() {
  local reason="$1"

  echo "Deploy failed: $reason" >&2
  if rollback; then
    echo "Rollback completed." >&2
  else
    echo "Rollback failed." >&2
  fi
  exit 1
}

echo "Deploying $NEW_IMAGE_TAG"
if ! compose "$NEW_IMAGE_TAG" pull web app nginx mysql redis; then
  handle_deploy_failure "docker compose pull failed"
fi

if ! compose "$NEW_IMAGE_TAG" up -d --remove-orphans; then
  handle_deploy_failure "docker compose up -d failed"
fi

if health_check; then
  if [[ -n "$PREVIOUS_IMAGE_TAG" && "$PREVIOUS_IMAGE_TAG" != "$NEW_IMAGE_TAG" ]]; then
    printf '%s\n' "$PREVIOUS_IMAGE_TAG" > "$PREVIOUS_TAG_FILE"
  fi
  printf '%s\n' "$NEW_IMAGE_TAG" > "$CURRENT_TAG_FILE"
  compose "$NEW_IMAGE_TAG" ps
  exit 0
fi

handle_deploy_failure "$LAST_HEALTHCHECK_FAILURE_REASON"
