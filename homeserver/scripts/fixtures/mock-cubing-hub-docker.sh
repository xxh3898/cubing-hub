#!/bin/bash

set -Eeuo pipefail

if [[ "${1:-}" == --config ]]; then
  shift 2
fi

command_name="${1:-}"
shift || true

if [[ -n "${FAKE_DOCKER_LOG:-}" ]]; then
  printf '%s %s\n' "${command_name}" "$*" >>"${FAKE_DOCKER_LOG}"
fi

case "${command_name}" in
  login|logout|pull|rm)
    exit 0
    ;;
  create)
    printf 'mock-runtime-config-container\n'
    ;;
  cp)
    destination="$2"
    /bin/mkdir -p "${destination}/nginx"
    if [[ "${FAKE_FAIL_CP:-false}" == true ]]; then
      exit 1
    fi
    /bin/cp "${FAKE_RUNTIME_COMPOSE}" "${destination}/compose.yaml"
    /bin/cp \
      "${FAKE_RUNTIME_REAL_IP}" \
      "${destination}/nginx/cloudflare-edge-real-ip.conf"
    ;;
  image)
    test "$1" = inspect
    shift
    test "$1" = --format
    shift
    format="$1"
    image="$2"
    if [[ "${format}" == *org.opencontainers.image.revision* ]]; then
      case "${image}" in
        *cubing-hub-runtime-config*)
          printf '%s\n' "${FAKE_CONFIG_REVISION}"
          ;;
        *"${FAKE_REVISION_ONE}"*)
          printf '%s\n' "${FAKE_REVISION_ONE}"
          ;;
        *"${FAKE_REVISION_TWO}"*)
          printf '%s\n' "${FAKE_REVISION_TWO}"
          ;;
        *)
          printf '%s\n' "${FAKE_REVISION_THREE}"
          ;;
      esac
    elif [[ "${format}" == *io.chochiho.runtime-config.project* ]]; then
      printf 'cubing-hub\n'
    else
      exit 1
    fi
    ;;
  compose)
    arguments=" $* "
    if [[ "${arguments}" == *" --format json "* ]]; then
      compose_file=
      previous_argument=
      for argument in "$@"; do
        if [[ "${previous_argument}" == --file ]]; then
          compose_file="${argument}"
          break
        fi
        previous_argument="${argument}"
      done
      api_image="${FAKE_RENDER_API_IMAGE:-${API_IMAGE}}"
      web_image="${FAKE_RENDER_WEB_IMAGE:-${WEB_IMAGE}}"
      db_image="${FAKE_RENDER_DB_IMAGE:-mysql:8.0.46}"
      redis_image="${FAKE_RENDER_REDIS_IMAGE:-redis:7.2.14-alpine}"
      real_ip_source="$(
        /usr/bin/dirname "${compose_file}"
      )/nginx/cloudflare-edge-real-ip.conf"
      real_ip_source="${FAKE_RENDER_REAL_IP_SOURCE:-${real_ip_source}}"
      upload_source="${FAKE_RENDER_UPLOAD_SOURCE:-/Users/homeserver/Server/data/cubing-hub/post-images}"
      database_name="${FAKE_RENDER_DATABASE_NAME:-cubing_hub}"
      ddl_auto="${FAKE_RENDER_DDL_AUTO:-validate}"
      redis_command_json="${FAKE_RENDER_REDIS_COMMAND_JSON:-[\"redis-server\",\"--appendonly\",\"yes\",\"--appendfsync\",\"everysec\"]}"
      edge_alias="${FAKE_RENDER_EDGE_ALIAS:-cubing-hub-web}"
      web_healthcheck='{"test":["CMD-SHELL","wget --header='\''Host: api.cubing-hub.com'\'' -qO- http://127.0.0.1/actuator/health | grep -q '\''\"status\":\"UP\"'\''"]}'
      if [[ "${FAKE_DISABLE_WEB_HEALTHCHECK:-false}" == true ]]; then
        web_healthcheck='{"disable":true}'
      fi
      web_profiles='[]'
      if [[ "${FAKE_RENDER_WEB_PROFILE:-false}" == true ]]; then
        web_profiles='["optional"]'
      fi
      web_restart="${FAKE_RENDER_RESTART_POLICY:-unless-stopped}"
      web_scale="${FAKE_RENDER_WEB_SCALE:-1}"
      printf \
        '{"name":"cubing-hub","services":{"db":{"image":"%s","restart":"unless-stopped","environment":{"MYSQL_DATABASE":"%s"},"healthcheck":{"test":["CMD-SHELL","mysqladmin ping -h 127.0.0.1 -u root --password=\\\"$${MYSQL_ROOT_PASSWORD}\\\" --silent"]},"networks":{"application":null},"volumes":[{"type":"volume","source":"mysql-data","target":"/var/lib/mysql"}]},"redis":{"image":"%s","restart":"unless-stopped","command":%s,"healthcheck":{"test":["CMD","redis-cli","ping"]},"networks":{"application":null},"volumes":[{"type":"volume","source":"redis-data","target":"/data"}]},"api":{"image":"%s","restart":"unless-stopped","environment":{"SPRING_JPA_HIBERNATE_DDL_AUTO":"%s"},"networks":{"application":null,"outbound":null},"volumes":[{"type":"bind","source":"%s","target":"/data/post-images"}]},"web":{"image":"%s","restart":"%s","scale":%s,"profiles":%s,"healthcheck":%s,"networks":{"application":null,"edge":{"aliases":["%s"]}},"volumes":[{"type":"bind","source":"%s","target":"/data/post-images","read_only":true},{"type":"bind","source":"%s","target":"/etc/nginx/conf.d/00-cloudflare-real-ip.conf","read_only":true}]}},"networks":{"application":{"internal":true},"outbound":{},"edge":{"external":true,"name":"edge"}},"volumes":{"mysql-data":{"name":"cubing-hub_mysql-data"},"redis-data":{"name":"cubing-hub_redis-data"}}}\n' \
        "${db_image}" \
        "${database_name}" \
        "${redis_image}" \
        "${redis_command_json}" \
        "${api_image}" \
        "${ddl_auto}" \
        "${upload_source}" \
        "${web_image}" \
        "${web_restart}" \
        "${web_scale}" \
        "${web_profiles}" \
        "${web_healthcheck}" \
        "${edge_alias}" \
        "${upload_source}" \
        "${real_ip_source}"
    elif [[ "${arguments}" == *" ps --status running --services "* ]]; then
      printf 'db\nredis\napi\nweb\n'
    fi
    ;;
  *)
    printf 'Unexpected mock Docker command: %s\n' "${command_name}" >&2
    exit 1
    ;;
esac
