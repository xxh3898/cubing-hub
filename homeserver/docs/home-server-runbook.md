# Mac mini 운영 Runbook

## 배포 전 확인

- `/Users/homeserver/Server/apps/cubing-hub/.env`가 존재하고, runtime
  config v2 도입 후에는 검증된 `state`와 `current` release가 일치한다.
  v2 state가 아직 없는 기존 설치에서만 app directory의 legacy
  `compose.yaml`을 사용한다.
- `API_IMAGE`, `WEB_IMAGE`는 GHCR의 같은 40자리 commit SHA를 가리킨다.
- 두 image의 platform은 `linux/arm64`다.
- `/Users/homeserver/Server/data/cubing-hub/post-images/`가 존재한다.
- external Docker network `edge`와 공유 `cloudflared`가 정상이다.
- `/usr/local/bin/docker`를 비대화형 SSH에서도 실행할 수 있다.

## CI 배포

배포 worker는 실제 적용을 시작할 때와 종료할 때 HomeOps runtime-config의 고정 event reporter에 `RUNNING` 및 `SUCCESS`/`FAILED`/`ROLLED_BACK` metadata를 전달한다. Reporter는 HomeOps `.env`의 전용 ingestion secret과 `smoke.origin`을 읽고 전송 전 local spool에 기록한다. HomeOps 또는 reporter가 unavailable이어도 Cubing Hub 배포·rollback 판정은 바뀌지 않는다. Reporter·secret·spool 설치와 운영 활성화는 HomeOps runbook의 별도 승인 절차다.

GitHub Actions는 GHCR token을 stdin으로 전달하고 forced-command SSH에서
아래 논리 명령만 호출한다.

```text
deploy-cubing-hub <40자리 commit SHA> <registry user>
deploy-cubing-hub-v2 <40자리 commit SHA> keep <registry user>
deploy-cubing-hub-v2 <40자리 commit SHA> update <config digest> <registry user>
```

현재 운영 서버에서 v2 workflow를 `main`에 병합하기 전에는 아래 두 stable
진입점만 한 번 설치한다.

```text
homeserver/scripts/deploy-home-server-ci.sh
  -> /Users/homeserver/Server/scripts/deploy/deploy-cubing-hub-ci.sh
homeserver/scripts/backup-home-server-bootstrap.sh
  -> /Users/homeserver/Server/scripts/backup/backup-cubing-hub-bootstrap.sh
```

기존 진입점은 timestamp backup으로 보존하고, 설치본의 SHA-256이 repository
원본과 일치하는지, mode가 `700`인지, `/bin/bash -n`과 잘못된 forced command
및 backup 인자 거부가 통과하는지 확인한 뒤에만 merge한다.
`deploy-home-server.sh`와 `backup-home-server.sh`를 고정 운영 경로에
사전 설치하거나 branch 원본으로 교체하지 않는다. 기존 고정 worker는
pre-v2 또는 기존 2파일 release의 recovery fallback으로만 보존한다.
설치 전에는 기존 deploy worker가 `recover`를 지원하고 기존 backup worker가
실행 가능한지 확인한다. 이 fallback 계약을 충족하지 않으면 worker를 임의로
덮어쓰지 말고 전환을 중단한다.
첫 `update`가 exact runtime-config digest 안의 새 deploy/backup worker를
함께 staging하며, 이후 worker 변경도 runtime-config 변경으로 감지해
자동 동기화한다.

마지막 성공 production deployment 이후 `homeserver/docker-compose.yml`,
pinned Cloudflare real-IP 설정, 허용된 deploy/backup script,
`.dockerignore`의 runtime artifact 입력 또는
`homeserver/runtime-config.Dockerfile`이 변경된 배포만 immutable
runtime-config image를 새로 발행하고 `update`한다. 따라서 설정·script
배포가 실패해도 다음 배포가 변경을 이어받는다. 애플리케이션만 바뀌면
`keep`으로 현재 검증된 config digest를 유지한다.

runtime-config image에는 아래 네 파일만 들어간다.

```text
compose.yaml
nginx/cloudflare-edge-real-ip.conf
scripts/deploy-cubing-hub.sh
scripts/backup-cubing-hub.sh
```

고정 forced-command/bootstrap은 exact digest, revision/project label, regular-file
allowlist, 전체 content hash, script mode `700`과 `/bin/bash -n`을 검증한
뒤 immutable release의 candidate deploy script를 실행한다. 첫 성공 전
recovery에만 legacy Compose와 고정 legacy worker를 사용할 수 있다. 정상
`update`와 backup은 candidate release worker를 사용한다. v2 성공 뒤에는
`runtime-config/current`가 Compose와 deploy/backup script의 공통 active
release를 가리킨다. `keep`, recovery와 정기 backup은 이 release의 검증된
script를 사용한다.

Deploy와 scheduled backup 진입점은
`/Users/homeserver/Server/apps/cubing-hub/.cubing-hub-operation.lock`의 같은
non-blocking advisory lock을 FD `9`로 잡고 worker 전체 실행 동안 유지한다.
다른 작업이 실행 중이면 새 작업은 exit `75`로 fail-closed하며 pull, backup,
state 또는 container 변경을 시작하지 않는다. Lock file은 mode `600`
regular file로 계속 보존하고 프로세스 종료 시 kernel lock이 자동
해제되므로 수동으로 삭제하지 않는다.

Artifact 추출·script 검증 또는 candidate preflight가 실패하면
`state`, `current`, `.env`와 실행 중 container를 바꾸지 않는다. Candidate
배포가 실패하면 기존 application/config pair를 재적용하며 `current`는
기존 release를 유지한다. Stable wrapper/bootstrap 자체를 바꾸는 작업만
기존 파일의 timestamp backup과 별도 운영 승인 아래 수동 설치한다.

배포 script는 Compose 전체 snapshot을 복제하지 않는다. healthcheck timing,
logging, restart, replica, PID·tmpfs mount option과 일반 application
environment 변경은 Compose render와 service health로 검증한다. 대신 아래
운영 보호 경계만 고정한다.

- `db`, `redis`, `api`, `web` service와 API/Web exact image
- DB·Redis command/entrypoint, DB의 `MYSQL_*`, API의 DB·Redis·upload identity와
  Spring profile·datasource·JPA·Flyway·Liquibase·SQL init·config JSON 및
  JVM option 설정
- API/Web image command·entrypoint override 금지
- DB·Redis·Web healthcheck `test` 명령과 배포 완료 시 실제
  running/healthy 상태. healthcheck timing은 변경 가능
- 각 service의 process user와 정규화한 `tmpfs` mount target 집합
- MySQL·Redis named volume과 기존 upload bind identity
- internal application, API 전용 outbound, shared edge network 경계
- host port, privileged mode, Docker socket, host namespace, 추가 host bind,
  `extra_hosts`·link를 통한 service hostname override 금지
- Compose `configs`, `secrets`, `env_file`을 통한 host file 주입 금지
- candidate release의 pinned Nginx real-IP bind

DB·Redis image·실행 명령이나 data-sensitive Spring 설정 등 위 보호 경계를
바꾸는 작업은 일반 runtime config 동기화가 아니라 별도
migration·backup·rollback 계획으로 진행한다.

첫 배포는 기존 image SHA가 없으므로 다음 순서로 진행한다.

1. 신규 API/web image pull
2. Compose render
3. 신규 MySQL·Redis volume 시작과 health 확인
4. candidate API image의 one-shot Flyway migration·validate
5. API/web 시작과 Compose health 확인
6. public Web·deep link·API·asset smoke 확인

두 번째 배포부터는 다음 순서로 진행한다.

1. 신규 API/Web image pull과, `update`일 때만 runtime config exact digest pull
2. config provenance, 파일 allowlist, deploy/backup script mode·문법,
   network·upload bind 계약과 Compose render
3. 운영 DB 실행 상태 확인
4. MySQL dump와 게시글 이미지 backup
5. candidate API image의 one-shot Flyway migration·validate
6. `.env`의 API/Web image를 같은 신규 SHA로 교체
7. Compose 적용과 health 확인
8. public Web·deep link·API·asset smoke 확인
9. 실패 시 이전 API/Web SHA와 runtime config를 함께 복구하고 public smoke 재확인

DB migration은 image rollback과 별개다. Flyway migration 뒤 이전
image가 새 schema와 호환되지 않으면 자동 rollback 결과를 성공으로
간주하지 말고 수동 판단한다.

두 one-shot 단계는 candidate API/Web image pair를 subprocess의 Compose
interpolation에만 주입하고 `--pull never`를 사용한다. Migration 성공 전에는
`.env`, state/current와 실행 중 application을 바꾸지 않는다.

## 중단된 runtime config transaction 복구

v2 배포가 강제 종료되거나 host가 재시작되어
`/Users/homeserver/Server/apps/cubing-hub/runtime-config/pending`이 남으면
후속 v2 배포는 fail closed한다. pending 파일을 직접 삭제하거나 수정하지
말고 Mac mini에서 다음 recovery 명령을 실행한다.

```bash
/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub-ci.sh recover
```

고정 forced-command/bootstrap은 검증된 state가 있으면 active release의 deploy
script로 recovery를 전달한다. Recovery는 pending key와 SHA/digest 형식,
마지막 검증 state, Compose·Nginx·deploy/backup script allowlist와 content
hash를 먼저 대조한다.

배포 worker는 `RUNNING` 전송 전에
`runtime-config/homeops-deployment`에 event key, 시작 시각, target SHA를
원자 저장한다. 따라서 application/runtime image pull처럼 transaction pending
생성 전 단계에서 host restart 또는 `SIGKILL`이 발생해도 `recover`가 중단
lifecycle을 `FAILED`로 닫을 수 있다. v2 worker는 검증된 previous/target pair를
담은 operational `pending`을 첫 data-service mutation보다 먼저 저장한다. 이
context만 남고 operational `pending`이 없다면 recovery는 운영 service를
변경하지 않고 event만 종료한다. Legacy worker에는 이 별도 context를 적용하지
않는다. 다음 정상 v2 배포도 유효한 context-only lifecycle을 먼저 `FAILED`로
종료할 수 있으며, context 검증·정리에 실패하면 새 telemetry만 생략하고 배포
자체는 계속한다.

새 pending state도 중단 시점의 HomeOps deployment event key와 시작 시각을
보존한다. Operational pending이 있으면 recovery는 남아 있는 lifecycle을
`FAILED`로 닫고 고유한 recovery lifecycle을 시작한다. Recovery lifecycle용
context 원자 저장에 실패하면 새 telemetry event는 시작하지 않지만 실제
transaction recovery는 계속한다. Target pair 확정은 `SUCCESS`, previous pair
또는 bootstrap 복원은 `ROLLED_BACK`, recovery 실패는 `FAILED`로 기록한다.
기존 4-key pending state도 telemetry context 없이 계속 복구할 수 있다.

- 성공 state가 이미 target pair라면 `.env`와 실행 service를 검증한 뒤
  검증된 target release로 stale `current` pointer를 원자 조정하고 pending
  marker를 정리한다.
- state가 previous pair라면 이전 API/Web SHA와 config release를
  `--pull never`로 다시 적용하고 health가 통과한 뒤 marker를 정리한다.
- runtime config 도입 전 기존 설치라면 legacy Compose와 이전 SHA로
  복구한다.
- 정상 image가 한 번도 없던 bootstrap 중단이라면 API/Web을 중지하고
  zero-SHA placeholder로 되돌려 다음 배포가 첫 배포로 다시 시작하게 한다.
- pending/state가 서로 맞지 않거나 release가 변조됐으면 아무것도
  정리하지 않고 실패한다.
- 첫 성공 시 app directory에 별도 initialization marker를 원자 생성한다.
  이 marker가 있는데 `state` 또는 `current`가 사라지면 pre-v2 설치로
  fallback하지 않고 실패한다. marker가 생기기 전 실패한 bootstrap의
  동일 digest candidate release는 다음 `update`에서 image와 다시 대조한
  뒤 재사용할 수 있다.

복구 후 production Compose `ps`, API/Web health, DB·Redis health와 public
URL을 다시 확인한다. Flyway migration은 recovery가 되돌리지 않는다.

## 수동 상태 확인

Mac mini에서 다음 명령을 사용한다.

```bash
app_dir=/Users/homeserver/Server/apps/cubing-hub
runtime_root="${app_dir}/runtime-config"
runtime_digest="$(
  /usr/bin/sed -n 's/^RUNTIME_CONFIG_DIGEST=//p' \
    "${runtime_root}/state"
)"
[[ "${runtime_digest}" =~ ^sha256:[0-9a-f]{64}$ ]]
runtime_release="${runtime_root}/releases/${runtime_digest#sha256:}"
test "$(/usr/bin/readlink "${runtime_root}/current")" = \
  "releases/${runtime_digest#sha256:}"
test -f "${runtime_release}/compose.yaml"

/usr/local/bin/docker compose \
  --project-name cubing-hub \
  --project-directory "${runtime_release}" \
  --env-file "${app_dir}/.env" \
  --file "${runtime_release}/compose.yaml" \
  ps

/usr/local/bin/docker compose \
  --project-name cubing-hub \
  --project-directory "${runtime_release}" \
  --env-file "${app_dir}/.env" \
  --file "${runtime_release}/compose.yaml" \
  logs --tail 200 api web db redis
```

runtime config v2 state가 아직 없는 기존 설치에서만
`${app_dir}/compose.yaml`을 Compose file로 사용한다.

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
app_dir=/Users/homeserver/Server/apps/cubing-hub
runtime_root="${app_dir}/runtime-config"
runtime_digest="$(
  /usr/bin/sed -n 's/^RUNTIME_CONFIG_DIGEST=//p' \
    "${runtime_root}/state"
)"
[[ "${runtime_digest}" =~ ^sha256:[0-9a-f]{64}$ ]]
runtime_release="${runtime_root}/releases/${runtime_digest#sha256:}"
test "$(/usr/bin/readlink "${runtime_root}/current")" = \
  "releases/${runtime_digest#sha256:}"
test -f "${runtime_release}/compose.yaml"

/usr/local/bin/docker compose \
  --project-name cubing-hub \
  --project-directory "${runtime_release}" \
  --env-file "${app_dir}/.env" \
  --file "${runtime_release}/compose.yaml" \
  --file "${app_dir}/compose.admin.yaml" \
  --profile admin \
  up --detach db-admin-proxy
```

관리 접속은 `127.0.0.1:3307`만 사용한다. 작업을 마치면 proxy를
중지하고 제거한다.

## 백업

```bash
/Users/homeserver/Server/scripts/backup/backup-cubing-hub-bootstrap.sh
```

고정 backup bootstrap은 `state`, `current`, content hash를 검증해 active
release의 backup worker를 실행한다. Worker는 MySQL dump와 게시글 이미지
snapshot을 같은 run으로 만들고,
dump에서 파생한 `post_attachments.object_key`가 가리키는 파일이 없으면
실패한다. Table row count와 object-key reference도 dump에서 파생하며 dump 뒤
live DB query로 대체하지 않는다.
성공 결과를 최종 directory로 이동한 뒤에만 오래된 backup을 정리한다.
Deploy 또는 다른 backup이 공통 lock을 보유하거나 runtime config
`pending` recovery가 남아 있으면 backup은 운영 data를 읽기 전에 실패한다.

Worker는 최근 정상 snapshot 4개와 지난 7 calendar day마다 KST 06:00 이후
첫 정상 snapshot 1개의 보존 대상을 `retention-plan.json`에 계산한다. 현재는
dry-run만 수행하며 backup을 삭제하지 않는다. 실패한 run은 조사할 수 있도록
임시 directory를 남기며 기존 정상 snapshot을 변경하지 않는다. 정상
snapshot은 age로 암호화한 뒤 local staging과 iCloud Drive project directory로
전달하며 heartbeat는 local publish와 iCloud handoff 뒤에 각각 전송한다.

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
