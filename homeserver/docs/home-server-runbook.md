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
deploy-cubing-hub-v2 <40자리 commit SHA> keep <registry user>
deploy-cubing-hub-v2 <40자리 commit SHA> update <config digest> <registry user>
```

v2 workflow를 `main`에 병합하기 전에 repository의
`homeserver/scripts/deploy-home-server.sh`와
`homeserver/scripts/deploy-home-server-ci.sh`를 각각 Mac mini의
`/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub.sh`와
`/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub-ci.sh`에
사전 설치해야 한다. 기존 파일을 timestamp backup으로 보존하고, 설치본의
SHA-256이 repository 원본과 일치하는지, mode가 `700`인지, `/bin/bash -n`과
잘못된 forced command 거부가 통과하는지 확인한 뒤에만 merge한다.
이 prerequisite가 완료되지 않으면 기존 wrapper가 v2 명령을 거부하므로
workflow를 병합하지 않는다. deploy script는 runtime config artifact의
자동 동기화 대상이 아니다.

`homeserver/docker-compose.yml`, pinned Cloudflare real-IP 설정 또는
`homeserver/runtime-config.Dockerfile`이 변경된 배포만 immutable
runtime-config image를 새로 발행하고 `update`한다. 애플리케이션만 바뀌면
`keep`으로 현재 검증된 config digest를 유지한다.

첫 배포는 기존 image SHA가 없으므로 다음 순서로 진행한다.

1. 신규 API/web image pull
2. Compose render
3. 신규 MySQL·Redis volume 시작과 health 확인
4. API/web 시작
5. Flyway, API health, web health 확인

두 번째 배포부터는 다음 순서로 진행한다.

1. 신규 API/Web image pull과, `update`일 때만 runtime config exact digest pull
2. config provenance, 파일 allowlist, network·upload bind 계약과 Compose render
3. 운영 DB 실행 상태 확인
4. MySQL dump와 게시글 이미지 backup
5. `.env`의 API/Web image를 같은 신규 SHA로 교체
6. Compose 적용과 health 확인
7. 실패 시 이전 API/Web SHA와 runtime config를 함께 복구

DB migration은 image rollback과 별개다. Flyway migration 뒤 이전
image가 새 schema와 호환되지 않으면 자동 rollback 결과를 성공으로
간주하지 말고 수동 판단한다.

## 중단된 runtime config transaction 복구

v2 배포가 강제 종료되거나 host가 재시작되어
`/Users/homeserver/Server/apps/cubing-hub/runtime-config/pending`이 남으면
후속 v2 배포는 fail closed한다. pending 파일을 직접 삭제하거나 수정하지
말고 Mac mini에서 다음 recovery 명령을 실행한다.

```bash
/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub.sh recover
```

recovery는 pending key와 SHA/digest 형식, 마지막 검증 state, release
allowlist와 content hash를 먼저 대조한다.

- 성공 state가 이미 target pair라면 `.env`, `current` pointer와 실행
  service를 검증한 뒤 pending marker만 정리한다.
- state가 previous pair라면 이전 API/Web SHA와 config release를
  `--pull never`로 다시 적용하고 health가 통과한 뒤 marker를 정리한다.
- runtime config 도입 전 기존 설치라면 legacy Compose와 이전 SHA로
  복구한다.
- 정상 image가 한 번도 없던 bootstrap 중단이라면 API/Web을 중지하고
  zero-SHA placeholder로 되돌려 다음 배포가 첫 배포로 다시 시작하게 한다.
- pending/state가 서로 맞지 않거나 release가 변조됐으면 아무것도
  정리하지 않고 실패한다.

복구 후 production Compose `ps`, API/Web health, DB·Redis health와 public
URL을 다시 확인한다. Flyway migration은 recovery가 되돌리지 않는다.

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

- API/Web 또는 runtime config 문제면 이전 두 SHA와 이전 config digest를
  한 쌍으로 되돌린다.
- DB와 image volume을 삭제하는 `docker compose down -v`를 사용하지
  않는다.
- 첫 배포 실패 시 신규 data service는 보존하고 실패한 API/web만
  중지한다.
- Tunnel 문제면 Cubing Hub route만 비활성화하고 공유 connector와 다른
  서비스 route는 건드리지 않는다.
- GHCR 인증 실패 시 임시 Docker config가 cleanup됐는지 확인하되 token을
  출력하지 않는다.
