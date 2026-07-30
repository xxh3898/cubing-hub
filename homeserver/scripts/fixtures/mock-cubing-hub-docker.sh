#!/bin/bash

set -Eeuo pipefail

if [[ "${1:-}" == --config ]]; then
  shift 2
fi

command_name="${1:-}"
shift || true

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
      printf '%s\n' \
        '{"services":{"db":{"networks":{"application":null}},"redis":{"networks":{"application":null}},"api":{"networks":{"application":null,"outbound":null},"volumes":[{"type":"bind","source":"/Users/homeserver/Server/data/cubing-hub/post-images","target":"/data/post-images"}]},"web":{"networks":{"application":null,"edge":null},"volumes":[{"type":"bind","source":"/Users/homeserver/Server/data/cubing-hub/post-images","target":"/data/post-images","read_only":true},{"type":"bind","source":"/tmp/runtime/nginx/cloudflare-edge-real-ip.conf","target":"/etc/nginx/conf.d/00-cloudflare-real-ip.conf","read_only":true}]}},"networks":{"application":{"internal":true},"outbound":{},"edge":{"external":true,"name":"edge"}}}'
    elif [[ "${arguments}" == *" ps --status running --services "* ]]; then
      printf 'db\nredis\napi\nweb\n'
    fi
    ;;
  *)
    printf 'Unexpected mock Docker command: %s\n' "${command_name}" >&2
    exit 1
    ;;
esac
