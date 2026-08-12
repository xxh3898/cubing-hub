---
doc_type: operation
status: active
created: 2026-06-19
updated: 2026-08-12
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

Repository runtime target은 MySQL 8.0.46에서 MySQL 8.4.11 LTS로 전환한다. 일반 application deploy worker는 실행 중인 DB image와 candidate runtime config가 다르면 `data-service image drift`로 중단한다. 따라서 main merge만으로 production DB container가 자동 교체되지 않으며, 아래 절차는 별도 production 변경 승인 뒤 수동으로 수행한다.

### Preconditions

- MySQL 8.0.46 instance에 대한 Upgrade Checker와 table check 성공
- 최신 정상 backup 생성과 manifest·checksum 검증
- 같은 backup의 fresh MySQL 8.4.11 restore rehearsal 성공
- 같은 backup의 fresh MySQL 8.0.46 rollback restore rehearsal 성공
- MySQL 8.4.11 fresh Flyway migration, backend regression, Growth query plan, CI 성공
- maintenance window와 application write stop 승인
- current application SHA, runtime config digest, DB volume, rollback target 확인

### Upgrade

1. application write를 중단하고 maintenance 상태를 확인한다.
2. 운영 backup worker로 pre-upgrade logical backup과 게시글 image snapshot을 만든다.
3. `SUCCESS`, manifest, dump·image checksum, engine/version, row count를 검증한다.
4. 별도 fresh MySQL 8.4.11 환경에 backup을 restore하고 schema, FK, index, Flyway history, 핵심 row count를 확인한다.
5. 기존 MySQL 8.0.46을 정상 종료한다. 운영 Compose와 volume의 exact identity를 다시 확인한다.
6. 별도 data-service 절차로 exact `mysql:8.4.11` image를 적용한다. 첫 startup의 data dictionary·server upgrade log와 container health를 확인한다.
7. `SELECT VERSION()`, charset/collation, application DB user의 `caching_sha2_password` 연결, Flyway validation을 확인한다.
8. users, records, user_pbs, posts/comments 수와 PB·Penalty 분포, Record ID·timestamp 범위를 pre-upgrade evidence와 대조한다.
9. API health, auth, Record create/PATCH/delete, Ranking, Growth summary/trend/progression, Community와 image read smoke를 수행한다.
10. 모든 gate가 끝난 뒤에만 write를 재개한다.

### Rollback

다음은 rollback trigger다.

- MySQL 8.4.11 first startup 또는 data dictionary upgrade 실패
- schema·constraint·row count·PB parity 불일치
- application DB login, Flyway validation, 핵심 smoke 실패
- Growth query plan의 구조적 regression

Rollback은 pre-upgrade logical backup을 fresh MySQL 8.0.46 environment에 restore하는 방식으로 수행한다. MySQL 8.4가 한 번이라도 upgrade한 data directory에 MySQL 8.0.46 image를 다시 연결하지 않는다. Fresh 8.0.46에서 schema, row count, image reference, application smoke를 확인한 뒤 exact 이전 application/runtime pair를 복구한다.

Production upgrade와 rollback의 실제 command, secret, 운영 path 확인은 변경 시점의 별도 승인 범위에서 작성한다. Repository merge나 이 runbook만으로 production data 변경을 승인하지 않는다.

## 금지 사항

- `docker compose down -v`를 backup이나 rollback 명령으로 사용하지 않는다.
- 검증하지 않은 dump를 운영 volume에 바로 복구하지 않는다.
- MySQL 8.4가 upgrade한 data directory를 MySQL 8.0 image로 시작하지 않는다.
- secret, DB password, 실제 token을 manifest나 로그에 기록하지 않는다.
