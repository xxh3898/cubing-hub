#!/bin/bash

set -Eeuo pipefail

readonly DEPLOY_SCRIPT=/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub.sh

original_command="${SSH_ORIGINAL_COMMAND:-}"

if [[ ! "${original_command}" =~ ^deploy-cubing-hub[[:space:]]([0-9a-fA-F]{40})[[:space:]]([A-Za-z0-9_-]+)$ ]]; then
  printf 'Only deploy-cubing-hub <commit-sha> <registry-user> is allowed\n' >&2
  exit 64
fi

exec "${DEPLOY_SCRIPT}" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
