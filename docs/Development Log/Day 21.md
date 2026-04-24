# Development Log - 2026-04-20

프로젝트: Cubing Hub

---

## 오늘 작업

- `k6/sql/seed-rankings-v1-baseline.sql`로 `users`, `records`, `user_pbs` 각 `300,000`건 기준선 데이터셋 생성 경로를 추가
- `k6/rankings-v1-baseline.js`로 `GET /api/rankings?eventType=WCA_333&page=1&size=25` 고정 시나리오를 추가
- `k6/generate-performance-report.mjs`와 `docs/performance/runbook.md`로 V1, V2 공통 리포트/실행 절차를 추가
- `docker-compose.yml`, `backend/src/main/resources/prometheus.yml`, `infra/grafana/**`를 갱신해 `k6 -> Prometheus -> Grafana` 최소 시각화 경로를 구성
- `.github/workflows/performance-benchmark.yml`로 수동 `workflow_dispatch` 벤치마크 workflow를 추가
- V1 기준선을 실제 실행하고 `docs/performance/rankings-v1-*` 산출물을 생성

---

## 핵심 정리 상세

### 30만 PB 기준 기준선 데이터셋 고정

#### 문제 상황
- Redis 리팩토링 전후 비교를 하려면 V1과 V2가 같은 랭킹 후보 수를 봐야 했다.
- 랭킹 V1 병목 구간은 `records` 총량보다 같은 종목 `user_pbs` 후보 수의 영향을 크게 받으므로, 기준선 데이터는 `user_pbs`를 최대한 명확하게 고정할 필요가 있었다.

#### 해결 방법
- `seed-rankings-v1-baseline.sql` 하나로 `users`, `records`, `user_pbs`를 각각 `300,000`건씩 생성하도록 고정했다.
- 계정 규칙은 `user1@test.com`부터 `user300000@test.com`까지, 공통 로그인 비밀번호 원문은 `pass1234!`로 맞췄다.
- 각 유저는 `WCA_333` 기록 1건과 PB 1건만 가지도록 단순화해 랭킹 조회 비교에 필요한 최소 구조만 남겼다.

#### 결과
- V1, V2 모두 `DB reset(create) -> 같은 seed 적재 -> 같은 k6 시나리오 실행` 절차로 다시 측정할 수 있는 기준선이 생겼다.
- 실제 로컬 적재 후 row count는 `users 300000`, `records 300000`, `user_pbs 300000`으로 확인했다.

### `k6 -> Prometheus -> Grafana` 최소 시각화 경로 구성

#### 문제 상황
- 기존 로컬 구성에는 Prometheus와 Grafana 컨테이너가 있었지만 `k6` 결과를 같은 대시보드 축에서 바로 비교할 수 있는 연결은 없었다.
- V1, V2를 포트폴리오용 전/후 캡처로 남기려면 같은 대시보드와 같은 라벨 체계가 필요했다.

#### 해결 방법
- Prometheus에 `--web.enable-remote-write-receiver`를 추가해 `k6 experimental-prometheus-rw` 출력을 받을 수 있게 했다.
- Grafana provisioning과 `Rankings Baseline` 대시보드를 추가해 `run`, `storage` 변수로 같은 패널을 재사용하도록 맞췄다.
- 패널은 `Requests/s`, `Response Time avg`, `Response Time p95`, `Error Rate`, `Virtual Users`, `JVM Heap Used`, `GC Pause Rate`로 구성했다.
- 별도 `performance-benchmark.yml`을 추가해 GitHub Actions에서도 수동 벤치마크와 `summary.json`, `comparison.md` artifact 업로드를 재현할 수 있게 했다.

#### 결과
- 스모크 실행 기준으로 `k6_http_reqs_total`, `k6_http_req_duration_avg`, `k6_http_req_duration_p95`, `k6_http_req_failed_rate`, `k6_vus`가 Prometheus에 적재되는 것을 확인했다.
- Grafana API에서 `Rankings Baseline` 대시보드 provisioning 인식도 확인했다.

### V1 기준선 실행 결과

#### 실행 조건
- API: `GET /api/rankings?eventType=WCA_333&page=1&size=25`
- 저장소 라벨: `v1 / mysql`
- 데이터셋: `users`, `records`, `user_pbs` 각 `300,000`
- `k6` 시나리오: `30s warmup -> 90s steady -> 15s cooldown`, 최대 `60 VUs`

#### 핵심 결과
- `http_req_duration avg`: `7,810.60 ms`
- `http_req_duration p95`: `13,023.45 ms`
- `http_req_duration max`: `14,105.83 ms`
- `http_reqs count`: `532`
- `http_reqs rate`: `3.81/s`
- `http_req_failed`: `0.00%`
- `checks`: `100.00%`

#### 해석
- V1 기준선 실행은 기능 오류 없이 끝났지만, `p(95)<1500ms` 임계값은 실패했다.
- 즉 현재 MySQL `user_pbs` 기반 랭킹 조회는 `300,000` PB 후보 기준에서 읽기 지연이 크고, Redis ZSET 전환 후 비교 이득이 선명하게 드러날 조건이다.
- 산출물은 `docs/performance/rankings-v1-summary.json`, `docs/performance/rankings-v1-report.md`, `docs/performance/rankings-v1-report.html`에 남겼다.
- `report.html`은 그래프 리포트가 아니라 `summary.json` 기반 요약표다.
- V1, V2 전/후 시각화 기준은 Grafana `Rankings Baseline` 대시보드 캡처로 유지한다.

---

## 사용 기술

- MySQL
- Redis
- Prometheus
- Grafana
- k6
- GitHub Actions
- Spring Boot

---

## 검증

- `docker compose up -d prometheus grafana`
- `docker exec -i cubing_hub_mysql mysql ... < k6/sql/seed-rankings-v1-baseline.sql`
- `curl http://127.0.0.1:8080/actuator/health`
- `curl 'http://127.0.0.1:8080/api/rankings?eventType=WCA_333&page=1&size=3'`
- `k6 run -o experimental-prometheus-rw=http://127.0.0.1:9090/api/v1/write --summary-export ... k6/rankings-v1-baseline.js`
- `node --check k6/generate-performance-report.mjs`
- `curl 'http://127.0.0.1:9090/api/v1/query?query=k6_http_req_duration_p95'`
- `curl -u admin:*** 'http://127.0.0.1:3000/api/search?query=Rankings%20Baseline'`

`k6` 기준선 실행 자체는 `http_req_duration p95 < 1500ms` threshold 때문에 종료 코드 `99`를 반환했다. 이는 실행 실패가 아니라 `2026-04-20` 기준선 측정 결과로 기록한다.
