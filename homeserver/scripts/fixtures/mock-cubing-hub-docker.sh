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

fake_service_state() {
  local service="$1"

  if [[ -n "${FAKE_SERVICE_STATE_DIR:-}" ]] \
    && [[ -f "${FAKE_SERVICE_STATE_DIR}/${service}" ]]
  then
    /bin/cat "${FAKE_SERVICE_STATE_DIR}/${service}"
  else
    printf 'running\n'
  fi
}

fake_set_service_state() {
  local service="$1"
  local state="$2"

  if [[ -n "${FAKE_SERVICE_STATE_DIR:-}" ]]; then
    printf '%s\n' "${state}" >"${FAKE_SERVICE_STATE_DIR}/${service}"
  fi
}

fake_service_status_json() {
  local api_health="${FAKE_API_HEALTH:-}"
  local api_state
  local service_health="${FAKE_SOURCE_SERVICE_HEALTH:-healthy}"
  local db_health
  local db_state
  local redis_health
  local redis_state
  local web_health
  local web_state

  if [[ -z "${FAKE_DB_STATE_DIR:-}" ]] \
    || [[ ! -f "${FAKE_DB_STATE_DIR}/image-ref" ]]
  then
    service_health="${FAKE_SERVICE_HEALTH:-healthy}"
  elif [[ "$(/bin/cat "${FAKE_DB_STATE_DIR}/image-ref")" == mysql:8.4.11* ]]; then
    service_health="${FAKE_SERVICE_HEALTH:-healthy}"
  fi
  db_health="${service_health}"
  redis_health="${service_health}"
  web_health="${service_health}"
  api_state="$(fake_service_state api)"
  db_state="$(fake_service_state db)"
  redis_state="$(fake_service_state redis)"
  web_state="$(fake_service_state web)"
  [[ "${api_state}" == running ]] || api_health=
  [[ "${db_state}" == running ]] || db_health=
  [[ "${redis_state}" == running ]] || redis_health=
  [[ "${web_state}" == running ]] || web_health=
  printf \
    '[{"Service":"db","State":"%s","Health":"%s"},{"Service":"redis","State":"%s","Health":"%s"},{"Service":"api","State":"%s","Health":"%s"},{"Service":"web","State":"%s","Health":"%s"}]\n' \
    "${db_state}" "${db_health}" \
    "${redis_state}" "${redis_health}" \
    "${api_state}" "${api_health}" \
    "${web_state}" "${web_health}"
}

case "${command_name}" in
  pull)
    if [[ -n "${FAKE_HOMEOPS_CONTEXT_CAPTURE:-}" ]] \
      && [[ "$*" == *cubing-hub-api* ]]
    then
      /bin/cp "${FAKE_HOMEOPS_CONTEXT_FILE}" "${FAKE_HOMEOPS_CONTEXT_CAPTURE}"
      exit 1
    fi
    exit 0
    ;;
  login|logout|rm)
    exit 0
    ;;
  run)
    printf '%s\n' "${FAKE_RESTORE_CONTAINER:-mock-restore-db}"
    ;;
  create)
    printf 'mock-runtime-config-container\n'
    ;;
  cp)
    destination="$2"
    /bin/mkdir -p "${destination}/nginx" "${destination}/scripts"
    if [[ "${FAKE_FAIL_CP:-false}" == true ]]; then
      exit 1
    fi
    /bin/cp "${FAKE_RUNTIME_COMPOSE}" "${destination}/compose.yaml"
    /bin/cp \
      "${FAKE_RUNTIME_REAL_IP}" \
      "${destination}/nginx/cloudflare-edge-real-ip.conf"
    /bin/cp \
      "${FAKE_RUNTIME_BACKUP_SCRIPT}" \
      "${destination}/scripts/backup-cubing-hub.sh"
    /bin/cp \
      "${FAKE_RUNTIME_DEPLOY_SCRIPT}" \
      "${destination}/scripts/deploy-cubing-hub.sh"
    /bin/chmod 700 \
      "${destination}/scripts/backup-cubing-hub.sh" \
      "${destination}/scripts/deploy-cubing-hub.sh"
    if [[ "${FAKE_RUNTIME_INVALID_DEPLOY_SYNTAX:-false}" == true ]]; then
      printf '\nif\n' >>"${destination}/scripts/deploy-cubing-hub.sh"
    fi
    if [[ "${FAKE_RUNTIME_INVALID_BACKUP_SYNTAX:-false}" == true ]]; then
      printf '\nif\n' >>"${destination}/scripts/backup-cubing-hub.sh"
    fi
    if [[ "${FAKE_RUNTIME_INSECURE_SCRIPT_MODE:-false}" == true ]]; then
      /bin/chmod 755 "${destination}/scripts/backup-cubing-hub.sh"
    fi
    if [[ "${FAKE_RUNTIME_EXTRA_FILE:-false}" == true ]]; then
      printf 'unexpected\n' >"${destination}/unexpected"
    fi
    if [[ "${FAKE_RUNTIME_EXTRA_DIR:-false}" == true ]]; then
      /bin/mkdir "${destination}/unexpected-directory"
    fi
    if [[ "${FAKE_RUNTIME_SYMLINK:-false}" == true ]]; then
      /bin/ln -s compose.yaml "${destination}/unexpected-link"
    fi
    ;;
  image)
    test "$1" = inspect
    shift
    test "$1" = --format
    shift
    format="$1"
    image="$2"
    if [[ "${format}" == '{{.Id}}' ]]; then
      if [[ "${image}" == mysql:8.0.46* ]]; then
        printf '%s\n' "${FAKE_MYSQL_80_IMAGE_ID:-sha256:8080808080808080808080808080808080808080808080808080808080808080}"
      elif [[ "${image}" == mysql:8.4.11* ]]; then
        printf '%s\n' "${FAKE_MYSQL_84_IMAGE_ID:-sha256:8484848484848484848484848484848484848484848484848484848484848484}"
      else
        printf '%s\n' "${FAKE_DEFAULT_IMAGE_ID:-sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd}"
      fi
    elif [[ "${format}" == '{{json .RepoDigests}}' ]]; then
      if [[ "${image}" == mysql:8.0.46* ]]; then
        printf '["mysql@sha256:%s"]\n' \
          "${FAKE_MYSQL_80_REPO_DIGEST:-8080808080808080808080808080808080808080808080808080808080808080}"
      elif [[ "${image}" == mysql:8.4.11* ]]; then
        printf '["mysql@sha256:%s"]\n' \
          "${FAKE_MYSQL_84_REPO_DIGEST:-8484848484848484848484848484848484848484848484848484848484848484}"
      else
        printf '[]\n'
      fi
    elif [[ "${format}" == *org.opencontainers.image.revision* ]]; then
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
      printf '%s\n' "${FAKE_CONFIG_PROJECT:-cubing-hub}"
    else
      exit 1
    fi
    ;;
  container)
    test "$1" = inspect
    shift
    test "$1" = --format
    shift
    format="$1"
    container_id="$2"
    if [[ "${format}" == '{{.Image}}' ]]; then
      if [[ "${container_id}" == "${FAKE_API_CONTAINER_ID:-mock-api-container}" ]]; then
        printf '%s\n' "${FAKE_ACTUAL_API_IMAGE_ID:-${FAKE_DEFAULT_IMAGE_ID:-sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd}}"
      elif [[ "${container_id}" == "${FAKE_WEB_CONTAINER_ID:-mock-web-container}" ]]; then
        printf '%s\n' "${FAKE_ACTUAL_WEB_IMAGE_ID:-${FAKE_DEFAULT_IMAGE_ID:-sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd}}"
      elif [[ "${container_id}" == "${FAKE_RESTORE_CONTAINER:-mock-restore-db}" ]] \
        || [[ "${container_id}" == cubing-hub-mysql-rollback-validation-* ]]
      then
        printf '%s\n' "${FAKE_RESTORE_IMAGE_ID:-${FAKE_MYSQL_80_IMAGE_ID:-sha256:8080808080808080808080808080808080808080808080808080808080808080}}"
      elif [[ -n "${FAKE_DB_STATE_DIR:-}" && -f "${FAKE_DB_STATE_DIR}/image-id" ]]; then
        /bin/cat "${FAKE_DB_STATE_DIR}/image-id"
      else
        printf '%s\n' "${FAKE_ACTUAL_DB_IMAGE_ID:-${FAKE_MYSQL_84_IMAGE_ID:-sha256:8484848484848484848484848484848484848484848484848484848484848484}}"
      fi
    elif [[ "${format}" == *'/var/lib/mysql'* ]]; then
      if [[ "${container_id}" == "${FAKE_RESTORE_CONTAINER:-mock-restore-db}" ]] \
        || [[ "${container_id}" == cubing-hub-mysql-rollback-validation-* ]]
      then
        printf '%s\n' "${FAKE_RESTORE_VOLUME:-cubing-hub_mysql-rollback-test}"
      elif [[ -n "${FAKE_DB_STATE_DIR:-}" && -f "${FAKE_DB_STATE_DIR}/volume" ]]; then
        /bin/cat "${FAKE_DB_STATE_DIR}/volume"
      else
        printf '%s\n' "${FAKE_ACTUAL_DB_VOLUME:-cubing-hub_mysql-data}"
      fi
    elif [[ "${format}" == *com.docker.compose.project* ]]; then
      printf '%s\n' "${FAKE_ACTUAL_DB_PROJECT:-cubing-hub}"
    elif [[ "${format}" == *com.docker.compose.service* ]]; then
      case "${container_id}" in
        "${FAKE_API_CONTAINER_ID:-mock-api-container}") printf 'api\n' ;;
        "${FAKE_WEB_CONTAINER_ID:-mock-web-container}") printf 'web\n' ;;
        *) printf '%s\n' "${FAKE_ACTUAL_DB_SERVICE:-db}" ;;
      esac
    elif [[ "${format}" == *io.chochiho.cubing-hub.mysql-restore-backup* ]]; then
      printf '%s\n' "${FAKE_RESTORE_BACKUP_ID:-cubing-hub-production-20260813T000000Z}"
    elif [[ "${format}" == '{{.State.Status}}' ]]; then
      if [[ -n "${FAKE_DB_STATE_DIR:-}" && -f "${FAKE_DB_STATE_DIR}/running" ]] \
        && [[ "$(/bin/cat "${FAKE_DB_STATE_DIR}/running")" != true ]]
      then
        printf 'exited\n'
      else
        printf 'running\n'
      fi
    elif [[ "${format}" == *State.Health* ]]; then
      if [[ "${container_id}" == "${FAKE_RESTORE_CONTAINER:-mock-restore-db}" ]] \
        || [[ "${container_id}" == cubing-hub-mysql-rollback-validation-* ]]
      then
        printf '%s\n' "${FAKE_RESTORE_HEALTH:-healthy}"
      elif [[ -n "${FAKE_DB_STATE_DIR:-}" && -f "${FAKE_DB_STATE_DIR}/health" ]]; then
        /bin/cat "${FAKE_DB_STATE_DIR}/health"
      else
        printf '%s\n' "${FAKE_ACTUAL_DB_HEALTH:-healthy}"
      fi
    else
      exit 1
    fi
    ;;
  volume)
    test "$1" = inspect
    shift
    test "$1" = --format
    shift
    format="$1"
    volume_name="$2"
    if [[ "${FAKE_MISSING_VOLUME:-}" == "${volume_name}" ]]; then
      exit 1
    fi
    if [[ "${format}" == '{{.Name}}' ]]; then
      printf '%s\n' "${volume_name}"
    elif [[ "${format}" == '{{.Driver}}' ]]; then
      printf '%s\n' "${FAKE_VOLUME_DRIVER:-local}"
    elif [[ "${format}" == *io.chochiho.cubing-hub.mysql-restore-backup* ]]; then
      printf '%s\n' "${FAKE_VOLUME_BACKUP_ID:-${FAKE_RESTORE_BACKUP_ID:-cubing-hub-production-20260813T000000Z}}"
    else
      exit 1
    fi
    ;;
  inspect)
    printf 'Use docker container inspect in the maintenance contract\n' >&2
    exit 1
    ;;
  exec)
    query=
    table=
    while [[ "$#" -gt 0 ]]; do
      if [[ "$1" == --env ]]; then
        case "$2" in
          MAINTENANCE_QUERY=*) query="${2#MAINTENANCE_QUERY=}" ;;
          MAINTENANCE_TABLE=*) table="${2#MAINTENANCE_TABLE=}" ;;
        esac
        shift 2
        continue
      fi
      shift
    done
    case "${query}" in
      running-version)
        running_db_is_target=true
        if [[ -n "${FAKE_DB_STATE_DIR:-}" ]] \
          && [[ -f "${FAKE_DB_STATE_DIR}/image-ref" ]] \
          && [[ "$(/bin/cat "${FAKE_DB_STATE_DIR}/image-ref")" != mysql:8.4.11* ]]
        then
          running_db_is_target=false
        elif [[ -n "${FAKE_DB_STATE_DIR:-}" ]] \
          && [[ ! -f "${FAKE_DB_STATE_DIR}/image-ref" ]]
        then
          running_db_is_target=false
        else
          running_db_is_target=true
        fi
        if [[ "${running_db_is_target}" == true ]] \
          && [[ "${FAKE_RUNNING_DB_VERSION_QUERY_FAIL:-false}" == true ]]
        then
          exit 1
        fi
        if [[ "${running_db_is_target}" == true ]] \
          && [[ "${FAKE_RUNNING_DB_VERSION_EMPTY:-false}" == true ]]
        then
          exit 0
        fi
        if [[ "${running_db_is_target}" == true ]] \
          && [[ -n "${FAKE_RUNNING_DB_VERSION_OVERRIDE:-}" ]]
        then
          printf '%s\n' "${FAKE_RUNNING_DB_VERSION_OVERRIDE}"
        elif [[ -n "${FAKE_DB_STATE_DIR:-}" ]] \
          && [[ -f "${FAKE_DB_STATE_DIR}/image-ref" ]] \
          && [[ "$(/bin/cat "${FAKE_DB_STATE_DIR}/image-ref")" == mysql:8.0.46* ]]
        then
          printf '8.0.46\n'
        else
          printf '8.4.11\n'
        fi
        ;;
      version)
        printf '%s\n' "${FAKE_RESTORE_VERSION:-8.0.46}"
        ;;
      tables)
        printf '%s\n' "${FAKE_RESTORE_TABLES:-post_attachments
users}"
        ;;
      count)
        case "${table}" in
          post_attachments) printf '%s\n' "${FAKE_RESTORE_POST_ATTACHMENTS_COUNT:-0}" ;;
          users) printf '%s\n' "${FAKE_RESTORE_USERS_COUNT:-1}" ;;
          *) printf '%s\n' "${FAKE_RESTORE_DEFAULT_COUNT:-0}" ;;
        esac
        ;;
      *)
        printf 'Unexpected mock Docker exec query\n' >&2
        exit 1
        ;;
    esac
    ;;
  stop)
    exit 0
    ;;
  compose)
    arguments=" $* "
    if [[ -n "${FAKE_DB_STATE_DIR:-}" && "${arguments}" == *" --env-file "* ]]; then
      compose_env_file=
      previous_argument=
      for compose_argument in "$@"; do
        if [[ "${previous_argument}" == --env-file ]]; then
          compose_env_file="${compose_argument}"
          break
        fi
        previous_argument="${compose_argument}"
      done
      if [[ -f "${compose_env_file}" ]]; then
        if [[ -z "${DB_IMAGE:-}" ]]; then
          DB_IMAGE="$(/usr/bin/sed -n 's/^DB_IMAGE=//p' "${compose_env_file}" | /usr/bin/tail -1)"
        fi
        if [[ -z "${DB_VOLUME_NAME:-}" ]]; then
          DB_VOLUME_NAME="$(/usr/bin/sed -n 's/^DB_VOLUME_NAME=//p' "${compose_env_file}" | /usr/bin/tail -1)"
        fi
      fi
    fi
    if [[ "${arguments}" == *" config --images db redis "* ]]; then
      printf '%s\n' \
        "${FAKE_RENDER_DB_IMAGE:-mysql:8.4.11}" \
        "${FAKE_RENDER_REDIS_IMAGE:-redis:7.2.14-alpine}"
    elif [[ "${arguments}" == *" run "* ]] \
      && [[ "${arguments}" == *"com.cubinghub.ops.MigrationMain"* ]] \
      && [[ -n "${FAKE_DOCKER_LOG:-}" ]]
    then
      printf 'migration-images API_IMAGE=%s WEB_IMAGE=%s\n' \
        "${API_IMAGE:-unset}" \
        "${WEB_IMAGE:-unset}" \
        >>"${FAKE_DOCKER_LOG}"
    fi
    if [[ "${arguments}" == *" run "* ]] \
      && [[ "${arguments}" == *"com.cubinghub.ops.MigrationMain"* ]] \
      && [[ "${FAKE_MIGRATION_FAIL:-false}" == true ]]
    then
      exit 1
    elif [[ "${arguments}" == *" up "* ]] \
      && [[ "${arguments}" == *" db redis "* ]] \
      && [[ -n "${FAKE_PENDING_CAPTURE_ON_DATA_UP:-}" ]]
    then
      /bin/cp "${FAKE_PENDING_FILE}" "${FAKE_PENDING_CAPTURE_ON_DATA_UP}"
      exit 1
    elif [[ "${arguments}" == *" up "* ]] \
      && [[ -n "${FAKE_FAIL_APP_UP_ONCE_FILE:-}" ]] \
      && [[ ! -e "${FAKE_FAIL_APP_UP_ONCE_FILE}" ]]
    then
      : >"${FAKE_FAIL_APP_UP_ONCE_FILE}"
      exit 1
    elif [[ "${arguments}" == *" ps -q db "* ]]; then
      if [[ -n "${FAKE_DB_STATE_DIR:-}" && -f "${FAKE_DB_STATE_DIR}/running" ]] \
        && [[ "$(/bin/cat "${FAKE_DB_STATE_DIR}/running")" != true ]]
      then
        :
      else
        printf '%s\n' "${FAKE_DB_CONTAINER_ID:-mock-db-container}"
      fi
    elif [[ "${arguments}" == *" ps -q api "* ]]; then
      printf '%s\n' "${FAKE_API_CONTAINER_ID:-mock-api-container}"
    elif [[ "${arguments}" == *" ps -q web "* ]]; then
      printf '%s\n' "${FAKE_WEB_CONTAINER_ID:-mock-web-container}"
    elif [[ "${arguments}" == *" ps --all --format json "* ]]; then
      fake_service_status_json
    elif [[ "${arguments}" == *" ps --format json "* ]]; then
      fake_service_status_json
    elif [[ "${arguments}" == *" BACKUP_QUERY=maintenance-source-version "* ]]; then
      printf '%s\n' "${FAKE_BACKUP_SOURCE_VERSION:-8.0.46}"
    elif [[ "${arguments}" == *" --format json "* ]]; then
      compose_file=
      previous_argument=
      for argument in "$@"; do
        if [[ "${previous_argument}" == --file ]]; then
          compose_file="${argument}"
          break
        fi
        previous_argument="${argument}"
      done
      if [[ "${compose_file}" == "-" ]]; then
        /bin/cat >/dev/null
        printf \
          '{"services":{"probe":{"environment":{"CORS_ALLOWED_ORIGINS":"https://cubing-hub.com,https://www.cubing-hub.com","DB_NAME":"cubing_hub","DB_USERNAME":"cubing_hub","DB_PASSWORD":"change-me","FEEDBACK_DISCORD_WEBHOOK_URL":"","JWT_EXPIRATION":"1800000","JWT_REFRESH_EXPIRATION":"604800000","JWT_SECRET":"change-me","MYSQL_ROOT_PASSWORD":"change-me","POST_IMAGES_HOST_DIR":"/Users/homeserver/Server/data/cubing-hub/post-images","POST_IMAGES_KEY_PREFIX":"community/posts","POST_IMAGES_PUBLIC_BASE_URL":"https://api.cubing-hub.com/uploads","RANKING_REDIS_REBUILD_MODE":"disabled","SMTP_AUTH":"true","SMTP_FROM_ADDRESS":"","SMTP_HOST":"%s","SMTP_PASSWORD":"%s","SMTP_PORT":"587","SMTP_STARTTLS_ENABLE":"true","SMTP_USERNAME":""}}}}\n' \
          "${FAKE_RESOLVED_SMTP_HOST-smtp.gmail.com}" \
          "${FAKE_RESOLVED_SMTP_PASSWORD:-}"
        exit 0
      fi
      api_image="${FAKE_RENDER_API_IMAGE:-${API_IMAGE}}"
      web_image="${FAKE_RENDER_WEB_IMAGE:-${WEB_IMAGE}}"
      db_image="${DB_IMAGE:-${FAKE_RENDER_DB_IMAGE:-mysql:8.4.11}}"
      if [[ "${db_image}" == mysql:8.4.11* ]] \
        && [[ -n "${FAKE_MAINTENANCE_CANDIDATE_API_IMAGE:-}" ]]
      then
        api_image="${FAKE_MAINTENANCE_CANDIDATE_API_IMAGE}"
      fi
      redis_image="${FAKE_RENDER_REDIS_IMAGE:-redis:7.2.14-alpine}"
      real_ip_source="$(
        /usr/bin/dirname "${compose_file}"
      )/nginx/cloudflare-edge-real-ip.conf"
      real_ip_source="${FAKE_RENDER_REAL_IP_SOURCE:-${real_ip_source}}"
      upload_source="${FAKE_RENDER_UPLOAD_SOURCE:-/Users/homeserver/Server/data/cubing-hub/post-images}"
      database_name="${FAKE_RENDER_DATABASE_NAME:-cubing_hub}"
      database_user="${FAKE_RENDER_DATABASE_USER:-cubing_hub}"
      database_password="${FAKE_RENDER_DATABASE_PASSWORD:-change-me}"
      database_root_password="${FAKE_RENDER_DATABASE_ROOT_PASSWORD:-change-me}"
      api_database_user="${FAKE_RENDER_API_DATABASE_USER:-${database_user}}"
      api_database_password="${FAKE_RENDER_API_DATABASE_PASSWORD:-${database_password}}"
      ddl_auto="${FAKE_RENDER_DDL_AUTO:-validate}"
      flyway_enabled="${FAKE_RENDER_FLYWAY_ENABLED:-false}"
      flyway_environment=',"SPRING_FLYWAY_ENABLED":"'"${flyway_enabled}"'"'
      datasource_url="${FAKE_RENDER_DATASOURCE_URL:-jdbc:mysql://db:3306/${database_name}?sslMode=DISABLED&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul}"
      mysql_command_json="${FAKE_RENDER_MYSQL_COMMAND_JSON:-[\"--character-set-server=utf8mb4\",\"--collation-server=utf8mb4_0900_ai_ci\"]}"
      db_entrypoint_json="${FAKE_RENDER_DB_ENTRYPOINT_JSON:-null}"
      upload_root="${FAKE_RENDER_UPLOAD_ROOT:-/data/post-images}"
      api_extra_volume="${FAKE_RENDER_API_EXTRA_VOLUME:-}"
      api_extra_hosts_json="${FAKE_RENDER_API_EXTRA_HOSTS_JSON:-null}"
      api_application_attachment="${FAKE_RENDER_API_APPLICATION_ATTACHMENT_JSON:-null}"
      redis_command_json="${FAKE_RENDER_REDIS_COMMAND_JSON:-[\"redis-server\",\"--appendonly\",\"yes\",\"--appendfsync\",\"everysec\"]}"
      jwt_secret="${FAKE_RENDER_JWT_SECRET:-change-me}"
      smtp_host="${FAKE_RENDER_SMTP_HOST-smtp.gmail.com}"
      smtp_password="${FAKE_RENDER_SMTP_PASSWORD:-}"
      api_extra_environment="${FAKE_RENDER_API_EXTRA_ENVIRONMENT:-}"
      api_configs_json="${FAKE_RENDER_API_CONFIGS_JSON:-null}"
      api_secrets_json="${FAKE_RENDER_API_SECRETS_JSON:-null}"
      api_env_file_json="${FAKE_RENDER_API_ENV_FILE_JSON:-null}"
      api_command_json="${FAKE_RENDER_API_COMMAND_JSON:-null}"
      api_entrypoint_json="${FAKE_RENDER_API_ENTRYPOINT_JSON:-null}"
      api_user_json=null
      api_tmpfs_json='["/tmp:size=128m,mode=1777"]'
      application_json='{"name":"cubing-hub_application","ipam":{},"internal":true}'
      application_json="${FAKE_RENDER_APPLICATION_JSON:-${application_json}}"
      outbound_json='{"name":"cubing-hub_outbound","driver":"bridge","ipam":{}}'
      outbound_json="${FAKE_RENDER_OUTBOUND_JSON:-${outbound_json}}"
      edge_json='{"name":"edge","external":true,"ipam":{}}'
      edge_json="${FAKE_RENDER_EDGE_JSON:-${edge_json}}"
      mysql_volume_extra="${FAKE_RENDER_MYSQL_VOLUME_EXTRA:-}"
      mysql_volume_name="${DB_VOLUME_NAME:-${FAKE_RENDER_MYSQL_VOLUME_NAME:-cubing-hub_mysql-data}}"
      edge_alias="${FAKE_RENDER_EDGE_ALIAS:-cubing-hub-web}"
      db_healthcheck='{"test":["CMD-SHELL","mysqladmin ping -h 127.0.0.1 -u root --password=\"$${MYSQL_ROOT_PASSWORD}\" --silent"],"interval":"10s","timeout":"5s","retries":12,"start_period":"30s"}'
      db_healthcheck="${FAKE_RENDER_DB_HEALTHCHECK_JSON:-${db_healthcheck}}"
      redis_healthcheck='{"test":["CMD","redis-cli","ping"],"interval":"10s","timeout":"5s","retries":12,"start_period":"10s"}'
      redis_healthcheck="${FAKE_RENDER_REDIS_HEALTHCHECK_JSON:-${redis_healthcheck}}"
      web_healthcheck='{"test":["CMD-SHELL","wget --header='\''Host: api.cubing-hub.com'\'' -qO- http://127.0.0.1/actuator/health | grep -q '\''\"status\":\"UP\"'\''"],"interval":"10s","timeout":"5s","retries":12,"start_period":"40s"}'
      web_healthcheck="${FAKE_RENDER_WEB_HEALTHCHECK_JSON:-${web_healthcheck}}"
      if [[ "${FAKE_DISABLE_WEB_HEALTHCHECK:-false}" == true ]]; then
        web_healthcheck='{"disable":true}'
      fi
      web_profiles='[]'
      if [[ "${FAKE_RENDER_WEB_PROFILE:-false}" == true ]]; then
        web_profiles='["optional"]'
      fi
      web_restart="${FAKE_RENDER_RESTART_POLICY:-unless-stopped}"
      web_scale="${FAKE_RENDER_WEB_SCALE:-1}"
      web_command_json="${FAKE_RENDER_WEB_COMMAND_JSON:-null}"
      web_entrypoint_json="${FAKE_RENDER_WEB_ENTRYPOINT_JSON:-null}"
      api_privileged=false
      api_ports_json=null
      api_pid_json=null
      if [[ -n "${FAKE_VALIDATION_TARGET_API_IMAGE:-}" ]] \
        && [[ "${API_IMAGE:-}" == "${FAKE_VALIDATION_TARGET_API_IMAGE}" ]]
      then
        api_image="${FAKE_CANDIDATE_API_IMAGE:-${api_image}}"
        database_name="${FAKE_CANDIDATE_DATABASE_NAME:-${database_name}}"
        db_image="${FAKE_CANDIDATE_DB_IMAGE:-${db_image}}"
        upload_source="${FAKE_CANDIDATE_UPLOAD_SOURCE:-${upload_source}}"
        real_ip_source="${FAKE_CANDIDATE_REAL_IP_SOURCE:-${real_ip_source}}"
        api_extra_volume="${FAKE_CANDIDATE_API_EXTRA_VOLUME:-${api_extra_volume}}"
        api_extra_hosts_json="${FAKE_CANDIDATE_API_EXTRA_HOSTS_JSON:-${api_extra_hosts_json}}"
        api_extra_environment="${FAKE_CANDIDATE_API_EXTRA_ENVIRONMENT:-${api_extra_environment}}"
        api_configs_json="${FAKE_CANDIDATE_API_CONFIGS_JSON:-${api_configs_json}}"
        api_secrets_json="${FAKE_CANDIDATE_API_SECRETS_JSON:-${api_secrets_json}}"
        api_env_file_json="${FAKE_CANDIDATE_API_ENV_FILE_JSON:-${api_env_file_json}}"
        api_command_json="${FAKE_CANDIDATE_API_COMMAND_JSON:-${api_command_json}}"
        api_entrypoint_json="${FAKE_CANDIDATE_API_ENTRYPOINT_JSON:-${api_entrypoint_json}}"
        api_user_json="${FAKE_CANDIDATE_API_USER_JSON:-${api_user_json}}"
        api_tmpfs_json="${FAKE_CANDIDATE_API_TMPFS_JSON:-${api_tmpfs_json}}"
        application_json="${FAKE_CANDIDATE_APPLICATION_JSON:-${application_json}}"
        outbound_json="${FAKE_CANDIDATE_OUTBOUND_JSON:-${outbound_json}}"
        edge_json="${FAKE_CANDIDATE_EDGE_JSON:-${edge_json}}"
        mysql_volume_extra="${FAKE_CANDIDATE_MYSQL_VOLUME_EXTRA:-${mysql_volume_extra}}"
        mysql_volume_name="${FAKE_CANDIDATE_MYSQL_VOLUME_NAME:-${mysql_volume_name}}"
        web_restart="${FAKE_CANDIDATE_WEB_RESTART:-${web_restart}}"
        web_command_json="${FAKE_CANDIDATE_WEB_COMMAND_JSON:-${web_command_json}}"
        web_entrypoint_json="${FAKE_CANDIDATE_WEB_ENTRYPOINT_JSON:-${web_entrypoint_json}}"
        db_healthcheck="${FAKE_CANDIDATE_DB_HEALTHCHECK_JSON:-${db_healthcheck}}"
        redis_healthcheck="${FAKE_CANDIDATE_REDIS_HEALTHCHECK_JSON:-${redis_healthcheck}}"
        web_healthcheck="${FAKE_CANDIDATE_WEB_HEALTHCHECK_JSON:-${web_healthcheck}}"
        api_privileged="${FAKE_CANDIDATE_API_PRIVILEGED:-${api_privileged}}"
        api_ports_json="${FAKE_CANDIDATE_API_PORTS_JSON:-${api_ports_json}}"
        api_pid_json="${FAKE_CANDIDATE_API_PID_JSON:-${api_pid_json}}"
        mysql_command_json="${FAKE_CANDIDATE_MYSQL_COMMAND_JSON:-${mysql_command_json}}"
        db_entrypoint_json="${FAKE_CANDIDATE_DB_ENTRYPOINT_JSON:-${db_entrypoint_json}}"
        redis_command_json="${FAKE_CANDIDATE_REDIS_COMMAND_JSON:-${redis_command_json}}"
        ddl_auto="${FAKE_CANDIDATE_DDL_AUTO:-${ddl_auto}}"
        flyway_enabled="${FAKE_CANDIDATE_FLYWAY_ENABLED:-${flyway_enabled}}"
        flyway_environment=',"SPRING_FLYWAY_ENABLED":"'"${flyway_enabled}"'"'
      fi
      printf \
        '{"name":"cubing-hub","services":{"db":{"image":"%s","restart":"unless-stopped","entrypoint":%s,"environment":{"MYSQL_DATABASE":"%s","MYSQL_USER":"%s","MYSQL_PASSWORD":"%s","MYSQL_ROOT_PASSWORD":"%s"},"command":%s,"healthcheck":%s,"networks":{"application":null},"volumes":[{"type":"volume","source":"mysql-data","target":"/var/lib/mysql","volume":{}}],"logging":{"driver":"json-file","options":{"max-size":"10m","max-file":"3"}}},"redis":{"image":"%s","restart":"unless-stopped","command":%s,"healthcheck":%s,"networks":{"application":null},"volumes":[{"type":"volume","source":"redis-data","target":"/data","volume":{}}],"logging":{"driver":"json-file","options":{"max-size":"10m","max-file":"3"}}},"api":{"image":"%s","command":%s,"entrypoint":%s,"user":%s,"privileged":%s,"ports":%s,"pid":%s,"restart":"unless-stopped","init":true,"read_only":true,"pids_limit":256,"security_opt":["no-new-privileges:true"],"tmpfs":%s,"extra_hosts":%s,"configs":%s,"secrets":%s,"env_file":%s,"environment":{"SPRING_PROFILES_ACTIVE":"prod","SPRING_DATASOURCE_URL":"%s","DB_USERNAME":"%s","DB_PASSWORD":"%s","REDIS_HOST":"redis","REDIS_PORT":"6379","JWT_SECRET":"%s","JWT_EXPIRATION":"1800000","JWT_REFRESH_EXPIRATION":"604800000","CORS_ALLOWED_ORIGINS":"https://cubing-hub.com,https://www.cubing-hub.com","SPRING_JPA_HIBERNATE_DDL_AUTO":"%s"%s,"AUTH_REFRESH_COOKIE_SECURE":"true","SMTP_HOST":"%s","SMTP_PORT":"587","SMTP_USERNAME":"","SMTP_PASSWORD":"%s","SMTP_AUTH":"true","SMTP_STARTTLS_ENABLE":"true","SMTP_FROM_ADDRESS":"","FEEDBACK_DISCORD_WEBHOOK_URL":"","RANKING_REDIS_REBUILD_MODE":"disabled","MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE":"health","MONITORING_PROMETHEUS_PERMIT_ALL":"false","POST_IMAGES_LOCAL_ROOT_PATH":"%s","POST_IMAGES_KEY_PREFIX":"community/posts","POST_IMAGES_PUBLIC_BASE_URL":"https://api.cubing-hub.com/uploads"%s},"networks":{"application":%s,"outbound":null},"volumes":[{"type":"bind","source":"%s","target":"/data/post-images"}%s],"logging":{"driver":"json-file","options":{"max-size":"10m","max-file":"3"}}},"web":{"image":"%s","command":%s,"entrypoint":%s,"restart":"%s","init":true,"read_only":true,"pids_limit":100,"security_opt":["no-new-privileges:true"],"tmpfs":["/var/cache/nginx:size=32m,mode=0755","/var/run:size=4m,mode=0755","/tmp:size=16m,mode=1777"],"scale":%s,"profiles":%s,"healthcheck":%s,"networks":{"application":null,"edge":{"aliases":["%s"]}},"volumes":[{"type":"bind","source":"%s","target":"/data/post-images","read_only":true},{"type":"bind","source":"%s","target":"/etc/nginx/conf.d/00-cloudflare-real-ip.conf","read_only":true}],"logging":{"driver":"json-file","options":{"max-size":"10m","max-file":"3"}}}},"networks":{"application":%s,"outbound":%s,"edge":%s},"volumes":{"mysql-data":{"name":"%s"%s},"redis-data":{"name":"cubing-hub_redis-data"}}}\n' \
        "${db_image}" \
        "${db_entrypoint_json}" \
        "${database_name}" \
        "${database_user}" \
        "${database_password}" \
        "${database_root_password}" \
        "${mysql_command_json}" \
        "${db_healthcheck}" \
        "${redis_image}" \
        "${redis_command_json}" \
        "${redis_healthcheck}" \
        "${api_image}" \
        "${api_command_json}" \
        "${api_entrypoint_json}" \
        "${api_user_json}" \
        "${api_privileged}" \
        "${api_ports_json}" \
        "${api_pid_json}" \
        "${api_tmpfs_json}" \
        "${api_extra_hosts_json}" \
        "${api_configs_json}" \
        "${api_secrets_json}" \
        "${api_env_file_json}" \
        "${datasource_url}" \
        "${api_database_user}" \
        "${api_database_password}" \
        "${jwt_secret}" \
        "${ddl_auto}" \
        "${flyway_environment}" \
        "${smtp_host}" \
        "${smtp_password}" \
        "${upload_root}" \
        "${api_extra_environment}" \
        "${api_application_attachment}" \
        "${upload_source}" \
        "${api_extra_volume}" \
        "${web_image}" \
        "${web_command_json}" \
        "${web_entrypoint_json}" \
        "${web_restart}" \
        "${web_scale}" \
        "${web_profiles}" \
        "${web_healthcheck}" \
        "${edge_alias}" \
        "${upload_source}" \
        "${real_ip_source}" \
        "${application_json}" \
        "${outbound_json}" \
        "${edge_json}" \
        "${mysql_volume_name}" \
        "${mysql_volume_extra}"
    elif [[ "${arguments}" == *" rm "* ]] && [[ "${arguments}" == *" db "* ]]; then
      if [[ -n "${FAKE_DB_STATE_DIR:-}" ]]; then
        printf 'false\n' >"${FAKE_DB_STATE_DIR}/running"
      fi
      fake_set_service_state db exited
    elif [[ "${arguments}" == *" stop api web "* ]]; then
      if [[ "${FAKE_APP_STOP_FAIL:-false}" == true ]]; then
        exit 1
      fi
      fake_set_service_state api exited
      fake_set_service_state web exited
    elif [[ "${arguments}" == *" stop db "* ]]; then
      if [[ -n "${FAKE_DB_STATE_DIR:-}" ]]; then
        printf 'false\n' >"${FAKE_DB_STATE_DIR}/running"
      fi
      fake_set_service_state db exited
    elif [[ "${arguments}" == *" up "* ]] && [[ "${arguments}" == *" db "* ]]; then
      if [[ "${FAKE_MAINTENANCE_DB_UP_FAIL:-false}" == true ]]; then
        if [[ "${FAKE_MAINTENANCE_DB_UP_FAIL_AFTER_BIND:-false}" == true ]] \
          && [[ -n "${FAKE_DB_STATE_DIR:-}" ]]
        then
          printf '%s\n' "${DB_IMAGE:-mysql:8.4.11}" >"${FAKE_DB_STATE_DIR}/image-ref"
          if [[ "${DB_IMAGE:-}" == mysql:8.0.46* ]]; then
            printf '%s\n' "${FAKE_MYSQL_80_IMAGE_ID:-sha256:8080808080808080808080808080808080808080808080808080808080808080}" \
              >"${FAKE_DB_STATE_DIR}/image-id"
          else
            printf '%s\n' "${FAKE_MYSQL_84_IMAGE_ID:-sha256:8484848484848484848484848484848484848484848484848484848484848484}" \
              >"${FAKE_DB_STATE_DIR}/image-id"
          fi
          printf '%s\n' "${DB_VOLUME_NAME:-cubing-hub_mysql-data}" >"${FAKE_DB_STATE_DIR}/volume"
          printf 'unhealthy\n' >"${FAKE_DB_STATE_DIR}/health"
          printf 'true\n' >"${FAKE_DB_STATE_DIR}/running"
          fake_set_service_state db running
        fi
        exit 1
      fi
      if [[ -n "${FAKE_DB_STATE_DIR:-}" ]]; then
        printf '%s\n' "${DB_IMAGE:-mysql:8.4.11}" >"${FAKE_DB_STATE_DIR}/image-ref"
        if [[ "${DB_IMAGE:-}" == mysql:8.0.46* ]]; then
          printf '%s\n' "${FAKE_MYSQL_80_IMAGE_ID:-sha256:8080808080808080808080808080808080808080808080808080808080808080}" \
            >"${FAKE_DB_STATE_DIR}/image-id"
        else
          printf '%s\n' "${FAKE_MYSQL_84_IMAGE_ID:-sha256:8484848484848484848484848484848484848484848484848484848484848484}" \
            >"${FAKE_DB_STATE_DIR}/image-id"
        fi
        printf '%s\n' "${DB_VOLUME_NAME:-cubing-hub_mysql-data}" >"${FAKE_DB_STATE_DIR}/volume"
        printf 'healthy\n' >"${FAKE_DB_STATE_DIR}/health"
        printf 'true\n' >"${FAKE_DB_STATE_DIR}/running"
      fi
      fake_set_service_state db running
    elif [[ "${arguments}" == *" up "* ]] \
      && [[ "${arguments}" == *" redis api web "* ]]
    then
      fake_set_service_state redis running
      fake_set_service_state api running
      fake_set_service_state web running
    elif [[ "${arguments}" == *" ps --status running --services "* ]]; then
      if [[ -n "${FAKE_RUNNING_SERVICES:-}" ]]; then
        printf '%s\n' "${FAKE_RUNNING_SERVICES}"
      else
        for service in db redis api web; do
          [[ "$(fake_service_state "${service}")" == running ]] \
            && printf '%s\n' "${service}"
        done
      fi
    fi
    ;;
  ps)
    if [[ " $* " == *" --filter volume="* ]]; then
      requested_volume=
      while [[ "$#" -gt 1 ]]; do
        if [[ "$1" == --filter && "$2" == volume=* ]]; then
          requested_volume="${2#volume=}"
          break
        fi
        shift
      done
      [[ -n "${requested_volume}" ]] || exit 1
      if [[ -n "${FAKE_VOLUME_ATTACHED_CONTAINER:-}" ]]; then
        printf '%s' "${FAKE_VOLUME_ATTACHED_CONTAINER}"
      elif [[ -n "${FAKE_DB_STATE_DIR:-}" && -f "${FAKE_DB_STATE_DIR}/volume" ]] \
        && [[ "$(/bin/cat "${FAKE_DB_STATE_DIR}/volume")" == "${requested_volume}" ]] \
        && { [[ ! -f "${FAKE_DB_STATE_DIR}/running" ]] \
          || [[ "$(/bin/cat "${FAKE_DB_STATE_DIR}/running")" == true ]]; }
      then
        printf '%s' "${FAKE_DB_CONTAINER_ID:-mock-db-container}"
      elif [[ "${FAKE_ACTUAL_DB_VOLUME:-cubing-hub_mysql-data}" == "${requested_volume}" ]]; then
        printf '%s' "${FAKE_DB_CONTAINER_ID:-mock-db-container}"
      fi
    else
      exit 1
    fi
    ;;
  *)
    printf 'Unexpected mock Docker command: %s\n' "${command_name}" >&2
    exit 1
    ;;
esac
