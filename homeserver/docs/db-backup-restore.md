---
doc_type: operation
status: active
created: 2026-06-19
updated: 2026-08-13
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/07-operations/backup-restore.md
---

# DB와 이미지 백업·복구

> 중앙 문서 체계의 책임 경계는 [Backup and Restore Gateway](../../docs/07-operations/backup-restore.md)에서 확인한다. 이 문서가 command-level backup·restore 절차의 Source of Truth다.

## 기준 데이터

- MySQL과 게시글 이미지 directory를 같은 backup 단위로 관리한다.
- Redis는 refresh token, blacklist, 인증 임시 상태, ranking 읽기
  모델이므로 backup 대상에서 제외한다.
- 신규 Mac mini 운영은 빈 데이터로 시작하며 기존 RDS나 MacBook
  volume을 복구 원본으로 사용하지 않는다.

## 운영 경로

```text
/Users/homeserver/Server/apps/cubing-hub/.env
/Users/homeserver/Server/apps/cubing-hub/.runtime-config-v2-initialized
/Users/homeserver/Server/apps/cubing-hub/runtime-config/state
/Users/homeserver/Server/apps/cubing-hub/runtime-config/current
/Users/homeserver/Server/apps/cubing-hub/runtime-config/releases/<digest>/compose.yaml
/Users/homeserver/Server/apps/cubing-hub/runtime-config/releases/<digest>/scripts/deploy-cubing-hub.sh
/Users/homeserver/Server/apps/cubing-hub/runtime-config/releases/<digest>/scripts/backup-cubing-hub.sh
/Users/homeserver/Server/data/cubing-hub/post-images/
/Users/homeserver/Server/backups/cubing-hub/data/
```

runtime config v2 initialization marker가 있으면 별도 고정 backup bootstrap은
state의 content hash와 `current` pointer가 함께 가리키는 immutable release의
backup script를 실행한다. 해당 script는 같은 release Compose만 사용한다.
marker가 있는데 state 또는 current가 없으면 손상 상태로 판단해 실패한다.
marker, state, current가 모두 없는 기존 설치에서만 고정 bootstrap과 app
directory의 legacy `compose.yaml`로 fallback한다.

프로젝트 backup root의 `predeploy/`와 `bootstrap/`은 각각 배포 전 snapshot과
host bootstrap 설치본을 위한 별도 범주다. 이 문서의 retention과 restore
절차는 `data/` 아래의 검증된 DB·이미지 backup만 대상으로 한다.

Backup bootstrap은 deploy bootstrap과 같은
`/Users/homeserver/Server/apps/cubing-hub/.cubing-hub-operation.lock`을
non-blocking으로 획득한다. 다른 deploy/backup이 실행 중이면 exit `75`로
중단하고, runtime config `pending`이 있으면 recovery가 완료될 때까지
backup을 시작하지 않는다. Persistent mode `600` lock file은 삭제하지 않는다.

## 백업 실행

Backup worker는 HomeOps에 실제 경로가 아닌 `cubing-hub/data/...` logical identifier와 결과 metadata만 전달한다. HomeOps는 backup을 실행하거나 archive를 읽지 않으며, event 전송 실패는 검증된 backup 생성과 retention을 차단하지 않는다.

```bash
/Users/homeserver/Server/scripts/backup/backup-cubing-hub-bootstrap.sh
```

스크립트는 다음 순서로 실행한다.

1. 운영 `db` service 실행 상태 확인
2. 게시글 이미지 1차 snapshot 생성
3. 임시 directory에서
   `mysqldump --single-transaction --complete-insert --skip-extended-insert`
   실행과 구조 검증
4. 게시글 이미지 2차 snapshot 생성
5. dump의 제한된 single-row INSERT를 streaming 해석해 같은 transaction
   snapshot의 table row count와 `post_attachments.object_key` 목록 생성
6. dump reference와 snapshot 파일 대조
7. DB engine/version, row-count/reference source·SHA-256, 파일
   count·bytes·SHA-256 기록
8. `manifest.json` 생성 뒤 `SUCCESS` marker를 마지막으로 생성
9. 검증한 임시 directory를 최종 backup 이름으로 원자 이동
10. 삭제하지 않는 retention dry-run plan 생성
11. age ciphertext의 local staging과 iCloud Drive handoff

최종 결과는 아래 형식이다.

```text
cubing-hub-production-<UTC yyyyMMddTHHmmssZ>/
  SUCCESS
  manifest.json
  database/
    dump
    version.txt
    record-counts.tsv
  files/
    database-references.txt
    sha256.txt
    stats.json
    post-images/
```

backup이 실패하면 기존 정상 backup은 삭제하지 않는다. 실패 원인을
확인할 수 있도록 `.cubing-hub-backup.*` 임시 directory를 남긴다.

게시글 image object는 immutable이고 삭제는 DB commit 뒤 수행된다. 두 번의
copy는 dump 시점 전후의 extra file을 포함할 수 있지만, dump가 참조하는 모든
object key는 반드시 `files/database-references.txt`와 copied image tree에
존재해야 한다. Dump grammar, object key 또는 reference file이 불완전하면 worker는
최신 live DB 값으로 대체하지 않고 실패한다.

## 보관 정책

- 최근 정상 snapshot 4개와 지난 7 calendar day마다 KST 06:00 이후 첫
  정상 snapshot 1개를 보존 대상으로 계산한다.
- `SUCCESS`, manifest, dump·파일·database reference checksum과 reference
  target을 다시 검증한 snapshot만
  정상본으로 인정한다.
- 결과는 `data/retention-plan.json`에 `keep`과 `pruneCandidates`로 기록한다.
- 현재 worker는 dry-run plan만 만들고 실제 backup은 삭제하지 않는다.
- symlink, 예상 밖 이름, 불완전 snapshot과 다른 프로젝트 backup은
  정리 후보에도 넣지 않는다.
- 이름이 일치하는 개별 snapshot의 metadata·dump·file·database reference를
  권한 문제나 동시 disappearance로 읽지 못하면 `invalidIgnored`에만 기록하고
  `keep`과 `pruneCandidates`에서 제외한다. Worker는 해당 snapshot을 수정하거나
  삭제하지 않는다.
- Backup root 열거와 retention plan 임시 파일 생성·flush·원자 교체 실패는
  fail-closed로 전체 backup을 실패시킨다.
- 최초 7일 관찰, remote decrypt·restore drill과 별도 삭제 승인 전에는
  `pruneCandidates`를 실행하지 않는다.

## LaunchAgent

`homeserver/launchd/com.homeserver.cubing-hub-backup.plist.example`은 Mac의
local timezone이 Asia/Seoul인 전제에서 매일 00:05, 06:05, 12:05, 18:05에
repository 밖의 고정 backup bootstrap을 실행한다. `KeepAlive`는 사용하지
않는다.

이 저장소는 과거 `com.cubinghub.backup` label과
`com.cubinghub.backup.plist`의 04:10 schedule을 사용했다. 기존 설치를 새 label로
전환할 때는 두 schedule이 동시에 남지 않도록 아래 exact old/new target을 먼저
확인한다. 이 명령은 실제 LaunchAgent 운영 변경이므로 별도 승인 뒤에만 실행한다.

```bash
(
set -e

launch_domain="gui/$(id -u)"
legacy_service="${launch_domain}/com.cubinghub.backup"
current_service="${launch_domain}/com.homeserver.cubing-hub.backup"
legacy_plist='/Users/homeserver/Library/LaunchAgents/com.cubinghub.backup.plist'
legacy_archive='/Users/homeserver/Library/LaunchAgents/com.cubinghub.backup.plist.disabled'
current_plist='/Users/homeserver/Library/LaunchAgents/com.homeserver.cubing-hub.backup.plist'

printf 'legacy_service=%s\ncurrent_service=%s\n' \
  "${legacy_service}" "${current_service}"
printf 'legacy_plist=%s\nlegacy_archive=%s\ncurrent_plist=%s\n' \
  "${legacy_plist}" "${legacy_archive}" "${current_plist}"

if launchctl print "${current_service}" >/dev/null 2>&1 \
  || [[ -e "${current_plist}" || -L "${current_plist}" ]]; then
  printf '%s\n' 'STOP: current LaunchAgent already exists; inspect before changing it' >&2
  exit 1
fi

if launchctl print "${legacy_service}" >/dev/null 2>&1; then
  launchctl bootout "${legacy_service}"
fi

if [[ -e "${legacy_plist}" || -L "${legacy_plist}" ]]; then
  if [[ ! -f "${legacy_plist}" || -L "${legacy_plist}" ]]; then
    printf '%s\n' 'STOP: legacy plist is not a regular non-symlink file' >&2
    exit 1
  fi
  if [[ -e "${legacy_archive}" || -L "${legacy_archive}" ]]; then
    printf '%s\n' 'STOP: legacy archive already exists; no overwrite allowed' >&2
    exit 1
  fi
  /bin/mv -n "${legacy_plist}" "${legacy_archive}"
fi

if launchctl print "${legacy_service}" >/dev/null 2>&1 \
  || [[ -e "${legacy_plist}" || -L "${legacy_plist}" ]]; then
  printf '%s\n' 'STOP: legacy LaunchAgent transition is incomplete' >&2
  exit 1
fi

mkdir -p /Users/homeserver/Library/LaunchAgents \
  /Users/homeserver/Library/Logs

cp homeserver/launchd/com.homeserver.cubing-hub-backup.plist.example \
  "${current_plist}"

plutil -lint "${current_plist}"

launchctl bootstrap "${launch_domain}" "${current_plist}"

launchctl print "${current_service}" >/dev/null
if launchctl print "${legacy_service}" >/dev/null 2>&1 \
  || [[ -e "${legacy_plist}" || -L "${legacy_plist}" ]]; then
  printf '%s\n' 'STOP: legacy LaunchAgent became active again' >&2
  exit 1
fi
)
```

새 schedule에 문제가 생기면 새 service만 exact target으로 bootout한 뒤
`com.homeserver.cubing-hub.backup.plist`를 별도 no-clobber `.disabled` 경로로
격리한다. Legacy archive는 복구 근거로 보존하되, 이전 worker와 04:10 schedule의
안전성을 다시 검증하기 전에는 `com.cubinghub.backup`을 자동 bootstrap하지 않는다.

## age·iCloud와 heartbeat

검증된 snapshot만 age public recipient로 암호화해 local offsite staging에
기록한 뒤 iCloud Drive의 프로젝트 전용 directory로 전달한다. raw dump와
이미지는 iCloud에 직접 복사하지 않는다. `.partial` 복사본과 local
ciphertext의 SHA-256 일치, final rename 성공, symlink가 아닌 final regular
file의 SHA-256 재일치까지 확인한 뒤에만 handoff 성공으로 기록한다. Final 검증
전 실패하면 local ciphertext를 보존하고 iCloud-stage heartbeat를 생략한다.
검증된 final 뒤 local ciphertext 정리만 실패하면 generic 경고를 남기고 handoff
성공은 유지한다. 이 handoff는 Apple server의 remote upload 완료 판정과는
다르다.

선택적 `backup-heartbeats.conf`는 mode `0600` regular file이어야 하며
`LOCAL_HEARTBEAT_URL`, `ICLOUD_STAGE_HEARTBEAT_URL` 두 key만 허용한다. 실제
URL은 Git, 문서, 로그에 기록하지 않는다. 상세 계약과 복구 순서는
아래 `복구 rehearsal`과 중앙 [Backup and Restore Gateway](../../docs/07-operations/backup-restore.md)의 승인 경계를 함께 따른다.

## 복구 rehearsal

복구는 운영 volume에 바로 덮어쓰지 않는다.

1. 별도 MySQL volume과 별도 이미지 directory를 준비한다.
2. `database/dump`를 격리 MySQL에 복구한다.
3. Flyway history, FK, charset/collation, 핵심 row count를 확인한다.
4. 이미지 snapshot과 `post_attachments.object_key`를 다시 대조한다.
5. 검증용 API를 `ddl-auto=validate`로 시작한다.
6. 검증 결과를 기록한 뒤에만 운영 복구 여부를 별도로 승인한다.

## MySQL 8.4.11 engine upgrade

Repository runtime target은 MySQL 8.0.46에서 MySQL 8.4.11 LTS로 전환한다. 일반 application deploy는 active Compose와 candidate Compose의 DB image·volume이 다르거나, active Compose와 실행 중인 DB container의 image ID·volume mount가 다르면 중단한다. DB binding은 아래 maintenance worker로만 변경한다.

Maintenance worker는 repository Compose를 production에서 직접 실행하지 않는다. GHCR exact digest로 staging한 runtime release, current API·Web image, exact DB image digest, explicit DB volume, verified backup을 immutable candidate로 묶는다.

### Worker 설치 gate

Repository의 원본은 아래 고정 경로로 설치한다. 설치는 repository merge와 별도인 production host 변경이므로 실제 maintenance 승인 뒤에만 수행한다.

```bash
source_script=/Users/homeserver/Workspace/cubing-hub/homeserver/scripts/mysql-maintenance-home-server.sh
target_dir=/Users/homeserver/Server/scripts/maintenance
target_script="${target_dir}/mysql-maintenance-cubing-hub.sh"

test -f "${source_script}"
test ! -L "${source_script}"
/bin/bash -n "${source_script}"
if [[ -e "${target_dir}" || -L "${target_dir}" ]]; then
  test -d "${target_dir}"
  test ! -L "${target_dir}"
else
  /bin/mkdir -p "${target_dir}"
fi
test ! -e "${target_script}"
test ! -L "${target_script}"
/usr/bin/install -m 700 "${source_script}" "${target_script}"
test "$(/usr/bin/shasum -a 256 "${source_script}" | /usr/bin/awk '{print $1}')" = \
  "$(/usr/bin/shasum -a 256 "${target_script}" | /usr/bin/awk '{print $1}')"
```

설치 전에 repository checkout의 exact approved commit과 clean working tree를 확인한다. 기존 target이 있으면 덮어쓰지 말고 timestamp backup과 별도 설치 승인을 먼저 준비한다.

### Preconditions

- MySQL 8.0.46 instance에 대한 Upgrade Checker와 table check 성공
- 최신 정상 backup 생성과 manifest·checksum 검증
- 같은 backup의 fresh MySQL 8.4.11 restore rehearsal 성공
- 같은 backup의 fresh MySQL 8.0.46 rollback restore rehearsal 성공
- MySQL 8.4.11 fresh Flyway migration, backend regression, Growth query plan, CI 성공
- maintenance window와 application write stop 승인
- current application SHA, runtime config digest, DB volume, rollback target 확인
- `/Users/homeserver/Server/apps/cubing-hub/runtime-config/pending` 부재
- `.cubing-hub-operation.lock`을 사용하는 deploy·backup·maintenance 미실행
- maintenance worker source/install SHA-256 일치

### Immutable upgrade candidate

Candidate 생성은 running runtime을 변경하지 않는다. `state`, `current`, `.env`, container는 그대로 유지한다. Exact runtime release가 없으면 `runtime-config/releases/<digest>`에 검증본을 staging하고, `runtime-config/mysql-maintenance/candidates/<candidate-id>/candidate.env`를 생성한다.

```bash
maintenance=/Users/homeserver/Server/scripts/maintenance/mysql-maintenance-cubing-hub.sh
target_runtime_digest='sha256:<64 lowercase hex>'
target_runtime_revision='<40 lowercase commit SHA>'
target_db_image='mysql:8.4.11@sha256:<64 lowercase hex>'
backup_id='cubing-hub-production-<UTC yyyyMMddTHHmmssZ>'
registry_user='<GHCR user>'

read -r -s GHCR_READ_TOKEN
printf '%s' "${GHCR_READ_TOKEN}" | "${maintenance}" prepare-upgrade \
  "${target_runtime_digest}" \
  "${target_runtime_revision}" \
  "${target_db_image}" \
  "${backup_id}" \
  "${registry_user}"
unset GHCR_READ_TOKEN
```

출력된 64자리 candidate ID를 운영 기록에 남긴다. Candidate는 다음을 고정한다.

```text
operation
application revision
API/Web image
source/target runtime digest
target runtime revision/content hash
source/target DB image tag, repository digest, local image ID
source/target DB volume
backup identifier/manifest SHA-256
created timestamp
```

API·Web image drift, Redis·network·DB command drift, target image digest 불일치, backup evidence 부재, current state/pointer/actual DB 불일치는 candidate 생성을 차단한다.

### Upgrade

1. application write를 중단하고 maintenance 상태를 확인한다.
2. 운영 backup worker로 pre-upgrade logical backup과 게시글 image snapshot을 만든다.
3. `SUCCESS`, manifest, dump·image checksum, engine/version, row count를 검증한다.
4. 별도 fresh MySQL 8.4.11 환경에 backup을 restore하고 schema, FK, index, Flyway history, 핵심 row count를 확인한다.
5. 기록한 candidate ID와 write stop을 다시 확인한 뒤 아래 command를 실행한다.

   ```bash
   maintenance=/Users/homeserver/Server/scripts/maintenance/mysql-maintenance-cubing-hub.sh
   candidate_id='<prepare-upgrade output>'
   "${maintenance}" apply "${candidate_id}" WRITE_STOP_CONFIRMED
   ```

6. Worker는 공통 operation lock을 획득하고 current state·pointer·actual DB identity를 다시 검증한다. 첫 service mutation 전에 canonical `runtime-config/pending`을 생성한 뒤 API/Web과 DB를 정상 종료하고 exact 8.4.11 image에 original volume을 연결한다.
7. Target DB와 application 전체 health gate를 통과하기 전에는 `.env`, runtime config `state`·`current`가 마지막 committed source binding을 유지한다. Target DB image·volume은 maintenance worker가 Compose process override로만 전달한다.
8. DB actual image·volume과 application 전체 service health가 성공한 뒤에만 runtime config `state`·`current`, `.env`의 `DB_IMAGE`·`DB_VOLUME_NAME`, `mysql-maintenance/state`를 확정하고 `pending`을 제거한다.
9. `SELECT VERSION()`, charset/collation, application DB user의 `caching_sha2_password` 연결, Flyway validation을 확인한다.
10. users, records, user_pbs, posts/comments 수와 PB·Penalty 분포, Record ID·timestamp 범위를 pre-upgrade evidence와 대조한다.
11. API health, auth, Record create/PATCH/delete, Ranking, Growth summary/trend/progression, Community와 image read smoke를 수행한다.
12. 모든 gate가 끝난 뒤에만 write를 재개한다.

`apply`가 target DB startup 뒤 state/current 확정 전에 중단됐다면 normal deploy `recover`가 아니라 dedicated maintenance recovery를 사용한다. Recovery는 target DB identity와 health를 먼저 확인하고 API·Web을 candidate binding으로 다시 기동한다. 전체 service가 healthy인 경우에만 partial state를 확정한다.

```bash
/Users/homeserver/Server/scripts/maintenance/mysql-maintenance-cubing-hub.sh recover
```

### Rollback

다음은 rollback trigger다.

- MySQL 8.4.11 first startup 또는 data dictionary upgrade 실패
- schema·constraint·row count·PB parity 불일치
- application DB login, Flyway validation, 핵심 smoke 실패
- Growth query plan의 구조적 regression

Rollback은 pre-upgrade logical backup을 fresh MySQL 8.0.46 volume에 restore한 뒤 runtime binding을 그 volume로 전환한다. 8.4가 연결된 original volume은 삭제·rename·재사용하지 않고 forensic/recovery 근거로 보존한다.

#### Fresh rollback volume 준비

`rollback_volume`은 새 이름을 사용한다. 기존 volume이 있으면 재사용하지 않고 중단한다. `source_db_image`는 upgrade candidate에 기록된 exact 8.0.46 repository digest다.

```bash
(
set -euo pipefail

app_dir=/Users/homeserver/Server/apps/cubing-hub
backup_root=/Users/homeserver/Server/backups/cubing-hub/data
maintenance=/Users/homeserver/Server/scripts/maintenance/mysql-maintenance-cubing-hub.sh
upgrade_candidate_id='<prepare-upgrade output>'
[[ "${upgrade_candidate_id}" =~ ^[0-9a-f]{64}$ ]]
upgrade_candidate="${app_dir}/runtime-config/mysql-maintenance/candidates/${upgrade_candidate_id}/candidate.env"
backup_id="$(/usr/bin/sed -n 's/^BACKUP_ID=//p' "${upgrade_candidate}")"
source_db_image="$(/usr/bin/sed -n 's/^SOURCE_DB_IMAGE_EXACT=//p' "${upgrade_candidate}")"
rollback_volume='cubing-hub_mysql-rollback-<UTC yyyyMMddTHHmmssZ>'
validation_container='cubing-hub-mysql-rollback-verify-<UTC yyyyMMddTHHmmssZ>'
restore_env="$(/usr/bin/mktemp "${app_dir}/.mysql-rollback-env.XXXXXX")"
cleanup_restore_env() {
  /bin/rm -f -- "${restore_env}"
}
trap cleanup_restore_env EXIT

[[ "${backup_id}" =~ ^cubing-hub-production-[0-9]{8}T[0-9]{6}Z$ ]]
[[ "${source_db_image}" =~ ^mysql:8\.0\.46@sha256:[0-9a-f]{64}$ ]]
[[ "${rollback_volume}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]]
[[ "${validation_container}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]]
! /usr/local/bin/docker volume inspect "${rollback_volume}" >/dev/null 2>&1

/usr/bin/python3 - "${app_dir}/.env" "${restore_env}" <<'PY'
import os
import pathlib
import sys

source = pathlib.Path(sys.argv[1])
target = pathlib.Path(sys.argv[2])
if not source.is_file() or source.is_symlink():
    raise SystemExit("production environment file is missing or unsafe")
mapping = {
    "DB_NAME": "MYSQL_DATABASE",
    "DB_USERNAME": "MYSQL_USER",
    "DB_PASSWORD": "MYSQL_PASSWORD",
    "MYSQL_ROOT_PASSWORD": "MYSQL_ROOT_PASSWORD",
}
values = {}
for line in source.read_text(encoding="utf-8").splitlines():
    key, separator, value = line.partition("=")
    if separator and key in mapping:
        if key in values or not value:
            raise SystemExit(f"{key} must appear exactly once and be non-empty")
        values[key] = value
if set(values) != set(mapping):
    raise SystemExit("rollback MySQL environment is incomplete")
target.write_text(
    "".join(f"{mapping[key]}={values[key]}\n" for key in mapping),
    encoding="utf-8",
)
os.chmod(target, 0o600)
PY

/usr/local/bin/docker pull "${source_db_image}"
/usr/local/bin/docker volume create \
  --label "io.chochiho.cubing-hub.mysql-restore-backup=${backup_id}" \
  "${rollback_volume}"
/usr/local/bin/docker run --detach \
  --name "${validation_container}" \
  --label "io.chochiho.cubing-hub.mysql-restore-backup=${backup_id}" \
  --env-file "${restore_env}" \
  --mount "type=volume,source=${rollback_volume},target=/var/lib/mysql" \
  --health-cmd='mysqladmin ping -h 127.0.0.1 -u root --password="${MYSQL_ROOT_PASSWORD}" --silent' \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=12 \
  --health-start-period=30s \
  "${source_db_image}"

deadline=$(( $(/bin/date +%s) + 240 ))
while [[ "$(/bin/date +%s)" -lt "${deadline}" ]]; do
  health="$(
    /usr/local/bin/docker container inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "${validation_container}"
  )"
  [[ "${health}" == healthy ]] && break
  [[ "${health}" != unhealthy ]] || exit 1
  /bin/sleep 2
done
[[ "${health:-}" == healthy ]]

/usr/local/bin/docker exec -i "${validation_container}" /bin/sh -ceu '
  export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
  exec mysql --user=root --default-character-set=utf8mb4 "${MYSQL_DATABASE}"
' <"${backup_root}/${backup_id}/database/dump"

"${maintenance}" verify-rollback-volume \
  "${upgrade_candidate_id}" \
  "${rollback_volume}" \
  "${validation_container}"
)
```

임시 env file에는 restore container가 필요한 네 개의 MySQL 변수만 기록하고 subshell 종료 시 삭제한다. `verify-rollback-volume`은 volume과 validation container의 backup label, image ID, health, mount, `SELECT VERSION()`, table inventory, manifest의 모든 table row count를 검증한다. 성공하면 validation container를 stop/remove하고 `runtime-config/mysql-maintenance/restores/<volume>.state`에 immutable evidence를 남긴다. Volume과 backup은 삭제하지 않는다. 실패 시에도 rollback volume과 backup은 보존한다.

#### Rollback candidate와 transition

```bash
maintenance=/Users/homeserver/Server/scripts/maintenance/mysql-maintenance-cubing-hub.sh
upgrade_candidate_id='<prepare-upgrade output>'
rollback_volume='cubing-hub_mysql-rollback-<UTC yyyyMMddTHHmmssZ>'

rollback_candidate_id="$(
  "${maintenance}" prepare-rollback \
    "${upgrade_candidate_id}" \
    "${rollback_volume}"
)"

"${maintenance}" apply "${rollback_candidate_id}" WRITE_STOP_CONFIRMED
```

Rollback candidate는 target runtime release와 current API·Web image를 유지하고 DB binding만 exact MySQL 8.0.46 image·verified fresh volume로 바꾼다. `SOURCE_DB_VOLUME` 과 `TARGET_DB_VOLUME`이 같거나 restore evidence가 없으면 candidate/apply를 차단한다. 성공 후에도 original upgraded volume은 그대로 보존한다.

Rollback `apply`가 target MySQL을 healthy 상태로 만들기 전에 중단되면 canonical `pending`의 `OPERATION=ROLLBACK`과 `CANDIDATE_ID`를 확인한 뒤 같은 command를 다시 실행한다. Worker는 동일 rollback candidate와 source upgrade candidate, restore evidence, application image, target image·volume을 모두 다시 검증한다. 다른 rollback candidate는 pending transaction을 이어받을 수 없다.

```bash
"${maintenance}" apply "${rollback_candidate_id}" WRITE_STOP_CONFIRMED
```

Target rollback DB가 이미 healthy하고 application/runtime state 확정만 남았다면 `apply` 대신 `recover`를 사용한다.

```bash
"${maintenance}" recover
```

### State와 중단 처리

- Candidate 생성은 `state`, `current`, `.env`, container를 변경하지 않는다.
- `apply`는 첫 container stop 전에 canonical `runtime-config/pending`을 원자 생성한다. 이 동안 normal deploy와 backup은 fail closed한다.
- Target DB와 application 전체 health를 확인하기 전에는 `.env`, `state`, `current`가 source binding을 유지한다. Worker는 candidate DB binding을 Compose process override로만 사용한다.
- Target startup, health, state write, `current` pointer 갱신 중 어느 단계든 실패하면 pending을 유지한다.
- `ROLLBACK` pending에서 target DB가 아직 healthy하지 않으면 동일 candidate의 `apply`만 재시도할 수 있다. Pending candidate ID·context나 restore evidence가 다르면 중단한다.
- Target DB가 healthy하지만 application startup이나 success finalization이 끝나지 않았으면 `recover`를 사용한다. `recover`는 pending candidate의 target image ID·volume·service health가 일치할 때만 source/target 중간 state를 target으로 확정하고 `.env` binding을 기록한다.
- 성공 state의 current/previous runtime은 모두 explicit DB binding을 지원하는 target release를 가리킨다. Maintenance source release는 immutable candidate에 보존한다.
- Target이 healthy하지 않으면 `recover`로 source를 자동 재연결하지 않는다. Fresh rollback volume을 검증한 뒤 rollback candidate를 적용한다.
- Candidate, restore evidence, pending, maintenance state에는 secret을 남기지 않는다.

Repository merge나 이 runbook만으로 production data 변경을 승인하지 않는다. Candidate 생성·restore volume 준비·upgrade apply·rollback apply는 각각 exact 승인 범위에서 실행한다.

## 금지 사항

- `docker compose down -v`를 backup이나 rollback 명령으로 사용하지 않는다.
- 검증하지 않은 dump를 운영 volume에 바로 복구하지 않는다.
- MySQL 8.4가 upgrade한 data directory를 MySQL 8.0 image로 시작하지 않는다.
- secret, DB password, 실제 token을 manifest나 로그에 기록하지 않는다.
