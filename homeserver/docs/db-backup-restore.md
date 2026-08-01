# DB와 이미지 백업·복구

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
- 최초 7일 관찰, remote decrypt·restore drill과 별도 삭제 승인 전에는
  `pruneCandidates`를 실행하지 않는다.

## LaunchAgent

`homeserver/launchd/com.homeserver.cubing-hub-backup.plist.example`은 Mac의
local timezone이 Asia/Seoul인 전제에서 매일 00:05, 06:05, 12:05, 18:05에
repository 밖의 고정 backup bootstrap을 실행한다. `KeepAlive`는 사용하지
않는다.

```bash
mkdir -p /Users/homeserver/Library/LaunchAgents \
  /Users/homeserver/Library/Logs

cp homeserver/launchd/com.homeserver.cubing-hub-backup.plist.example \
  /Users/homeserver/Library/LaunchAgents/com.homeserver.cubing-hub.backup.plist

plutil -lint \
  /Users/homeserver/Library/LaunchAgents/com.homeserver.cubing-hub.backup.plist

launchctl bootstrap \
  "gui/$(id -u)" \
  /Users/homeserver/Library/LaunchAgents/com.homeserver.cubing-hub.backup.plist
```

## age·iCloud와 heartbeat

검증된 snapshot만 age public recipient로 암호화해 local offsite staging에
기록한 뒤 iCloud Drive의 프로젝트 전용 directory로 전달한다. raw dump와
이미지는 iCloud에 직접 복사하지 않는다. `.partial` 복사본과 local
ciphertext의 SHA-256이 같을 때만 final `.tar.age` 이름으로 바꾼다. 이
handoff는 Apple server의 remote upload 완료 판정과는 다르다.

선택적 `backup-heartbeats.conf`는 mode `0600` regular file이어야 하며
`LOCAL_HEARTBEAT_URL`, `ICLOUD_STAGE_HEARTBEAT_URL` 두 key만 허용한다. 실제
URL은 Git, 문서, 로그에 기록하지 않는다. 상세 계약과 복구 순서는
`docs/DEVELOPMENT-DEPLOYMENT-BACKUP.md`를 따른다.

## 복구 rehearsal

복구는 운영 volume에 바로 덮어쓰지 않는다.

1. 별도 MySQL volume과 별도 이미지 directory를 준비한다.
2. `database/dump`를 격리 MySQL에 복구한다.
3. Flyway history, FK, charset/collation, 핵심 row count를 확인한다.
4. 이미지 snapshot과 `post_attachments.object_key`를 다시 대조한다.
5. 검증용 API를 `ddl-auto=validate`로 시작한다.
6. 검증 결과를 기록한 뒤에만 운영 복구 여부를 별도로 승인한다.

## 금지 사항

- `docker compose down -v`를 backup이나 rollback 명령으로 사용하지 않는다.
- 검증하지 않은 dump를 운영 volume에 바로 복구하지 않는다.
- secret, DB password, 실제 token을 manifest나 로그에 기록하지 않는다.
