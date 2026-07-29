# Mac mini 운영 Runbook

## 배포 전 확인

- `/Users/homeserver/Server/apps/cubing-hub/compose.yaml`과 `.env`가
  존재한다.
- `API_IMAGE`, `WEB_IMAGE`는 GHCR의 같은 40자리 commit SHA를 가리킨다.
- 두 image의 platform은 `linux/arm64`다.
- `/Users/homeserver/Server/data/cubing-hub/post-images/`가 존재한다.
- external Docker network `edge`와 공유 `cloudflared`가 정상이다.
- `/usr/local/bin/docker`를 비대화형 SSH에서도 실행할 수 있다.

## CI 배포

GitHub Actions는 GHCR token을 stdin으로 전달하고 forced-command SSH에서
아래 논리 명령만 호출한다.

```text
deploy-cubing-hub <40자리 commit SHA> <registry user>
```

첫 배포는 기존 image SHA가 없으므로 다음 순서로 진행한다.

1. 신규 API/web image pull
2. Compose render
3. 신규 MySQL·Redis volume 시작과 health 확인
4. API/web 시작
5. Flyway, API health, web health 확인

두 번째 배포부터는 다음 순서로 진행한다.

1. 신규 API/web image pull과 Compose render
2. 운영 DB 실행 상태 확인
3. MySQL dump와 게시글 이미지 backup
4. `.env`의 API/web image를 같은 신규 SHA로 교체
5. Compose 적용과 health 확인
6. 실패 시 이전 API/web SHA를 함께 복구

DB migration은 image rollback과 별개다. Flyway migration 뒤 이전
image가 새 schema와 호환되지 않으면 자동 rollback 결과를 성공으로
간주하지 말고 수동 판단한다.

## 수동 상태 확인

Mac mini에서 다음 명령을 사용한다.

```bash
cd /Users/homeserver/Server/apps/cubing-hub
/usr/local/bin/docker compose \
  --env-file .env \
  --file compose.yaml \
  ps

/usr/local/bin/docker compose \
  --env-file .env \
  --file compose.yaml \
  logs --tail 200 api web db redis
```

공개 경로는 아래를 확인한다.

```bash
curl -I https://cubing-hub.com/
curl -I https://www.cubing-hub.com/
curl -fsS https://api.cubing-hub.com/actuator/health
```

## MySQL 관리 접속

기본 Compose는 MySQL port를 publish하지 않는다. 관리가 필요할 때만
저장소의 `homeserver/docker-compose.admin.yml`과 같은 검증된 override를
Mac mini app directory에 설치하고 admin profile을 실행한다.

```bash
/usr/local/bin/docker compose \
  --env-file .env \
  --file compose.yaml \
  --file compose.admin.yaml \
  --profile admin \
  up --detach db-admin-proxy
```

관리 접속은 `127.0.0.1:3307`만 사용한다. 작업을 마치면 proxy를
중지하고 제거한다.

## 백업

```bash
/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh
```

스크립트는 MySQL dump와 게시글 이미지 snapshot을 같은 run으로 만들고,
`post_attachments.object_key`가 가리키는 파일이 없으면 실패한다.
성공 결과를 최종 directory로 이동한 뒤에만 오래된 backup을 정리한다.

성공한 backup은 기본으로 최신 3개만 보관한다. 실패한 run은 조사할 수
있도록 임시 directory를 남기며 기존 정상 backup을 삭제하지 않는다.

## 첫 배포 검증

1. Flyway history에 `V1`, `V2`가 성공 상태인지 확인한다.
2. 회원, 기록, 게시글, 첨부 table이 빈 상태인지 확인한다.
3. Redis key가 빈 상태인지 확인한다.
4. 회원가입, 로그인, refresh, 기록 저장, 랭킹 반영을 확인한다.
5. 게시글 이미지 upload/read/delete를 확인한다.
6. backup을 한 번 실행하고 별도 volume에서 restore rehearsal을
   수행한다.
7. Portfolio와 Guess Pokémon 공개 경로에 회귀가 없는지 확인한다.

## 장애와 rollback

- API/web image 문제면 이전 두 SHA로 함께 되돌린다.
- DB와 image volume을 삭제하는 `docker compose down -v`를 사용하지
  않는다.
- 첫 배포 실패 시 신규 data service는 보존하고 실패한 API/web만
  중지한다.
- Tunnel 문제면 Cubing Hub route만 비활성화하고 공유 connector와 다른
  서비스 route는 건드리지 않는다.
- GHCR 인증 실패 시 임시 Docker config가 cleanup됐는지 확인하되 token을
  출력하지 않는다.
