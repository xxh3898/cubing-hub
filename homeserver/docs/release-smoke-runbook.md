---
doc_type: operation
status: active
created: 2026-08-11
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - homeserver/docker-compose.smoke.yml
  - homeserver/scripts/smoke-v2-1.sh
  - docs/06-quality/quality-gates.md
  - docs/07-operations/environments.md
---
# V2.1 Release Smoke Runbook

## 목적과 절대 경계

이 절차는 main merge 전에 최신 `dev` source를 production Dockerfile 경로로 build하여 실제 browser/device smoke를 수행한다. production deployment가 아니며 다음을 절대 사용하거나 변경하지 않는다.

- production Compose, container, DB, Redis, volume, network, `.env`, Cloudflare Tunnel
- `/Users/homeserver/Server/**` application data 또는 runtime config
- production domain, GitHub variable/Environment, deploy workflow

Compose project는 고정된 `cubing-hub-smoke`다. Web만 `127.0.0.1:18080`에 노출하며 MySQL, Redis, API, Mailpit은 host port를 노출하지 않는다. MySQL·post image volume은 project-scoped disposable data이며 Gradle cache는 one-shot builder의 tmpfs에만 둔다. Redis와 Mailpit data는 persistent volume을 사용하지 않는다.

## 시작 전 확인

repository checkout에서 release candidate의 exact branch/SHA와 clean working tree를 확인한다. smoke build는 Docker 내부 Gradle을 쓰며 host에 Java/Node를 설치하지 않는다. `api-build`는 Docker socket을 mount하지 않으므로 test container가 필요한 Gradle test와 Asciidoctor는 실행하지 않고 runtime JAR만 생성한다. full backend/frontend test는 CI Validate가 기준이다.

운영 resource는 read-only inventory만 확인한다. Memory Pressure가 yellow/red, swap 증가, disk 부족, 운영 health 저하가 있으면 start하지 않는다.

```bash
memory_pressure
vm_stat
df -h
docker system df
docker ps
docker stats --no-stream
```

## Smoke env 준비

production `.env`를 복사하거나 source하지 않는다.

```bash
cp homeserver/.env.smoke.example homeserver/.env.smoke
```

copy 뒤 `replace-with-`로 시작하는 세 credential을 새로운 smoke-only 값으로 바꾼다. tracked example에는 actual secret을 두지 않으며, local `.env.smoke`를 공유하거나 production에 재사용하지 않는다. 기본 origin은 `http://smoke.localhost:18080`이며 supported browser의 loopback hostname을 사용한다.

## Start, status, Flyway, logs

`up`은 one-shot Gradle builder로 JAR를 만든 뒤 production API/Web Dockerfile을 build하고 `--wait`로 smoke services의 health를 기다린다.

```bash
homeserver/scripts/smoke-v2-1.sh up
homeserver/scripts/smoke-v2-1.sh status
homeserver/scripts/smoke-v2-1.sh flyway
homeserver/scripts/smoke-v2-1.sh logs
```

정상 Flyway history에는 V1, V2, V3가 모두 `success`여야 한다. `up`은 default origin일 때 Web root와 same-origin `/actuator/health`를 loopback HTTP로 추가 확인한다. browser URL은 <http://smoke.localhost:18080>이다.

## Stop과 full destroy

테스트 뒤 일반 종료는 volume을 보존한다.

```bash
homeserver/scripts/smoke-v2-1.sh down
```

fresh database가 필요할 때만 아래 명령을 사용한다. 이는 `cubing-hub-smoke` project의 disposable volume과 application, ingress, one-shot builder network만 제거하며 production resource를 대상으로 하지 않는다.

```bash
homeserver/scripts/smoke-v2-1.sh destroy
```

## Browser manual smoke checklist

### Auth와 Timer

1. smoke account로 login하고 logout한다. 새 account가 필요하면 email verification request를 보내고, smoke-only Mailpit message는 host port를 열지 않고 Web container를 통해 확인한다.

   ```bash
   docker compose --project-name cubing-hub-smoke \
     --env-file homeserver/.env.smoke \
     --file homeserver/docker-compose.smoke.yml \
     exec -T web wget -qO- http://mailpit:8025/api/v1/messages
   ```

2. Keyboard Space 300ms hold, ready, start, stop을 확인한다. stopped display time과 saved Record raw time이 같다.
3. Touch/Pen solve도 확인하고 API/Record에서 `inputMethod=TOUCH`인지 확인한다. Keyboard solve는 `KEYBOARD`여야 한다.
4. authenticated save 뒤 next scramble 응답을 DevTools throttling으로 늦춘다. next scramble이 화면에 commit되기 전에는 이전 scramble로 Keyboard/Touch solve를 시작할 수 없어야 하며, statistics refresh가 늦어도 lock이 풀리면 안 된다.
5. NONE, PLUS_TWO, DNF와 delete를 실행하고 PB, ranking, Ao5/Ao12 결과를 확인한다. Ao5는 5 solves, Ao12는 12 solves 후 확인한다.

### Pending recovery와 idempotency

1. authenticated solve의 save request를 Browser DevTools Network request blocking 또는 offline mode로 response-loss처럼 만든다. production network나 service를 끊지 않는다.
2. reload 후 pending scramble, stopped time, Retry/Discard UI가 snapshot과 일치하는지 확인한다. 자동 POST는 발생하면 안 된다.
3. Retry는 같은 UUID/payload를 사용하고 server canonical response 뒤 pending을 제거하며 recent Record가 ID 기준 한 건만 남아야 한다.
4. response loss 뒤 다른 tab/session에서 penalty를 PLUS_TWO 또는 DNF로 바꾸고 Retry한다. current canonical penalty/effective time을 받아들이고 pending이 제거되어야 한다.
5. DevTools Application에서 current owner의 `cubing-hub.timer.pending.v1:*` value를 invalid JSON으로 바꾼 뒤 reload한다. Timer input은 locked이고 explicit Discard 후에만 다시 활성화되어야 한다.
6. account A pending을 만든 뒤 logout/login으로 account B에 전환한다. B는 A pending을 보거나 Retry할 수 없어야 한다.
7. save request의 401 뒤 refresh request를 DevTools에서 network failure로 만든다. passive sign-out 뒤에도 A의 pending은 남아야 하며, A가 다시 login하면 같은 UUID/payload로 Retry할 수 있고 canonical save 뒤에만 제거되어야 한다.
8. WCA_333 history request를 늦춘 뒤 unsupported event로 전환한다. 늦은 WCA_333 response가 선택된 event 아래 Ao5/Ao12를 다시 표시하면 안 된다.

### Guest

로그아웃 상태에서 guest solve, reload, PLUS_TWO, DNF, delete를 확인한다. legacy guest item에 `inputMethod`가 없을 때 UNKNOWN으로 읽히며 existing localStorage key와 최대 100 record behavior가 유지되어야 한다.

## iPhone / Touch smoke (별도 승인)

Tailscale Serve 변경은 별도 승인 없이는 실행하지 않는다. 현재 Serve config와 사용하지 않는 HTTPS port를 먼저 read-only로 확인한 뒤, dedicated port root에만 smoke Web을 publish한다. 예시는 기존 Serve path를 덮어쓰지 않는 dedicated port 방식이다.

```bash
# 별도 승인 후에만; exact port collision을 status로 먼저 확인한다.
tailscale serve --https=18080 --bg http://127.0.0.1:18080
```

이 경우 browser base URL도 Tailscale HTTPS origin으로 맞춰야 하므로 `SMOKE_ORIGIN=https://<tailnet-host>:18080`, `SMOKE_REFRESH_COOKIE_SECURE=true`로 smoke env를 조정하고 Web image를 다시 build한다. 그 뒤 iPhone Safari에서 touch start/stop, `TOUCH` provenance, authenticated save를 확인한다. PWA 설치는 V2.1 release blocker가 아니다.
