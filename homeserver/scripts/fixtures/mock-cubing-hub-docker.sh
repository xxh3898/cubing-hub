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
    if [[ "${arguments}" == *" up "* ]] \
      && [[ -n "${FAKE_FAIL_APP_UP_ONCE_FILE:-}" ]] \
      && [[ ! -e "${FAKE_FAIL_APP_UP_ONCE_FILE}" ]]
    then
      : >"${FAKE_FAIL_APP_UP_ONCE_FILE}"
      exit 1
    elif [[ "${arguments}" == *" ps --format json "* ]]; then
      service_health="${FAKE_SERVICE_HEALTH:-healthy}"
      api_health="${FAKE_API_HEALTH:-}"
      printf \
        '[{"Service":"db","State":"running","Health":"%s"},{"Service":"redis","State":"running","Health":"%s"},{"Service":"api","State":"running","Health":"%s"},{"Service":"web","State":"running","Health":"%s"}]\n' \
        "${service_health}" \
        "${service_health}" \
        "${api_health}" \
        "${service_health}"
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
      db_image="${FAKE_RENDER_DB_IMAGE:-mysql:8.0.46}"
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
      flyway_environment=
      if [[ -n "${FAKE_RENDER_FLYWAY_ENABLED:-}" ]]; then
        flyway_environment=',"SPRING_FLYWAY_ENABLED":"'"${FAKE_RENDER_FLYWAY_ENABLED}"'"'
      fi
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
      application_json='{"name":"cubing-hub_application","ipam":{},"internal":true}'
      application_json="${FAKE_RENDER_APPLICATION_JSON:-${application_json}}"
      outbound_json='{"name":"cubing-hub_outbound","driver":"bridge","ipam":{}}'
      outbound_json="${FAKE_RENDER_OUTBOUND_JSON:-${outbound_json}}"
      edge_json='{"name":"edge","external":true,"ipam":{}}'
      edge_json="${FAKE_RENDER_EDGE_JSON:-${edge_json}}"
      mysql_volume_extra="${FAKE_RENDER_MYSQL_VOLUME_EXTRA:-}"
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
        application_json="${FAKE_CANDIDATE_APPLICATION_JSON:-${application_json}}"
        outbound_json="${FAKE_CANDIDATE_OUTBOUND_JSON:-${outbound_json}}"
        edge_json="${FAKE_CANDIDATE_EDGE_JSON:-${edge_json}}"
        mysql_volume_extra="${FAKE_CANDIDATE_MYSQL_VOLUME_EXTRA:-${mysql_volume_extra}}"
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
      fi
      printf \
        '{"name":"cubing-hub","services":{"db":{"image":"%s","restart":"unless-stopped","entrypoint":%s,"environment":{"MYSQL_DATABASE":"%s","MYSQL_USER":"%s","MYSQL_PASSWORD":"%s","MYSQL_ROOT_PASSWORD":"%s"},"command":%s,"healthcheck":%s,"networks":{"application":null},"volumes":[{"type":"volume","source":"mysql-data","target":"/var/lib/mysql","volume":{}}],"logging":{"driver":"json-file","options":{"max-size":"10m","max-file":"3"}}},"redis":{"image":"%s","restart":"unless-stopped","command":%s,"healthcheck":%s,"networks":{"application":null},"volumes":[{"type":"volume","source":"redis-data","target":"/data","volume":{}}],"logging":{"driver":"json-file","options":{"max-size":"10m","max-file":"3"}}},"api":{"image":"%s","command":%s,"entrypoint":%s,"privileged":%s,"ports":%s,"pid":%s,"restart":"unless-stopped","init":true,"read_only":true,"pids_limit":256,"security_opt":["no-new-privileges:true"],"tmpfs":["/tmp:size=128m,mode=1777"],"extra_hosts":%s,"configs":%s,"secrets":%s,"env_file":%s,"environment":{"SPRING_PROFILES_ACTIVE":"prod","SPRING_DATASOURCE_URL":"%s","DB_USERNAME":"%s","DB_PASSWORD":"%s","REDIS_HOST":"redis","REDIS_PORT":"6379","JWT_SECRET":"%s","JWT_EXPIRATION":"1800000","JWT_REFRESH_EXPIRATION":"604800000","CORS_ALLOWED_ORIGINS":"https://cubing-hub.com,https://www.cubing-hub.com","SPRING_JPA_HIBERNATE_DDL_AUTO":"%s"%s,"AUTH_REFRESH_COOKIE_SECURE":"true","SMTP_HOST":"%s","SMTP_PORT":"587","SMTP_USERNAME":"","SMTP_PASSWORD":"%s","SMTP_AUTH":"true","SMTP_STARTTLS_ENABLE":"true","SMTP_FROM_ADDRESS":"","FEEDBACK_DISCORD_WEBHOOK_URL":"","RANKING_REDIS_REBUILD_MODE":"disabled","MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE":"health","MONITORING_PROMETHEUS_PERMIT_ALL":"false","POST_IMAGES_LOCAL_ROOT_PATH":"%s","POST_IMAGES_KEY_PREFIX":"community/posts","POST_IMAGES_PUBLIC_BASE_URL":"https://api.cubing-hub.com/uploads"%s},"networks":{"application":%s,"outbound":null},"volumes":[{"type":"bind","source":"%s","target":"/data/post-images"}%s],"logging":{"driver":"json-file","options":{"max-size":"10m","max-file":"3"}}},"web":{"image":"%s","command":%s,"entrypoint":%s,"restart":"%s","init":true,"read_only":true,"pids_limit":100,"security_opt":["no-new-privileges:true"],"tmpfs":["/var/cache/nginx:size=32m,mode=0755","/var/run:size=4m,mode=0755","/tmp:size=16m,mode=1777"],"scale":%s,"profiles":%s,"healthcheck":%s,"networks":{"application":null,"edge":{"aliases":["%s"]}},"volumes":[{"type":"bind","source":"%s","target":"/data/post-images","read_only":true},{"type":"bind","source":"%s","target":"/etc/nginx/conf.d/00-cloudflare-real-ip.conf","read_only":true}],"logging":{"driver":"json-file","options":{"max-size":"10m","max-file":"3"}}}},"networks":{"application":%s,"outbound":%s,"edge":%s},"volumes":{"mysql-data":{"name":"cubing-hub_mysql-data"%s},"redis-data":{"name":"cubing-hub_redis-data"}}}\n' \
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
        "${api_privileged}" \
        "${api_ports_json}" \
        "${api_pid_json}" \
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
        "${mysql_volume_extra}"
    elif [[ "${arguments}" == *" ps --status running --services "* ]]; then
      printf 'db\nredis\napi\nweb\n'
    fi
    ;;
  *)
    printf 'Unexpected mock Docker command: %s\n' "${command_name}" >&2
    exit 1
    ;;
esac
