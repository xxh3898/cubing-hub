#!/bin/bash

set -Eeuo pipefail

if [[ "$#" -ne 6 ]]; then
  printf '%s\n' \
    'Usage: verify-runtime-baseline-inspection.sh <application-revision> <runtime-revision> <runtime-digest> <db-image> <db-volume> <mysql-version>' \
    >&2
  exit 64
fi

expected_application_revision="$1"
expected_runtime_revision="$2"
expected_runtime_digest="$3"
expected_db_image="$4"
expected_db_volume="$5"
expected_mysql_version="$6"
expected_db_image_version="${expected_db_image#mysql:}"
expected_db_image_version="${expected_db_image_version%@sha256:*}"

if [[ ! "${expected_application_revision}" =~ ^[0-9a-f]{40}$ ]] \
  || [[ ! "${expected_runtime_revision}" =~ ^[0-9a-f]{40}$ ]] \
  || [[ ! "${expected_runtime_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] \
  || [[ ! "${expected_db_image}" =~ ^mysql:[0-9]+\.[0-9]+\.[0-9]+@sha256:[0-9a-f]{64}$ ]] \
  || [[ ! "${expected_db_volume}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]] \
  || [[ ! "${expected_mysql_version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
  || [[ "${expected_db_image_version}" != "${expected_mysql_version}" ]]
then
  printf 'Expected runtime inspection identity is invalid\n' >&2
  exit 64
fi

inspection="$(/bin/cat)"
keys="$(
  printf '%s\n' "${inspection}" \
    | /usr/bin/awk -F= 'NF >= 2 { print $1 }' \
    | LC_ALL=C /usr/bin/sort
)"
if [[ "${keys}" != $'APPLICATION_REVISION\nCURRENT_POINTER\nDB_IMAGE\nDB_VOLUME_NAME\nMYSQL_VERSION\nPENDING\nRUNTIME_CONFIG_CONTENT_SHA256\nRUNTIME_CONFIG_DIGEST\nRUNTIME_CONFIG_REVISION\nSERVICE_SET' ]]; then
  printf 'Runtime inspection keys are invalid\n' >&2
  exit 1
fi

read_value() {
  /usr/bin/sed -n "s/^$1=//p" <<<"${inspection}" | /usr/bin/tail -n 1
}

actual_application_revision="$(read_value APPLICATION_REVISION)"
actual_runtime_revision="$(read_value RUNTIME_CONFIG_REVISION)"
actual_runtime_digest="$(read_value RUNTIME_CONFIG_DIGEST)"
actual_content_sha="$(read_value RUNTIME_CONFIG_CONTENT_SHA256)"
actual_current_pointer="$(read_value CURRENT_POINTER)"
actual_pending="$(read_value PENDING)"
actual_db_image="$(read_value DB_IMAGE)"
actual_db_volume="$(read_value DB_VOLUME_NAME)"
actual_mysql_version="$(read_value MYSQL_VERSION)"
actual_service_set="$(read_value SERVICE_SET)"

[[ "${actual_application_revision}" == "${expected_application_revision}" ]] \
  || { printf 'Application revision does not match the reconciliation intent\n' >&2; exit 1; }
[[ "${actual_runtime_revision}" == "${expected_runtime_revision}" ]] \
  || { printf 'Runtime revision does not match the reconciliation intent\n' >&2; exit 1; }
[[ "${actual_runtime_digest}" == "${expected_runtime_digest}" ]] \
  || { printf 'Runtime digest does not match the reconciliation intent\n' >&2; exit 1; }
[[ "${actual_content_sha}" =~ ^[0-9a-f]{64}$ ]] \
  || { printf 'Runtime content digest is invalid\n' >&2; exit 1; }
[[ "${actual_current_pointer}" == "releases/${expected_runtime_digest#sha256:}" ]] \
  || { printf 'Runtime current pointer does not match the verified digest\n' >&2; exit 1; }
[[ "${actual_pending}" == none ]] \
  || { printf 'A production runtime transaction is pending\n' >&2; exit 1; }
[[ "${actual_db_image}" == "${expected_db_image}" ]] \
  || { printf 'DB image does not match the reconciliation intent\n' >&2; exit 1; }
[[ "${actual_db_volume}" == "${expected_db_volume}" ]] \
  || { printf 'DB volume does not match the reconciliation intent\n' >&2; exit 1; }
if [[ "${actual_mysql_version}" != "${expected_mysql_version}" ]] \
  && [[ "${actual_mysql_version}" != "${expected_mysql_version}"-* ]] \
  && [[ "${actual_mysql_version}" != "${expected_mysql_version}"+* ]]
then
  printf 'MySQL version does not match the reconciliation intent\n' >&2
  exit 1
fi
[[ "${actual_service_set}" == healthy ]] \
  || { printf 'Production service set is unhealthy\n' >&2; exit 1; }

printf 'Runtime baseline inspection verified\n'
