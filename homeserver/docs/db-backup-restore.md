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
/Users/homeserver/Server/data/cubing-hub/post-images/
/Users/homeserver/Server/backups/cubing-hub/
```

runtime config v2 initialization marker가 있으면 backup은 state의 content
hash와 `current` pointer가 함께 가리키는 immutable release Compose만
사용한다. marker가 있는데 state 또는 current가 없으면 손상 상태로
판단해 실패한다. marker, state, current가 모두 없는 기존 설치에서만 app
directory의 legacy `compose.yaml`로 fallback한다.

## 백업 실행

```bash
/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh
```

스크립트는 다음 순서로 실행한다.

1. 운영 `db` service 실행 상태 확인
2. 임시 directory에서 `mysqldump --single-transaction` 실행
3. 게시글 이미지 directory snapshot 생성
4. `post_attachments.object_key`와 snapshot 파일 대조
5. manifest 생성
6. 검증한 임시 directory를 최종 backup 이름으로 이동
7. 성공한 backup 중 최신 3개를 제외한 이전 backup 정리

최종 결과는 아래 형식이다.

```text
cubing-hub-production-<UTC yyyyMMddTHHmmssZ>/
  db.sql
  manifest.json
  post-images/
  post-images-files.txt
  post-attachment-object-keys.txt
  missing-post-image-files.txt
  invalid-post-image-object-keys.txt
```

backup이 실패하면 기존 정상 backup은 삭제하지 않는다. 실패 원인을
확인할 수 있도록 `.cubing-hub-backup.*` 임시 directory를 남긴다.

## 보관 정책

- 성공한 backup은 최신 3개만 보관한다.
- 정리 대상은
  `cubing-hub-production-YYYYMMDDTHHMMSSZ` 형식의 project backup
  directory로 제한한다.
- 새 backup을 최종 위치로 이동하기 전에는 정리하지 않는다.
- 다른 프로젝트 backup이나 예상하지 못한 이름의 directory를 삭제하지
  않는다.

## LaunchAgent

`homeserver/launchd/com.cubinghub-backup.plist.example`은 매일
04:10에 repository 밖의 고정 backup script를 실행한다.

```bash
mkdir -p /Users/homeserver/Library/LaunchAgents \
  /Users/homeserver/Library/Logs

cp homeserver/launchd/com.cubinghub-backup.plist.example \
  /Users/homeserver/Library/LaunchAgents/com.cubinghub.backup.plist

plutil -lint \
  /Users/homeserver/Library/LaunchAgents/com.cubinghub.backup.plist

launchctl bootstrap \
  "gui/$(id -u)" \
  /Users/homeserver/Library/LaunchAgents/com.cubinghub.backup.plist
```

## 복구 rehearsal

복구는 운영 volume에 바로 덮어쓰지 않는다.

1. 별도 MySQL volume과 별도 이미지 directory를 준비한다.
2. `db.sql`을 격리 MySQL에 복구한다.
3. Flyway history, FK, charset/collation, 핵심 row count를 확인한다.
4. 이미지 snapshot과 `post_attachments.object_key`를 다시 대조한다.
5. 검증용 API를 `ddl-auto=validate`로 시작한다.
6. 검증 결과를 기록한 뒤에만 운영 복구 여부를 별도로 승인한다.

## 금지 사항

- `docker compose down -v`를 backup이나 rollback 명령으로 사용하지 않는다.
- 검증하지 않은 dump를 운영 volume에 바로 복구하지 않는다.
- secret, DB password, 실제 token을 manifest나 로그에 기록하지 않는다.
