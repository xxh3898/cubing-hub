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
      real_ip_source="$(
        /usr/bin/dirname "${compose_file}"
      )/nginx/cloudflare-edge-real-ip.conf"
      real_ip_source="${FAKE_RENDER_REAL_IP_SOURCE:-${real_ip_source}}"
      printf \
        '{"name":"cubing-hub","services":{"db":{"networks":{"application":null},"volumes":[{"type":"volume","source":"mysql-data","target":"/var/lib/mysql"}]},"redis":{"networks":{"application":null},"volumes":[{"type":"volume","source":"redis-data","target":"/data"}]},"api":{"image":"%s","networks":{"application":null,"outbound":null},"volumes":[{"type":"bind","source":"/Users/homeserver/Server/data/cubing-hub/post-images","target":"/data/post-images"}]},"web":{"image":"%s","networks":{"application":null,"edge":null},"volumes":[{"type":"bind","source":"/Users/homeserver/Server/data/cubing-hub/post-images","target":"/data/post-images","read_only":true},{"type":"bind","source":"%s","target":"/etc/nginx/conf.d/00-cloudflare-real-ip.conf","read_only":true}]}},"networks":{"application":{"internal":true},"outbound":{},"edge":{"external":true,"name":"edge"}},"volumes":{"mysql-data":{"name":"cubing-hub_mysql-data"},"redis-data":{"name":"cubing-hub_redis-data"}}}\n' \
        "${api_image}" \
        "${web_image}" \
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
