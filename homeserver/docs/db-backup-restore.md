# DB와 이미지 백업/복구

## 백업 대상

- MySQL dump
- 게시글 이미지 디렉터리
- backup manifest

Redis는 refresh token, blacklist, 이메일 인증 임시 상태, 랭킹 읽기 모델 성격이므로 영속 기준 데이터로 보지 않는다. 다만 Redis AOF volume은 재시작 안정성을 위해 유지한다.

## 기본 위치

```text
~/backups/cubing-hub/
~/cubing-hub-runtime/post-images/
```

## 백업 스크립트

홈서버 백업은 `homeserver/scripts/backup-home-server.sh`로 실행한다.

```bash
homeserver/scripts/backup-home-server.sh
```

기본값은 아래와 같다.

```text
ENV_FILE=$HOME/cubing-hub-runtime/homeserver.env
BACKUP_ROOT=$HOME/backups/cubing-hub
MYSQL_CONTAINER=cubing_hub_mysql
BACKUP_RETENTION_COUNT=0
```

`BACKUP_RETENTION_COUNT=0`은 오래된 백업 삭제를 하지 않는다는 뜻이다. 자동 삭제가 필요하면 명시적으로 양수를 지정한다.

## 주기 실행

macOS에서는 `homeserver/launchd/com.cubinghub-backup.plist.example`을 사용자 `LaunchAgent`로 설치해 매일 새벽 백업을 실행한다. Docker Desktop을 사용자 세션에서 실행하는 전제이므로 `LaunchDaemon`보다 `LaunchAgent`가 초기 운영에 맞다.

예시 파일에는 `__HOME_DIR__`, `__REPO_DIR__` placeholder가 있다. 실제 Mac mini에서 설치할 때 현재 홈 디렉터리와 저장소 경로로 치환한 뒤 `~/Library/LaunchAgents/com.cubinghub.backup.plist`에 둔다.

```bash
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
sed \
  -e "s#__HOME_DIR__#$HOME#g" \
  -e "s#__REPO_DIR__#/Users/chiho/cubing-hub#g" \
  homeserver/launchd/com.cubinghub-backup.plist.example \
  > "$HOME/Library/LaunchAgents/com.cubinghub.backup.plist"

plutil -lint "$HOME/Library/LaunchAgents/com.cubinghub.backup.plist"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.cubinghub.backup.plist"
launchctl kickstart -k "gui/$(id -u)/com.cubinghub.backup"
```

실행 상태와 로그는 아래에서 확인한다.

```bash
launchctl print "gui/$(id -u)/com.cubinghub.backup"
tail -n 100 "$HOME/Library/Logs/cubing-hub-backup.out.log"
tail -n 100 "$HOME/Library/Logs/cubing-hub-backup.err.log"
```

백업 결과물은 아래 구조로 만든다.

```text
~/backups/cubing-hub/<yyyyMMdd-HHmmss>/
  db.sql
  post-images/
  post-images-files.txt
  post-attachment-object-keys.txt
  missing-post-image-files.txt
  invalid-post-image-object-keys.txt
  manifest.json
```

스크립트는 `.in-progress-*` 작업 디렉터리에서 백업을 만들고, DB dump, 이미지 파일 복사, DB metadata와 이미지 파일 대조가 모두 통과한 뒤에만 최종 백업 디렉터리로 이동한다.

## 일관성 정책

DB에는 `post_attachments.image_url`과 `object_key`가 저장된다. DB dump에는 이미지 메타데이터가 있는데 파일 백업에 해당 이미지가 없으면 복구 후 게시글 이미지가 깨진다.

백업 스크립트는 아래 정책을 지킨다.

- DB dump와 이미지 디렉터리 백업을 같은 backup run으로 묶는다.
- DB dump만 성공하거나 이미지 파일 백업만 성공한 partial backup은 실패로 처리한다.
- backup manifest에 DB dump 파일, 이미지 snapshot 경로, 생성 시각, image file count를 기록한다.
- 복구 검증에서 DB attachment metadata와 파일 존재 여부를 대조한다.
- `post_attachments.object_key`가 root 밖으로 벗어나는 값이거나 백업된 이미지 파일에 존재하지 않으면 backup run을 실패로 처리한다.

## 복구 검증

1. 별도 테스트 volume에 MySQL dump를 복구한다.
2. 이미지 snapshot을 테스트 이미지 디렉터리에 복사한다.
3. app을 `validate`로 기동한다.
4. 게시글 상세에서 이미지 URL이 `/uploads/`로 응답하는지 확인한다.
5. DB attachment metadata가 가리키는 파일이 이미지 디렉터리에 존재하는지 확인한다.

## 금지 사항

- `docker compose down -v`를 백업이나 rollback 명령으로 사용하지 않는다.
- 백업 검증 전 AWS 리소스를 중단하지 않는다.
- secret 값을 backup manifest에 기록하지 않는다.
