#!/bin/bash

set -Eeuo pipefail

readonly DOCKER_BIN=/usr/local/bin/docker
readonly PYTHON_BIN=/usr/bin/python3
readonly RM_BIN=/bin/rm
readonly HOMEOPS_EVENT_REPORTER=/Users/homeserver/Server/apps/homeops/runtime-config/current/scripts/report-homeops-event.py
readonly CURL_BIN=/usr/bin/curl
readonly APP_DIR=/Users/homeserver/Server/apps/cubing-hub
readonly PROJECT_NAME=cubing-hub
readonly LEGACY_COMPOSE_FILE="${APP_DIR}/compose.yaml"
readonly ENV_FILE="${APP_DIR}/.env"
readonly BACKUP_SCRIPT=/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh
readonly RUNTIME_CONFIG_ROOT="${APP_DIR}/runtime-config"
readonly RUNTIME_CONFIG_RELEASES="${RUNTIME_CONFIG_ROOT}/releases"
readonly RUNTIME_CONFIG_STATE="${RUNTIME_CONFIG_ROOT}/state"
readonly RUNTIME_CONFIG_PENDING="${RUNTIME_CONFIG_ROOT}/pending"
readonly RUNTIME_CONFIG_CURRENT="${RUNTIME_CONFIG_ROOT}/current"
readonly RUNTIME_CONFIG_INITIALIZED="${APP_DIR}/.runtime-config-v2-initialized"
readonly API_IMAGE_REPOSITORY=ghcr.io/xxh3898/cubing-hub-api
readonly WEB_IMAGE_REPOSITORY=ghcr.io/xxh3898/cubing-hub-web
readonly RUNTIME_CONFIG_REPOSITORY=ghcr.io/xxh3898/cubing-hub-runtime-config
readonly ZERO_SHA=0000000000000000000000000000000000000000
readonly ZERO_DIGEST=sha256:0000000000000000000000000000000000000000000000000000000000000000
readonly HEALTH_TIMEOUT_SECONDS=240
readonly MIGRATION_MAIN_CLASS=com.cubinghub.ops.MigrationMain
readonly MIGRATION_JAR=/app/app.jar
readonly PUBLIC_WEB_URL=https://cubing-hub.com
readonly PUBLIC_DEEP_LINK_URL=https://cubing-hub.com/rankings
readonly PUBLIC_API_HEALTH_URL=https://api.cubing-hub.com/actuator/health
readonly PUBLIC_API_REPRESENTATIVE_URL='https://api.cubing-hub.com/api/rankings?eventType=WCA_333&page=1&size=1'

usage() {
  printf '%s\n' \
    'Usage:' \
    '  deploy-cubing-hub.sh <commit-sha> <registry-user>' \
    '  deploy-cubing-hub.sh <commit-sha> keep <registry-user>' \
    '  deploy-cubing-hub.sh <commit-sha> update <config-digest> <registry-user>' \
    '  deploy-cubing-hub.sh recover' \
    >&2
}

fail() {
  printf 'Cubing Hub deployment failed: %s\n' "$1" >&2
  exit 1
}

require_legacy_compose() {
  if [[ ! -f "${LEGACY_COMPOSE_FILE}" ]]; then
    fail "legacy production Compose configuration is missing"
  fi
}

validate_initialization_marker() {
  if [[ ! -f "${RUNTIME_CONFIG_INITIALIZED}" ]] \
    || [[ -L "${RUNTIME_CONFIG_INITIALIZED}" ]] \
    || [[ "$(/bin/cat "${RUNTIME_CONFIG_INITIALIZED}")" != RUNTIME_CONFIG_V2=initialized ]]
  then
    fail "runtime config initialization marker is invalid"
  fi
}

is_digest() {
  [[ "$1" =~ ^sha256:[0-9a-f]{64}$ ]] && [[ "$1" != "${ZERO_DIGEST}" ]]
}

legacy_mode=false
recovery_mode=false
config_mode=legacy
config_digest=
commit_sha=
registry_user=

case "$#" in
  1)
    if [[ "$1" != recover ]]; then
      usage
      exit 64
    fi
    recovery_mode=true
    config_mode=recover
    ;;
  2)
    legacy_mode=true
    commit_sha="$1"
    registry_user="$2"
    ;;
  3)
    commit_sha="$1"
    config_mode="$2"
    registry_user="$3"
    if [[ "${config_mode}" != keep ]]; then
      usage
      exit 64
    fi
    ;;
  4)
    commit_sha="$1"
    config_mode="$2"
    config_digest="$3"
    registry_user="$4"
    if [[ "${config_mode}" != update ]]; then
      usage
      exit 64
    fi
    ;;
  *)
    usage
    exit 64
    ;;
esac

if [[ "${recovery_mode}" == false && ! "${commit_sha}" =~ ^[0-9a-fA-F]{40}$ ]]; then
  printf 'Commit SHA must contain exactly 40 hexadecimal characters\n' >&2
  exit 64
fi

if [[ "${recovery_mode}" == false && ! "${registry_user}" =~ ^[A-Za-z0-9_-]+$ ]]; then
  printf 'Registry user contains unsupported characters\n' >&2
  exit 64
fi

if [[ "${config_mode}" == update ]] \
  && { [[ ! "${config_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] || [[ "${config_digest}" == "${ZERO_DIGEST}" ]]; }
then
  printf 'Runtime config digest must use sha256 followed by 64 lowercase hexadecimal characters\n' >&2
  exit 64
fi

if [[ ! -x "${DOCKER_BIN}" ]]; then
  fail "Docker CLI is not executable: ${DOCKER_BIN}"
fi

if [[ ! -x "${PYTHON_BIN}" ]]; then
  fail "Python is not executable: ${PYTHON_BIN}"
fi
if [[ ! -x "${CURL_BIN}" ]]; then
  fail "curl is not executable: ${CURL_BIN}"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  fail "production environment configuration is missing"
fi

if [[ "${recovery_mode}" == false ]] \
  && [[ -e "${RUNTIME_CONFIG_PENDING}" || -L "${RUNTIME_CONFIG_PENDING}" ]]
then
  fail "an incomplete runtime config transaction requires recovery"
fi
if [[ -e "${RUNTIME_CONFIG_INITIALIZED}" || -L "${RUNTIME_CONFIG_INITIALIZED}" ]]; then
  validate_initialization_marker
  if [[ ! -f "${RUNTIME_CONFIG_STATE}" || -L "${RUNTIME_CONFIG_STATE}" ]] \
    || [[ ! -L "${RUNTIME_CONFIG_CURRENT}" ]]
  then
    fail "initialized runtime config requires verified state and current pointer"
  fi
elif [[ "${recovery_mode}" == false ]] \
  && {
    [[ -e "${RUNTIME_CONFIG_STATE}" || -L "${RUNTIME_CONFIG_STATE}" ]] \
      || [[ -e "${RUNTIME_CONFIG_CURRENT}" || -L "${RUNTIME_CONFIG_CURRENT}" ]];
  }
then
  fail "runtime config state exists without initialization marker"
fi
if [[ "${legacy_mode}" == true ]] \
  && {
    [[ -e "${RUNTIME_CONFIG_STATE}" || -L "${RUNTIME_CONFIG_STATE}" ]] \
      || [[ -e "${RUNTIME_CONFIG_CURRENT}" || -L "${RUNTIME_CONFIG_CURRENT}" ]];
  }
then
  fail "legacy deployment is disabled after runtime config state initialization"
fi
if [[ "${legacy_mode}" == true ]]; then
  require_legacy_compose
fi

if [[ "${legacy_mode}" == true && ! -x "${BACKUP_SCRIPT}" ]]; then
  fail "production backup script is not executable"
fi

registry_token=
if [[ "${recovery_mode}" == false ]]; then
  registry_token="$(/bin/cat)"
  if [[ -z "${registry_token}" ]]; then
    printf 'GHCR token must not be empty\n' >&2
    exit 64
  fi
fi

umask 077

docker_config_dir="$(
  /usr/bin/mktemp -d "${TMPDIR:-/tmp}/cubing-hub-docker-config.XXXXXX"
)"
env_temp=
state_temp=
pending_temp=
release_temp=
current_link_temp=
initialization_temp=
config_container_id=
prepared_release=
logged_in=false
homeops_deployment_started_at=
homeops_deployment_event_key=
homeops_rollback_succeeded=false

report_homeops_deployment() {
  local status="$1"
  local finished_at="$2"
  local payload

  if [[ -z "${homeops_deployment_event_key}" ]]; then
    return
  fi
  if [[ ! -f "${HOMEOPS_EVENT_REPORTER}" || -L "${HOMEOPS_EVENT_REPORTER}" || ! -x "${HOMEOPS_EVENT_REPORTER}" ]]; then
    printf 'HomeOps deployment event reporter is unavailable\n' >&2
    return
  fi
  payload="$(
    "${PYTHON_BIN}" - \
      "${homeops_deployment_event_key}" \
      "${normalized_sha}" \
      "${previous_sha:-}" \
      "${status}" \
      "${homeops_deployment_started_at}" \
      "${finished_at}" <<'PY'
import json, sys
event_key, commit_sha, previous_sha, status, started_at, finished_at = sys.argv[1:]
print(json.dumps({
    "eventKey": event_key,
    "project": "cubing-hub",
    "environment": "production",
    "branch": "main",
    "commitSha": commit_sha,
    "imageTag": commit_sha,
    "previousCommitSha": previous_sha or None,
    "status": status,
    "startedAt": started_at,
    "finishedAt": finished_at or None,
    "failureStage": "deploy-worker" if status == "FAILED" else None,
    "failureSummary": "deployment worker exited unsuccessfully" if status == "FAILED" else None,
    "actor": "home-server-deploy",
    "rollback": status == "ROLLED_BACK",
}, separators=(",", ":")))
PY
  )" || {
    printf 'HomeOps deployment event payload could not be generated\n' >&2
    return
  }
  if ! printf '%s' "${payload}" | "${HOMEOPS_EVENT_REPORTER}" deployments; then
    printf 'HomeOps deployment event could not be retained\n' >&2
  fi
}

# ShellCheck cannot infer that trap invokes this cleanup function.
# shellcheck disable=SC2329
cleanup() {
  local exit_status="$?"
  local cleanup_failed=false
  local finished_at=

  registry_token=

  if [[ -n "${env_temp}" && -e "${env_temp}" ]] \
    && ! "${RM_BIN}" -f -- "${env_temp}"
  then
    printf 'Deployment cleanup failed to remove temporary environment file\n' >&2
    cleanup_failed=true
  fi

  if [[ -n "${config_container_id}" ]]; then
    "${DOCKER_BIN}" rm "${config_container_id}" >/dev/null 2>&1 || true
  fi

  for cleanup_path in \
    "${state_temp}" \
    "${pending_temp}" \
    "${current_link_temp}" \
    "${initialization_temp}"
  do
    if [[ -n "${cleanup_path}" && -e "${cleanup_path}" ]] \
      && ! "${RM_BIN}" -f -- "${cleanup_path}"
    then
      printf 'Deployment cleanup failed to remove temporary runtime-config path\n' >&2
      cleanup_failed=true
    fi
  done

  if [[ -n "${release_temp}" && -d "${release_temp}" ]] \
    && [[ "$(/usr/bin/basename "${release_temp}")" == .tmp.* ]]
  then
    if ! "${RM_BIN}" -rf -- "${release_temp}"; then
      printf 'Deployment cleanup failed to remove temporary runtime-config release\n' >&2
      cleanup_failed=true
    fi
  fi

  if [[ "${logged_in}" == true ]]; then
    "${DOCKER_BIN}" \
      --config "${docker_config_dir}" \
      logout ghcr.io \
      >/dev/null 2>&1 \
      || true
  fi

  if [[ "$(/usr/bin/basename "${docker_config_dir}")" == cubing-hub-docker-config.* ]]; then
    if ! "${RM_BIN}" -rf -- "${docker_config_dir}"; then
      printf 'Deployment cleanup failed to remove temporary Docker credentials\n' >&2
      cleanup_failed=true
    fi
  fi

  if [[ "${cleanup_failed}" == true && "${exit_status}" -eq 0 ]]; then
    exit_status=1
  fi

  if [[ -n "${homeops_deployment_event_key}" ]]; then
    if ! finished_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"; then
      printf 'HomeOps deployment completion time could not be generated\n' >&2
    elif [[ "${exit_status}" -eq 0 ]]; then
      report_homeops_deployment SUCCESS "${finished_at}" || true
    elif [[ "${homeops_rollback_succeeded}" == true ]]; then
      report_homeops_deployment ROLLED_BACK "${finished_at}" || true
    else
      report_homeops_deployment FAILED "${finished_at}" || true
    fi
  fi
  return "${exit_status}"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

active_compose_file="${LEGACY_COMPOSE_FILE}"

compose() {
  "${DOCKER_BIN}" \
    compose \
    --project-name "${PROJECT_NAME}" \
    --project-directory "$(/usr/bin/dirname "${active_compose_file}")" \
    --env-file "${ENV_FILE}" \
    --file "${active_compose_file}" \
    "$@"
}

read_env_value() {
  local key="$1"
  local value

  value="$(
    /usr/bin/awk -F= -v key="${key}" '
      $1 == key {
        value = substr($0, index($0, "=") + 1)
        count += 1
      }
      END {
        if (count != 1) {
          exit 1
        }
        print value
      }
    ' "${ENV_FILE}"
  )" || fail "${key} must appear exactly once in ${ENV_FILE}"

  printf '%s' "${value}"
}

write_image_env() {
  local api_image="$1"
  local web_image="$2"

  env_temp="$(/usr/bin/mktemp "${APP_DIR}/.env.tmp.XXXXXX")"

  if ! /usr/bin/awk \
    -v api_image="${api_image}" \
    -v web_image="${web_image}" '
      BEGIN {
        api_count = 0
        web_count = 0
      }
      /^API_IMAGE=/ {
        print "API_IMAGE=" api_image
        api_count += 1
        next
      }
      /^WEB_IMAGE=/ {
        print "WEB_IMAGE=" web_image
        web_count += 1
        next
      }
      {
        print
      }
      END {
        if (api_count != 1 || web_count != 1) {
          exit 1
        }
      }
    ' "${ENV_FILE}" >"${env_temp}"
  then
    fail "API_IMAGE and WEB_IMAGE must each appear once in ${ENV_FILE}"
  fi

  /bin/chmod 600 "${env_temp}"
  /bin/mv -f -- "${env_temp}" "${ENV_FILE}"
  env_temp=
}

extract_sha() {
  local image="$1"
  local repository="$2"
  local image_sha="${image#"${repository}:"}"

  if [[ "${image}" != "${repository}:${image_sha}" ]] \
    || [[ ! "${image_sha}" =~ ^[0-9a-fA-F]{40}$ ]] \
    || [[ "${image_sha}" == "0000000000000000000000000000000000000000" ]]
  then
    return 1
  fi

  printf '%s' "${image_sha}"
}

read_state_value() {
  local key="$1"
  if [[ ! -f "${RUNTIME_CONFIG_STATE}" ]]; then
    return 0
  fi
  /usr/bin/sed -n "s/^${key}=//p" "${RUNTIME_CONFIG_STATE}" \
    | /usr/bin/tail -n 1
}

release_dir_for_digest() {
  printf '%s/%s\n' "${RUNTIME_CONFIG_RELEASES}" "${1#sha256:}"
}

validate_release_files() {
  local release_dir="$1"
  local entries
  local unexpected

  if [[ ! -d "${release_dir}" || -L "${release_dir}" ]]; then
    fail "runtime config release is missing or unsafe"
  fi
  unexpected="$(
    /usr/bin/find "${release_dir}" ! -type d ! -type f -print
  )"
  if [[ -n "${unexpected}" ]]; then
    fail "runtime config contains unsupported file types"
  fi

  entries="$(
    /usr/bin/find "${release_dir}" -mindepth 1 -print \
      | /usr/bin/sed "s#^${release_dir}/##" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${entries}" == $'compose.yaml\nnginx\nnginx/cloudflare-edge-real-ip.conf' ]]; then
    return
  fi
  if [[ "${entries}" != $'compose.yaml\nnginx\nnginx/cloudflare-edge-real-ip.conf\nscripts\nscripts/backup-cubing-hub.sh\nscripts/deploy-cubing-hub.sh' ]]; then
    fail "runtime config entry allowlist does not match"
  fi
  validate_release_scripts "${release_dir}"
}

validate_candidate_release_files() {
  local release_dir="$1"

  validate_release_files "${release_dir}"
  if ! release_has_synced_scripts "${release_dir}"; then
    fail "candidate runtime config must contain deploy and backup scripts"
  fi
}

release_has_synced_scripts() {
  local release_dir="$1"

  [[ -f "${release_dir}/scripts/backup-cubing-hub.sh" ]] \
    && [[ ! -L "${release_dir}/scripts/backup-cubing-hub.sh" ]] \
    && [[ -f "${release_dir}/scripts/deploy-cubing-hub.sh" ]] \
    && [[ ! -L "${release_dir}/scripts/deploy-cubing-hub.sh" ]]
}

validate_release_scripts() {
  local release_dir="$1"
  local script

  for script in \
    "${release_dir}/scripts/backup-cubing-hub.sh" \
    "${release_dir}/scripts/deploy-cubing-hub.sh"
  do
    if [[ ! -x "${script}" ]]; then
      fail "runtime config script is not executable"
    fi
    if ! "${PYTHON_BIN}" -c \
      'import os, stat, sys; raise SystemExit(0 if stat.S_IMODE(os.stat(sys.argv[1]).st_mode) == 0o700 else 1)' \
      "${script}"
    then
      fail "runtime config script mode must be 700"
    fi
    if ! /bin/bash -n "${script}"; then
      fail "runtime config script syntax is invalid"
    fi
  done
}

runtime_config_content_sha256() {
  local release_dir="$1"
  {
    /usr/bin/shasum -a 256 "${release_dir}/compose.yaml"
    /usr/bin/shasum -a 256 \
      "${release_dir}/nginx/cloudflare-edge-real-ip.conf"
    if release_has_synced_scripts "${release_dir}"; then
      /usr/bin/shasum -a 256 \
        "${release_dir}/scripts/backup-cubing-hub.sh"
      /usr/bin/shasum -a 256 \
        "${release_dir}/scripts/deploy-cubing-hub.sh"
    fi
  } | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
}

render_compose_json() {
  local compose_file="$1"
  local api_image="$2"
  local web_image="$3"

  API_IMAGE="${api_image}" \
  WEB_IMAGE="${web_image}" \
    "${DOCKER_BIN}" \
      compose \
      --project-name "${PROJECT_NAME}" \
      --project-directory "$(/usr/bin/dirname "${compose_file}")" \
      --env-file "${ENV_FILE}" \
      --file "${compose_file}" \
      config \
      --no-env-resolution \
      --format json
}

validate_compose_contract() {
  local compose_file="$1"
  local api_image="$2"
  local web_image="$3"
  local baseline_file="${validation_baseline_compose_file:-${compose_file}}"
  local baseline_api_image="${validation_baseline_api_image:-${api_image}}"
  local baseline_web_image="${validation_baseline_web_image:-${web_image}}"
  local candidate_rendered
  local baseline_rendered

  candidate_rendered="$(
    render_compose_json \
      "${compose_file}" \
      "${api_image}" \
      "${web_image}"
  )"
  baseline_rendered="$(
    render_compose_json \
      "${baseline_file}" \
      "${baseline_api_image}" \
      "${baseline_web_image}"
  )"

  printf '[%s,%s]' \
    "${candidate_rendered}" \
    "${baseline_rendered}" \
    | "${PYTHON_BIN}" -c '
import json
import posixpath
import sys

candidate, baseline = json.load(sys.stdin)
expected_api_image, expected_web_image, expected_real_ip_source = sys.argv[1:4]
required_services = {"db", "redis", "api", "web"}

def fail(message):
    raise SystemExit(message)

def services(config, label):
    value = config.get("services", {})
    if set(value) != required_services:
        fail(f"{label} runtime config must contain only db, redis, api, and web")
    return value

candidate_services = services(candidate, "candidate")
baseline_services = services(baseline, "active")

if candidate.get("configs") or candidate.get("secrets"):
    fail("runtime config must not define Compose configs or secrets")
for name, service in candidate_services.items():
    if service.get("configs") or service.get("secrets") or service.get("env_file"):
        fail(f"{name} must not mount configs, secrets, or env files")

if candidate.get("name") != "cubing-hub":
    fail("Compose project name must remain cubing-hub")
if candidate_services["api"].get("image") != expected_api_image:
    fail("API image does not match the requested deployment")
if candidate_services["web"].get("image") != expected_web_image:
    fail("Web image does not match the requested deployment")
for name in ("db", "redis"):
    if candidate_services[name].get("image") != baseline_services[name].get("image"):
        fail(f"{name} image changes require a separate data-service procedure")
    for field in ("command", "entrypoint"):
        if candidate_services[name].get(field) != baseline_services[name].get(field):
            fail(f"{name} {field} changes require a separate data-service procedure")

def service_environment(service, label):
    environment = service.get("environment", {})
    if not isinstance(environment, dict):
        fail(f"{label} environment contract is invalid")
    return environment

candidate_db_environment = service_environment(candidate_services["db"], "db")
baseline_db_environment = service_environment(baseline_services["db"], "active db")
if (
    {
        name: value
        for name, value in candidate_db_environment.items()
        if name.startswith("MYSQL_")
    }
    != {
        name: value
        for name, value in baseline_db_environment.items()
        if name.startswith("MYSQL_")
    }
):
    fail("db MYSQL environment changes require a separate data-service procedure")

protected_api_environment_names = {
    "DB_USERNAME",
    "DB_PASSWORD",
    "JDK_JAVA_OPTIONS",
    "JAVA_OPTS",
    "JAVA_TOOL_OPTIONS",
    "REDIS_HOST",
    "REDIS_PORT",
    "RANKING_REDIS_REBUILD_MODE",
    "SPRING_APPLICATION_JSON",
    "_JAVA_OPTIONS",
}
protected_api_environment_prefixes = (
    "POST_IMAGES_",
    "SPRING_CONFIG_",
    "SPRING_PROFILES_",
    "SPRING_DATASOURCE_",
    "SPRING_JPA_",
    "SPRING_FLYWAY_",
    "SPRING_LIQUIBASE_",
    "SPRING_SQL_INIT_",
)

def protected_api_environment(service):
    environment = service_environment(service, "API")
    return {
        name: value
        for name, value in environment.items()
        if (
            name in protected_api_environment_names
            or name.startswith(protected_api_environment_prefixes)
        )
        and name != "SPRING_FLYWAY_ENABLED"
    }

candidate_api_environment = service_environment(candidate_services["api"], "API")
if candidate_api_environment.get("SPRING_FLYWAY_ENABLED") != "false":
    fail("normal API startup must keep Flyway disabled")

if (
    protected_api_environment(candidate_services["api"])
    != protected_api_environment(baseline_services["api"])
):
    fail("API data-sensitive environment changes require a separate migration procedure")

def healthcheck_test_for(service, label):
    healthcheck = service.get("healthcheck")
    if healthcheck is None:
        return None
    if not isinstance(healthcheck, dict) or healthcheck.get("disable") is True:
        fail(f"{label} healthcheck is invalid")
    test = healthcheck.get("test")
    if (
        not isinstance(test, list)
        or not test
        or test[0] not in ("CMD", "CMD-SHELL")
    ):
        fail(f"{label} healthcheck probe is invalid")
    return test

def tmpfs_targets_for(service, label):
    entries = service.get("tmpfs", [])
    if entries is None:
        return set()
    if not isinstance(entries, list):
        fail(f"{label} tmpfs contract is invalid")
    targets = []
    for entry in entries:
        if isinstance(entry, str):
            target = entry.split(":", 1)[0]
        elif isinstance(entry, dict):
            target = entry.get("target")
        else:
            fail(f"{label} tmpfs contract is invalid")
        if not isinstance(target, str) or not target.startswith("/"):
            fail(f"{label} tmpfs target is invalid")
        targets.append(posixpath.normpath(target))
    if len(targets) != len(set(targets)):
        fail(f"{label} tmpfs target set is invalid")
    return set(targets)

for name in ("db", "redis", "api", "web"):
    if candidate_services[name].get("user") != baseline_services[name].get("user"):
        fail(f"{name} user differs from the active verified configuration")
    if tmpfs_targets_for(candidate_services[name], name) != tmpfs_targets_for(
        baseline_services[name],
        f"active {name}",
    ):
        fail(f"{name} tmpfs target set differs from the active verified configuration")
    if healthcheck_test_for(
        candidate_services[name],
        name,
    ) != healthcheck_test_for(
        baseline_services[name],
        f"active {name}",
    ):
        fail(f"{name} healthcheck test differs from the active verified configuration")

for name, service in candidate_services.items():
    if service.get("ports"):
        fail(f"{name} must not publish host ports")
    if service.get("extra_hosts") or service.get("external_links") or service.get("links"):
        fail(f"{name} must not override protected service hostnames")
    if (
        service.get("privileged") is True
        or service.get("use_api_socket") is True
        or service.get("cap_add")
        or service.get("devices")
        or service.get("volumes_from")
    ):
        fail(f"{name} must not receive host or Docker privileges")
    for field in ("pid", "ipc", "uts", "cgroup", "userns_mode", "network_mode"):
        if service.get(field) == "host":
            fail(f"{name} must not share the host namespace")

for name in ("api", "web"):
    for field in ("command", "entrypoint"):
        if candidate_services[name].get(field) is not None:
            fail(f"{name} must not override its image {field}")

expected_attachments = {
    "db": {"application"},
    "redis": {"application"},
    "api": {"application", "outbound"},
    "web": {"application", "edge"},
}
for name, expected in expected_attachments.items():
    attachments = candidate_services[name].get("networks", {})
    if set(attachments) != expected:
        fail(f"{name} network boundary is invalid")
web_edge = candidate_services["web"]["networks"].get("edge")
if not isinstance(web_edge, dict) or web_edge.get("aliases") != ["cubing-hub-web"]:
    fail("Web edge alias must remain cubing-hub-web")

networks = candidate.get("networks", {})
if set(networks) != {"application", "outbound", "edge"}:
    fail("runtime config network set is invalid")
application = networks["application"]
outbound = networks["outbound"]
edge = networks["edge"]
if (
    application.get("name") != "cubing-hub_application"
    or application.get("driver") not in (None, "bridge")
    or application.get("internal") is not True
    or application.get("external") is True
    or application.get("driver_opts")
):
    fail("application network must remain project-private and internal")
if (
    outbound.get("name") != "cubing-hub_outbound"
    or outbound.get("driver") not in (None, "bridge")
    or outbound.get("internal") is True
    or outbound.get("external") is True
    or outbound.get("driver_opts")
):
    fail("outbound network must remain a project-private egress bridge")
if edge.get("name") != "edge" or edge.get("external") is not True:
    fail("edge network must remain the shared external edge")

volumes = candidate.get("volumes", {})
if set(volumes) != {"mysql-data", "redis-data"}:
    fail("runtime config data volume set is invalid")
for key, expected_name, message in (
    ("mysql-data", "cubing-hub_mysql-data", "MySQL persistent volume contract is invalid"),
    ("redis-data", "cubing-hub_redis-data", "Redis persistent volume contract is invalid"),
):
    volume = volumes[key]
    if (
        volume.get("name") != expected_name
        or volume.get("external") is True
        or volume.get("driver") not in (None, "local")
        or volume.get("driver_opts")
    ):
        fail(message)

def mounts(service_name):
    value = candidate_services[service_name].get("volumes", [])
    if not isinstance(value, list):
        fail(f"{service_name} volume contract is invalid")
    return value

def mount_by_target(service, target, label):
    matches = [
        value
        for value in service.get("volumes", [])
        if isinstance(value, dict) and value.get("target") == target
    ]
    if len(matches) != 1:
        fail(f"{label} mount identity is invalid")
    return matches[0]

db_mounts = mounts("db")
redis_mounts = mounts("redis")
if len(db_mounts) != 1 or {
    key: db_mounts[0].get(key)
    for key in ("type", "source", "target")
} != {
    "type": "volume",
    "source": "mysql-data",
    "target": "/var/lib/mysql",
} or db_mounts[0].get("volume") not in (None, {}):
    fail("MySQL persistent volume contract is invalid")
if len(redis_mounts) != 1 or {
    key: redis_mounts[0].get(key)
    for key in ("type", "source", "target")
} != {
    "type": "volume",
    "source": "redis-data",
    "target": "/data",
} or redis_mounts[0].get("volume") not in (None, {}):
    fail("Redis persistent volume contract is invalid")

active_upload = mount_by_target(
    baseline_services["api"],
    "/data/post-images",
    "active upload",
)
expected_upload_source = active_upload.get("source")
if active_upload.get("type") != "bind" or not expected_upload_source:
    fail("active upload bind identity is invalid")

api_mounts = mounts("api")
web_mounts = mounts("web")
if len(api_mounts) != 1 or len(web_mounts) != 2:
    fail("application services contain an unsupported host bind")
api_upload = mount_by_target(candidate_services["api"], "/data/post-images", "API upload")
web_upload = mount_by_target(candidate_services["web"], "/data/post-images", "Web upload")
real_ip = mount_by_target(
    candidate_services["web"],
    "/etc/nginx/conf.d/00-cloudflare-real-ip.conf",
    "Nginx real-IP",
)
if (
    api_upload.get("type") != "bind"
    or api_upload.get("source") != expected_upload_source
    or api_upload.get("read_only") is True
    or api_upload.get("bind") not in (None, {})
):
    fail("API upload bind identity is invalid")
if (
    web_upload.get("type") != "bind"
    or web_upload.get("source") != expected_upload_source
    or web_upload.get("read_only") is not True
    or web_upload.get("bind") not in (None, {})
):
    fail("Web upload bind identity is invalid")
if (
    real_ip.get("type") != "bind"
    or real_ip.get("source") != expected_real_ip_source
    or real_ip.get("read_only") is not True
    or real_ip.get("bind") not in (None, {})
):
    fail("Nginx must mount the candidate release real-IP configuration")
' \
      "${api_image}" \
      "${web_image}" \
      "$(/usr/bin/dirname "${compose_file}")/nginx/cloudflare-edge-real-ip.conf"
}

prepare_runtime_release() {
  local digest="$1"
  local expected_revision="$2"
  local config_image="${RUNTIME_CONFIG_REPOSITORY}@${digest}"
  local actual_project
  local actual_revision
  local release_dir

  "${DOCKER_BIN}" \
    --config "${docker_config_dir}" \
    pull "${config_image}" \
    >/dev/null

  actual_revision="$(
    "${DOCKER_BIN}" \
      image inspect \
      --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
      "${config_image}"
  )"
  if [[ "${actual_revision}" != "${expected_revision}" ]]; then
    fail "runtime config revision label does not match deployment revision"
  fi

  actual_project="$(
    "${DOCKER_BIN}" \
      image inspect \
      --format '{{ index .Config.Labels "io.chochiho.runtime-config.project" }}' \
      "${config_image}"
  )"
  if [[ "${actual_project}" != cubing-hub ]]; then
    fail "runtime config project label is invalid"
  fi

  /bin/mkdir -p "${RUNTIME_CONFIG_RELEASES}"
  release_dir="$(release_dir_for_digest "${digest}")"
  release_temp="$(
    /usr/bin/mktemp -d "${RUNTIME_CONFIG_RELEASES}/.tmp.XXXXXX"
  )"
  config_container_id="$("${DOCKER_BIN}" create "${config_image}")"
  "${DOCKER_BIN}" cp "${config_container_id}:/runtime/." "${release_temp}"
  "${DOCKER_BIN}" rm "${config_container_id}" >/dev/null
  config_container_id=

  validate_candidate_release_files "${release_temp}"
  /bin/chmod -R go-rwx "${release_temp}"

  if [[ -d "${release_dir}" ]]; then
    validate_candidate_release_files "${release_dir}"
    if ! /usr/bin/diff -qr "${release_temp}" "${release_dir}" >/dev/null; then
      fail "existing runtime config release differs from exact digest artifact"
    fi
    /bin/rm -rf -- "${release_temp}"
    release_temp=
    prepared_release="${release_dir}"
    return 0
  fi

  /bin/mv -- "${release_temp}" "${release_dir}"
  release_temp=
  prepared_release="${release_dir}"
}

write_pending_state() {
  local previous_sha="$1"
  local previous_config_digest="$2"
  local target_sha="$3"
  local target_config_digest="$4"

  /bin/mkdir -p "${RUNTIME_CONFIG_ROOT}"
  pending_temp="$(
    /usr/bin/mktemp "${RUNTIME_CONFIG_ROOT}/.pending.tmp.XXXXXX"
  )"
  {
    printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${previous_sha}"
    printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${previous_config_digest}"
    printf 'TARGET_APPLICATION_REVISION=%s\n' "${target_sha}"
    printf 'TARGET_RUNTIME_CONFIG_DIGEST=%s\n' "${target_config_digest}"
  } >"${pending_temp}"
  /bin/chmod 600 "${pending_temp}"
  /bin/mv -f -- "${pending_temp}" "${RUNTIME_CONFIG_PENDING}"
  pending_temp=
}

replace_current_link() {
  local release_dir="$1"

  current_link_temp="${RUNTIME_CONFIG_ROOT}/.current.$$"
  /bin/ln -s "releases/$("/usr/bin/basename" "${release_dir}")" "${current_link_temp}"
  "${PYTHON_BIN}" -c \
    'import os, sys; os.replace(sys.argv[1], sys.argv[2])' \
    "${current_link_temp}" \
    "${RUNTIME_CONFIG_CURRENT}"
  current_link_temp=
}

write_initialization_marker() {
  if [[ -e "${RUNTIME_CONFIG_INITIALIZED}" || -L "${RUNTIME_CONFIG_INITIALIZED}" ]]; then
    validate_initialization_marker
    return
  fi

  initialization_temp="$(
    /usr/bin/mktemp "${APP_DIR}/.runtime-config-v2-initialized.tmp.XXXXXX"
  )"
  printf 'RUNTIME_CONFIG_V2=initialized\n' >"${initialization_temp}"
  /bin/chmod 400 "${initialization_temp}"
  /bin/mv -f -- "${initialization_temp}" "${RUNTIME_CONFIG_INITIALIZED}"
  initialization_temp=
}

write_success_state() {
  local application_revision="$1"
  local runtime_config_digest="$2"
  local runtime_config_revision="$3"
  local runtime_config_content_sha="$4"
  local previous_sha="$5"
  local previous_config_digest="$6"
  local release_dir="$7"

  state_temp="$(
    /usr/bin/mktemp "${RUNTIME_CONFIG_ROOT}/.state.tmp.XXXXXX"
  )"
  {
    printf 'APPLICATION_REVISION=%s\n' "${application_revision}"
    printf 'RUNTIME_CONFIG_DIGEST=%s\n' "${runtime_config_digest}"
    printf 'RUNTIME_CONFIG_REVISION=%s\n' "${runtime_config_revision}"
    printf 'RUNTIME_CONFIG_CONTENT_SHA256=%s\n' "${runtime_config_content_sha}"
    printf 'PREVIOUS_APPLICATION_REVISION=%s\n' "${previous_sha}"
    printf 'PREVIOUS_RUNTIME_CONFIG_DIGEST=%s\n' "${previous_config_digest}"
  } >"${state_temp}"
  /bin/chmod 600 "${state_temp}"
  /bin/mv -f -- "${state_temp}" "${RUNTIME_CONFIG_STATE}"
  state_temp=

  replace_current_link "${release_dir}"
  write_initialization_marker
  /bin/rm -f -- "${RUNTIME_CONFIG_PENDING}"
}

read_pending_value() {
  local key="$1"
  local value

  value="$(
    /usr/bin/awk -F= -v key="${key}" '
      $1 == key {
        value = substr($0, index($0, "=") + 1)
        count += 1
      }
      END {
        if (count != 1) {
          exit 1
        }
        print value
      }
    ' "${RUNTIME_CONFIG_PENDING}"
  )" || fail "${key} must appear exactly once in ${RUNTIME_CONFIG_PENDING}"

  printf '%s' "${value}"
}

validate_pending_state() {
  local keys

  if [[ ! -f "${RUNTIME_CONFIG_PENDING}" || -L "${RUNTIME_CONFIG_PENDING}" ]]; then
    fail "runtime config recovery requires a regular pending state file"
  fi

  keys="$(
    /usr/bin/awk -F= 'NF >= 2 { print $1 }' "${RUNTIME_CONFIG_PENDING}" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${keys}" != $'PREVIOUS_APPLICATION_REVISION\nPREVIOUS_RUNTIME_CONFIG_DIGEST\nTARGET_APPLICATION_REVISION\nTARGET_RUNTIME_CONFIG_DIGEST' ]]; then
    fail "runtime config pending state keys are invalid"
  fi
}

validate_state_file() {
  local application_revision
  local keys
  local previous_revision
  local previous_digest
  local runtime_content_sha
  local runtime_digest
  local runtime_revision

  if [[ ! -f "${RUNTIME_CONFIG_STATE}" || -L "${RUNTIME_CONFIG_STATE}" ]]; then
    fail "runtime config state must be a regular non-symlink file"
  fi
  keys="$(
    /usr/bin/awk -F= 'NF >= 2 { print $1 }' "${RUNTIME_CONFIG_STATE}" \
      | LC_ALL=C /usr/bin/sort
  )"
  if [[ "${keys}" != $'APPLICATION_REVISION\nPREVIOUS_APPLICATION_REVISION\nPREVIOUS_RUNTIME_CONFIG_DIGEST\nRUNTIME_CONFIG_CONTENT_SHA256\nRUNTIME_CONFIG_DIGEST\nRUNTIME_CONFIG_REVISION' ]]; then
    fail "runtime config state keys are invalid"
  fi

  application_revision="$(read_state_value APPLICATION_REVISION)"
  previous_revision="$(read_state_value PREVIOUS_APPLICATION_REVISION)"
  previous_digest="$(read_state_value PREVIOUS_RUNTIME_CONFIG_DIGEST)"
  runtime_content_sha="$(read_state_value RUNTIME_CONFIG_CONTENT_SHA256)"
  runtime_digest="$(read_state_value RUNTIME_CONFIG_DIGEST)"
  runtime_revision="$(read_state_value RUNTIME_CONFIG_REVISION)"
  if [[ ! "${application_revision}" =~ ^[0-9a-f]{40}$ ]] \
    || [[ "${application_revision}" == "${ZERO_SHA}" ]] \
    || [[ ! "${previous_revision}" =~ ^[0-9a-f]{40}$ ]] \
    || { [[ "${previous_digest}" != "${ZERO_DIGEST}" ]] && ! is_digest "${previous_digest}"; } \
    || [[ ! "${runtime_content_sha}" =~ ^[0-9a-f]{64}$ ]] \
    || ! is_digest "${runtime_digest}" \
    || [[ ! "${runtime_revision}" =~ ^[0-9a-f]{40}$ ]] \
    || [[ "${runtime_revision}" == "${ZERO_SHA}" ]]
  then
    fail "runtime config state values are invalid"
  fi
}

validate_verified_release() {
  local digest="$1"
  local expected_content_sha="$2"
  local release_dir

  if [[ ! "${digest}" =~ ^sha256:[0-9a-f]{64}$ ]] \
    || [[ "${digest}" == "${ZERO_DIGEST}" ]] \
    || [[ ! "${expected_content_sha}" =~ ^[0-9a-f]{64}$ ]]
  then
    fail "runtime config state is invalid"
  fi

  release_dir="$(release_dir_for_digest "${digest}")"
  if [[ ! -d "${release_dir}" ]]; then
    fail "runtime config release is missing during recovery"
  fi
  validate_release_files "${release_dir}"
  if [[ "$(runtime_config_content_sha256 "${release_dir}")" != "${expected_content_sha}" ]]; then
    fail "runtime config release integrity check failed during recovery"
  fi

  printf '%s' "${release_dir}"
}

deployment_service_set_is_healthy() {
  local rendered

  rendered="$(compose ps --format json)"
  printf '%s' "${rendered}" \
    | "${PYTHON_BIN}" -c '
import json
import sys

raw = sys.stdin.read().strip()
if not raw:
    raise SystemExit("no Cubing Hub service status was returned")

try:
    value = json.loads(raw)
except json.JSONDecodeError:
    value = [json.loads(line) for line in raw.splitlines() if line.strip()]

entries = value if isinstance(value, list) else [value]
required_services = {"api", "db", "redis", "web"}
health_required = {"db", "redis", "web"}
seen = set()

for entry in entries:
    service = entry.get("Service", "")
    if service not in required_services:
        raise SystemExit(f"unexpected running service: {service}")
    seen.add(service)
    if str(entry.get("State", "")).lower() != "running":
        raise SystemExit(f"{service} is not running")
    health = str(entry.get("Health", "")).lower()
    if service in health_required and health != "healthy":
        raise SystemExit(f"{service} is not healthy")
    if health and health != "healthy":
        raise SystemExit(f"{service} health is not healthy")

if seen != required_services:
    raise SystemExit("Cubing Hub service set is incomplete")
'
}

run_one_shot_migration() {
  local candidate_api_image="$1"
  local candidate_web_image="$2"

  (
    export API_IMAGE="${candidate_api_image}"
    export WEB_IMAGE="${candidate_web_image}"

    compose run \
      --rm \
      --no-deps \
      --pull never \
      --entrypoint java \
      api \
      "-Dloader.main=${MIGRATION_MAIN_CLASS}" \
      -cp "${MIGRATION_JAR}" \
      org.springframework.boot.loader.launch.PropertiesLauncher
  )
}

public_get() {
  "${CURL_BIN}" \
    --fail \
    --silent \
    --show-error \
    --location \
    --connect-timeout 5 \
    --max-time 20 \
    --retry 3 \
    --retry-delay 2 \
    "$1"
}

public_smoke() {
  local asset_path
  local html

  html="$(public_get "${PUBLIC_WEB_URL}/")" || return 1
  [[ -n "${html}" ]] || return 1
  public_get "${PUBLIC_DEEP_LINK_URL}" >/dev/null || return 1
  public_get "${PUBLIC_API_HEALTH_URL}" \
    | /usr/bin/grep -q '"status"[[:space:]]*:[[:space:]]*"UP"' \
    || return 1
  public_get "${PUBLIC_API_REPRESENTATIVE_URL}" >/dev/null || return 1

  asset_path="$(
    printf '%s' "${html}" \
      | /usr/bin/grep -Eo 'src="/assets/[^"?]+\.js([?][^"]*)?"' \
      | /usr/bin/head -n 1 \
      | /usr/bin/sed -E 's/^src="([^"]+)"$/\1/'
  )"
  if [[ ! "${asset_path}" =~ ^/assets/[A-Za-z0-9._/-]+\.js([?][A-Za-z0-9._~%&=+-]+)?$ ]]; then
    printf 'Cubing Hub public smoke could not resolve a safe JavaScript asset\n' >&2
    return 1
  fi
  public_get "${PUBLIC_WEB_URL}${asset_path}" >/dev/null || return 1
}

recover_pending_transaction() {
  local previous_sha
  local previous_digest
  local target_sha
  local target_digest
  local state_sha
  local state_digest
  local state_content_sha
  local state_previous_sha
  local state_previous_digest
  local recovery_release
  local recovery_api_image
  local recovery_web_image
  local expected_current

  validate_pending_state
  if [[ -e "${RUNTIME_CONFIG_STATE}" || -L "${RUNTIME_CONFIG_STATE}" ]]; then
    validate_state_file
  fi
  previous_sha="$(read_pending_value PREVIOUS_APPLICATION_REVISION)"
  previous_digest="$(read_pending_value PREVIOUS_RUNTIME_CONFIG_DIGEST)"
  target_sha="$(read_pending_value TARGET_APPLICATION_REVISION)"
  target_digest="$(read_pending_value TARGET_RUNTIME_CONFIG_DIGEST)"

  if [[ ! "${previous_sha}" =~ ^[0-9a-f]{40}$ ]] \
    || [[ ! "${target_sha}" =~ ^[0-9a-f]{40}$ ]] \
    || [[ ! "${previous_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] \
    || [[ ! "${target_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] \
    || [[ "${target_digest}" == "${ZERO_DIGEST}" ]]
  then
    fail "runtime config pending state values are invalid"
  fi

  state_sha="$(read_state_value APPLICATION_REVISION)"
  state_digest="$(read_state_value RUNTIME_CONFIG_DIGEST)"
  state_content_sha="$(read_state_value RUNTIME_CONFIG_CONTENT_SHA256)"
  state_previous_sha="$(read_state_value PREVIOUS_APPLICATION_REVISION)"
  state_previous_digest="$(read_state_value PREVIOUS_RUNTIME_CONFIG_DIGEST)"

  if [[ "${state_sha}" == "${target_sha}" && "${state_digest}" == "${target_digest}" ]]; then
    if [[ "${previous_sha}" != "${target_sha}" ]] \
      || [[ "${previous_digest}" != "${target_digest}" ]]
    then
      if [[ "${state_previous_sha}" != "${previous_sha}" ]] \
        || [[ "${state_previous_digest}" != "${previous_digest}" ]]
      then
        fail "completed target predecessor does not match pending state"
      fi
    fi
    recovery_release="$(
      validate_verified_release "${target_digest}" "${state_content_sha}"
    )"
    recovery_api_image="${API_IMAGE_REPOSITORY}:${target_sha}"
    recovery_web_image="${WEB_IMAGE_REPOSITORY}:${target_sha}"
    if [[ "$(read_env_value API_IMAGE)" != "${recovery_api_image}" ]] \
      || [[ "$(read_env_value WEB_IMAGE)" != "${recovery_web_image}" ]]
    then
      fail "application image environment does not match completed target state"
    fi

    active_compose_file="${recovery_release}/compose.yaml"
    validate_compose_contract \
      "${active_compose_file}" \
      "${recovery_api_image}" \
      "${recovery_web_image}"
    if ! deployment_service_set_is_healthy; then
      fail "completed target services are not all healthy and running"
    fi
    if ! public_smoke; then
      fail "completed target did not pass public smoke"
    fi

    expected_current="releases/$("/usr/bin/basename" "${recovery_release}")"
    if [[ ! -L "${RUNTIME_CONFIG_CURRENT}" ]] \
      || [[ "$(/usr/bin/readlink "${RUNTIME_CONFIG_CURRENT}")" != "${expected_current}" ]]
    then
      replace_current_link "${recovery_release}"
    fi
    write_initialization_marker
    /bin/rm -f -- "${RUNTIME_CONFIG_PENDING}"
    printf 'Completed Cubing Hub runtime config transaction finalized: %s\n' "${target_sha}"
    return 0
  fi

  if [[ "${previous_sha}" == "${ZERO_SHA}" ]]; then
    if [[ -n "${state_sha}" || "${previous_digest}" != "${ZERO_DIGEST}" ]]; then
      fail "bootstrap recovery state is inconsistent"
    fi
    require_legacy_compose
    write_image_env \
      "${API_IMAGE_REPOSITORY}:${ZERO_SHA}" \
      "${WEB_IMAGE_REPOSITORY}:${ZERO_SHA}"
    active_compose_file="${LEGACY_COMPOSE_FILE}"
    if ! compose stop api web; then
      fail "bootstrap recovery could not stop interrupted app services"
    fi
    /bin/rm -f -- "${RUNTIME_CONFIG_PENDING}"
    printf 'Interrupted Cubing Hub bootstrap cleared with app services stopped\n'
    return 0
  fi

  recovery_api_image="${API_IMAGE_REPOSITORY}:${previous_sha}"
  recovery_web_image="${WEB_IMAGE_REPOSITORY}:${previous_sha}"
  if [[ -z "${state_sha}" && -z "${state_digest}" && "${previous_digest}" == "${ZERO_DIGEST}" ]]; then
    require_legacy_compose
    active_compose_file="${LEGACY_COMPOSE_FILE}"
  else
    if [[ "${state_sha}" != "${previous_sha}" || "${state_digest}" != "${previous_digest}" ]]; then
      fail "pending transaction does not match the last verified runtime config state"
    fi
    recovery_release="$(
      validate_verified_release "${previous_digest}" "${state_content_sha}"
    )"
    active_compose_file="${recovery_release}/compose.yaml"
  fi

  validate_compose_contract \
    "${active_compose_file}" \
    "${recovery_api_image}" \
    "${recovery_web_image}"

  write_image_env "${recovery_api_image}" "${recovery_web_image}"
  if ! compose up \
    --detach \
    --no-build \
    --pull never \
    --remove-orphans \
    --wait \
    --wait-timeout "${HEALTH_TIMEOUT_SECONDS}"
  then
    fail "runtime config recovery could not restore the previous verified pair"
  fi
  if ! deployment_service_set_is_healthy; then
    fail "runtime config recovery restored an unhealthy service set"
  fi
  if ! public_smoke; then
    fail "runtime config recovery restored a publicly unavailable service set"
  fi

  if [[ -n "${state_sha}" ]]; then
    expected_current="releases/$("/usr/bin/basename" "${recovery_release}")"
    if [[ ! -L "${RUNTIME_CONFIG_CURRENT}" ]] \
      || [[ "$(/usr/bin/readlink "${RUNTIME_CONFIG_CURRENT}")" != "${expected_current}" ]]
    then
      replace_current_link "${recovery_release}"
    fi
    write_initialization_marker
  fi
  /bin/rm -f -- "${RUNTIME_CONFIG_PENDING}"
  printf 'Cubing Hub runtime config transaction recovered to: %s\n' "${previous_sha}"
}

if [[ "${recovery_mode}" == true ]]; then
  recover_pending_transaction
  exit 0
fi

normalized_sha="$(
  printf '%s' "${commit_sha}" \
    | /usr/bin/tr '[:upper:]' '[:lower:]'
)"
homeops_deployment_started_at="$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')"
homeops_deployment_event_key="cubing-hub:deploy:${normalized_sha}:${homeops_deployment_started_at}"
report_homeops_deployment RUNNING "" || true
new_api_image="${API_IMAGE_REPOSITORY}:${normalized_sha}"
new_web_image="${WEB_IMAGE_REPOSITORY}:${normalized_sha}"
current_api_image="$(read_env_value API_IMAGE)"
current_web_image="$(read_env_value WEB_IMAGE)"
previous_sha=

current_api_sha="$(extract_sha "${current_api_image}" "${API_IMAGE_REPOSITORY}")" \
  || current_api_sha=
current_web_sha="$(extract_sha "${current_web_image}" "${WEB_IMAGE_REPOSITORY}")" \
  || current_web_sha=

if [[ -n "${current_api_sha}" || -n "${current_web_sha}" ]]; then
  if [[ -z "${current_api_sha}" || "${current_api_sha}" != "${current_web_sha}" ]]; then
    fail "current API and web images do not share one valid commit SHA"
  fi
  previous_sha="${current_api_sha}"
fi

printf '%s' "${registry_token}" \
  | "${DOCKER_BIN}" \
      --config "${docker_config_dir}" \
      login ghcr.io \
      --username "${registry_user}" \
      --password-stdin \
      >/dev/null
logged_in=true
registry_token=

"${DOCKER_BIN}" --config "${docker_config_dir}" pull "${new_api_image}"
"${DOCKER_BIN}" --config "${docker_config_dir}" pull "${new_web_image}"

active_backup_script="${BACKUP_SCRIPT}"
if [[ "${legacy_mode}" == true ]]; then
  current_compose_file="${LEGACY_COMPOSE_FILE}"
  candidate_compose_file="${LEGACY_COMPOSE_FILE}"
else
  for image in "${new_api_image}" "${new_web_image}"; do
    actual_revision="$(
      "${DOCKER_BIN}" \
        image inspect \
        --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
        "${image}"
    )"
    if [[ "${actual_revision}" != "${normalized_sha}" ]]; then
      fail "application image revision label does not match deployment revision"
    fi
  done

  current_config_digest="$(read_state_value RUNTIME_CONFIG_DIGEST)"
  current_config_revision="$(read_state_value RUNTIME_CONFIG_REVISION)"
  current_config_content_sha="$(read_state_value RUNTIME_CONFIG_CONTENT_SHA256)"
  current_state_sha="$(read_state_value APPLICATION_REVISION)"

  if [[ ! -e "${RUNTIME_CONFIG_STATE}" && ! -L "${RUNTIME_CONFIG_STATE}" ]] \
    && [[ -e "${RUNTIME_CONFIG_CURRENT}" || -L "${RUNTIME_CONFIG_CURRENT}" ]]
  then
    fail "runtime config state is missing while the current release pointer exists"
  fi
  if [[ -e "${RUNTIME_CONFIG_STATE}" || -L "${RUNTIME_CONFIG_STATE}" ]] \
    && {
      [[ ! -f "${RUNTIME_CONFIG_STATE}" ]] \
        || [[ -L "${RUNTIME_CONFIG_STATE}" ]] \
        || [[ ! "${current_config_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] \
        || [[ "${current_config_digest}" == "${ZERO_DIGEST}" ]] \
        || [[ ! "${current_config_revision}" =~ ^[0-9a-f]{40}$ ]] \
        || [[ ! "${current_config_content_sha}" =~ ^[0-9a-f]{64}$ ]] \
        || [[ "${current_state_sha}" != "${previous_sha}" ]];
    }
  then
    fail "current runtime config state is invalid"
  fi
  if [[ -e "${RUNTIME_CONFIG_STATE}" || -L "${RUNTIME_CONFIG_STATE}" ]]; then
    validate_state_file
  fi

  if [[ "${current_config_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] \
    && [[ "${current_config_digest}" != "${ZERO_DIGEST}" ]]
  then
    current_release="$(release_dir_for_digest "${current_config_digest}")"
    current_compose_file="${current_release}/compose.yaml"
  else
    current_release=
    require_legacy_compose
    current_compose_file="${LEGACY_COMPOSE_FILE}"
  fi

  if [[ -n "${current_release}" ]]; then
    expected_current_target="releases/${current_config_digest#sha256:}"
    if [[ ! -L "${RUNTIME_CONFIG_CURRENT}" ]] \
      || [[ "$(/usr/bin/readlink "${RUNTIME_CONFIG_CURRENT}")" != "${expected_current_target}" ]]
    then
      fail "current runtime config pointer does not match verified state"
    fi
    if [[ ! "${current_config_revision}" =~ ^[0-9a-f]{40}$ ]] \
      || [[ ! "${current_config_content_sha}" =~ ^[0-9a-f]{64}$ ]]
    then
      fail "current runtime config state is invalid"
    fi
    if [[ ! -d "${current_release}" ]]; then
      fail "current runtime config release is missing"
    fi
    validate_release_files "${current_release}"
    if [[ "$(runtime_config_content_sha256 "${current_release}")" != "${current_config_content_sha}" ]]; then
      fail "current runtime config release integrity check failed"
    fi
  fi

  if [[ "${config_mode}" == update ]]; then
    candidate_config_digest="${config_digest}"
    candidate_config_revision="${normalized_sha}"
    prepare_runtime_release "${config_digest}" "${normalized_sha}"
    candidate_release="${prepared_release}"
    candidate_config_content_sha="$(
      runtime_config_content_sha256 "${candidate_release}"
    )"
  else
    if [[ -z "${current_release}" ]]; then
      fail "keep mode requires an existing verified runtime config state"
    fi
    candidate_config_digest="${current_config_digest}"
    candidate_config_revision="${current_config_revision}"
    candidate_config_content_sha="${current_config_content_sha}"
    candidate_release="${current_release}"
  fi

  if release_has_synced_scripts "${candidate_release}"; then
    active_backup_script="${candidate_release}/scripts/backup-cubing-hub.sh"
  fi

  candidate_compose_file="${candidate_release}/compose.yaml"
fi

validation_baseline_compose_file="${current_compose_file}"
validation_baseline_api_image="${current_api_image}"
validation_baseline_web_image="${current_web_image}"
validate_compose_contract \
  "${candidate_compose_file}" \
  "${new_api_image}" \
  "${new_web_image}"
validation_baseline_compose_file=
validation_baseline_api_image=
validation_baseline_web_image=

active_compose_file="${current_compose_file}"
running_services="$(compose ps --status running --services)"
if ! /usr/bin/grep -qx db <<<"${running_services}"; then
  if [[ -n "${previous_sha}" ]]; then
    fail "production db service must be running before an update"
  fi

  active_compose_file="${candidate_compose_file}"
  data_images=()
  while IFS= read -r data_image; do
    data_images+=("${data_image}")
  done < <(compose config --images db redis)

  if [[ "${#data_images[@]}" -ne 2 ]]; then
    fail "production db and redis images must each resolve exactly once"
  fi

  for data_image in "${data_images[@]}"; do
    "${DOCKER_BIN}" --config "${docker_config_dir}" pull "${data_image}"
  done

  compose up \
    --detach \
    --no-build \
    --pull never \
    --wait \
    --wait-timeout "${HEALTH_TIMEOUT_SECONDS}" \
    db redis
fi

if [[ -n "${previous_sha}" ]]; then
  if [[ ! -x "${active_backup_script}" || -L "${active_backup_script}" ]]; then
    fail "verified production backup script is missing or unsafe"
  fi
  if [[ "${legacy_mode}" == true ]]; then
    "${active_backup_script}"
  else
    "${active_backup_script}" --trigger predeploy
  fi
fi

if [[ "${legacy_mode}" == false ]]; then
  previous_config_digest="${current_config_digest:-${ZERO_DIGEST}}"
  write_pending_state \
    "${previous_sha:-${ZERO_SHA}}" \
    "${previous_config_digest}" \
    "${normalized_sha}" \
    "${candidate_config_digest}"
fi

active_compose_file="${candidate_compose_file}"
if ! run_one_shot_migration "${new_api_image}" "${new_web_image}"; then
  printf 'Cubing Hub one-shot migration failed; existing application remains active\n' >&2
  printf 'Database migration is not rolled back automatically\n' >&2
  exit 1
fi

write_image_env "${new_api_image}" "${new_web_image}"

if compose up \
  --detach \
  --no-build \
  --pull never \
  --remove-orphans \
  --wait \
  --wait-timeout "${HEALTH_TIMEOUT_SECONDS}"
then
  if ! deployment_service_set_is_healthy; then
    printf 'Cubing Hub deployment did not produce a healthy service set\n' >&2
  elif ! public_smoke; then
    printf 'Cubing Hub deployment did not pass public smoke\n' >&2
  else
    if [[ "${legacy_mode}" == false ]]; then
      write_success_state \
        "${normalized_sha}" \
        "${candidate_config_digest}" \
        "${candidate_config_revision}" \
        "${candidate_config_content_sha}" \
        "${previous_sha:-${ZERO_SHA}}" \
        "${previous_config_digest}" \
        "${candidate_release}"
    fi
    printf 'Cubing Hub deployment succeeded: %s\n' "${normalized_sha}"
    exit 0
  fi
fi

printf 'Cubing Hub deployment failed for commit: %s\n' "${normalized_sha}" >&2
compose logs --tail 100 api web >&2 || true

if [[ -n "${previous_sha}" ]]; then
  previous_api_image="${API_IMAGE_REPOSITORY}:${previous_sha}"
  previous_web_image="${WEB_IMAGE_REPOSITORY}:${previous_sha}"

  printf 'Rolling back application images to: %s\n' "${previous_sha}" >&2
  write_image_env "${previous_api_image}" "${previous_web_image}"
  active_compose_file="${current_compose_file}"

  if compose up \
    --detach \
    --no-build \
    --pull never \
    --remove-orphans \
    --wait \
    --wait-timeout "${HEALTH_TIMEOUT_SECONDS}"
  then
    if ! deployment_service_set_is_healthy; then
      printf 'Application image rollback restored an unhealthy service set\n' >&2
    elif ! public_smoke; then
      printf 'Application image rollback did not restore public availability\n' >&2
    else
      if [[ "${legacy_mode}" == false ]]; then
        /bin/rm -f -- "${RUNTIME_CONFIG_PENDING}"
      fi
      homeops_rollback_succeeded=true
      printf 'Application image rollback succeeded: %s\n' "${previous_sha}" >&2
    fi
  else
    printf 'Application image rollback failed: %s\n' "${previous_sha}" >&2
    compose logs --tail 100 api web >&2 || true
  fi
else
  printf 'No previous SHA image exists; keeping data services and stopping failed app containers\n' >&2
  write_image_env "${current_api_image}" "${current_web_image}"
  active_compose_file="${current_compose_file}"
  if compose stop api web; then
    if [[ "${legacy_mode}" == false ]]; then
      /bin/rm -f -- "${RUNTIME_CONFIG_PENDING}"
    fi
  else
    printf 'Application bootstrap teardown failed; pending transaction retained\n' >&2
  fi
fi

printf 'Database migration is not rolled back automatically\n' >&2
exit 1
