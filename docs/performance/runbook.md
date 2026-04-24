# 성능 벤치마크 실행 문서

## 랭킹 벤치마크

### 범위

- 대상 API: `GET /api/rankings?eventType=WCA_333&page=1&size=25`
- 데이터셋: `users = 300,000`, `records = 300,000`, `user_pbs = 300,000`
- 사용자 계정: `userN@test.com` / `pass1234!`

### 2026-04-20 로컬 기준선

#### 1. schema 초기화

`ddl-auto=create`로 Spring Boot를 한 번 실행한 뒤 schema가 다시 만들어지면 종료한다.

```bash
cd backend
SPRING_PROFILES_ACTIVE=local \
SPRING_DOCKER_COMPOSE_ENABLED=false \
SPRING_JPA_HIBERNATE_DDL_AUTO=create \
./gradlew bootRun
```

#### 2. 기준선 데이터 적재

```bash
mysql -h 127.0.0.1 -uroot -p"${LOCAL_DB_PASSWORD}" cubing_hub < k6/sql/seed-rankings-v1-baseline.sql
```

#### 3. 기준선용 애플리케이션 실행

```bash
cd backend
SPRING_PROFILES_ACTIVE=local \
SPRING_DOCKER_COMPOSE_ENABLED=false \
SPRING_JPA_HIBERNATE_DDL_AUTO=update \
./gradlew bootRun
```

#### 4. `k6` 실행과 Prometheus/Grafana 메트릭 전송

```bash
K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max \
k6 run \
  -o experimental-prometheus-rw=http://localhost:9090/api/v1/write \
  --summary-export docs/performance/rankings-v1-summary.json \
  -e BASE_URL=http://localhost:8080 \
  -e RUN_LABEL=MySQL-v1 \
  -e STORAGE_LABEL=mysql \
  k6/rankings-v1-baseline.js
```

#### 5. 로컬 Markdown/HTML 요약 리포트 생성

```bash
node k6/generate-performance-report.mjs \
  --current docs/performance/rankings-v1-summary.json \
  --current-label "MySQL-v1" \
  --output-md docs/performance/rankings-v1-report.md \
  --output-html docs/performance/rankings-v1-report.html \
  --title "Rankings MySQL V1 Report"
```

- `report.md`, `report.html`은 `summary.json` 기반 요약 리포트다.
- 시간축 그래프와 포트폴리오용 전/후 시각화는 Grafana 대시보드 캡처를 기준으로 둔다.

### 2026-04-21 비교

#### 1. schema 재초기화

`2026-04-20` 기준선과 같은 초기화 절차를 다시 사용한다.

#### 2. 동일한 seed 재적재

`2026-04-20` 기준선과 같은 seed SQL을 다시 사용한다.

#### 3. Redis 기반 구현 실행

`2026-04-21` Redis V2 구현을 같은 실행 조건으로 기동한다.

#### 4. `k6` 재실행

```bash
K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max \
k6 run \
  -o experimental-prometheus-rw=http://localhost:9090/api/v1/write \
  --summary-export docs/performance/rankings-v2-summary.json \
  -e BASE_URL=http://localhost:8080 \
  -e RUN_LABEL=redis-v2 \
  -e STORAGE_LABEL=redis \
  k6/rankings-v1-baseline.js
```

#### 5. 비교 요약 리포트 생성

```bash
node k6/generate-performance-report.mjs \
  --previous docs/performance/rankings-v1-summary.json \
  --previous-label "MySQL-v1" \
  --current docs/performance/rankings-v2-summary.json \
  --current-label "redis-v2" \
  --output-md docs/performance/rankings-v1-v2-comparison.md \
  --output-html docs/performance/rankings-v1-v2-comparison.html \
  --title "Rankings Benchmark Comparison"
```

- 비교 `md`, `html`도 요약표 중심 산출물이다.
- V1, V2 전/후 그래프는 Grafana 동일 대시보드 캡처로 보관한다.

### Grafana 대시보드

- 폴더: `Cubing Hub Performance`
- 대시보드 제목: `Rankings Baseline`
- 변수:
  - `run`
  - `storage`

V1, V2 결과는 같은 대시보드, 같은 시간 범위, 같은 패널 레이아웃으로 캡처한다.

권장 로컬 캡처 파일:

- `docs/performance/grafana/rankings-mysql-v1.png`
- `docs/performance/grafana/rankings-redis-v2.png`
- 필요 시 비교 캡처를 추가한다.

## MyPage summary 벤치마크

### 범위

- 대상 API: `GET /api/users/me/profile`
- 기본 데이터셋: `10 users x 10,000 records`
- 본측정 권장 데이터셋: `10 users x 50,000 records`
- 사용자 계정: `mypage-benchmark-userN@test.com` / `pass1234!`

### 1. 기준선 worktree 준비

현재 최적화 커밋을 유지한 채 직전 커밋 기준선을 별도 worktree로 분리한다.

```bash
git worktree add ../cubing-hub-mypage-baseline 1dcc04e
```

### 2. DB 초기화

로컬 MySQL volume에 이전 벤치마크 데이터가 남아 있을 수 있으므로 database를 직접 drop/create 한다.

```bash
docker exec -i cubing_hub_mysql mysql -uroot -p"${LOCAL_DB_PASSWORD}" <<'SQL'
DROP DATABASE IF EXISTS cubing_hub;
CREATE DATABASE cubing_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
```

### 3. 벤치마크용 backend 실행

빈 database에서 backend를 먼저 올려 schema를 생성한다.

```bash
cd backend
SERVER_PORT=18080 \
SPRING_PROFILES_ACTIVE=local \
SPRING_DOCKER_COMPOSE_ENABLED=false \
SPRING_JPA_HIBERNATE_DDL_AUTO=update \
RANKING_REDIS_REBUILD_MODE=disabled \
./gradlew bootRun
```

### 4. MyPage seed 적재

기본값은 `10 users x 10,000 records`다.

```bash
mysql -h 127.0.0.1 -uroot -p"${LOCAL_DB_PASSWORD}" cubing_hub < k6/sql/seed-mypage-summary-baseline.sql
```

본측정처럼 user/record 수를 바꾸고 싶으면 파일 앞에서 user 변수만 덮어쓴다.

```bash
{
  echo "SET @benchmark_user_count = 10;"
  echo "SET @records_per_user = 50000;"
  cat k6/sql/seed-mypage-summary-baseline.sql
} | mysql -h 127.0.0.1 -uroot -p"${LOCAL_DB_PASSWORD}" cubing_hub
```

### 5. `k6` 실행

```bash
docker run --rm \
  -v "${PWD}:/workspace" \
  -w /workspace \
  -e BASE_URL=http://host.docker.internal:18080 \
  -e RUN_LABEL=mypage-summary-current \
  -e STORAGE_LABEL=mysql \
  -e BENCHMARK_USER_COUNT=10 \
  grafana/k6 run \
  --summary-export /workspace/docs/performance/mypage-summary-current.json \
  /workspace/k6/mypage-summary-profile.js
```

짧은 스모크 검증은 duration과 VU를 줄여서 실행한다.

```bash
docker run --rm \
  -v "${PWD}:/workspace" \
  -w /workspace \
  -e BASE_URL=http://host.docker.internal:18080 \
  -e RUN_LABEL=mypage-summary-smoke \
  -e BENCHMARK_USER_COUNT=2 \
  -e WARMUP_DURATION=2s \
  -e STEADY_DURATION=3s \
  -e COOLDOWN_DURATION=1s \
  -e WARMUP_VUS=1 \
  -e TARGET_VUS=2 \
  grafana/k6 run \
  /workspace/k6/mypage-summary-profile.js
```

### 6. 전/후 비교 리포트 생성

기준선 summary와 current summary를 같은 형식으로 생성한 뒤 기존 report generator를 그대로 사용한다.

```bash
node k6/generate-performance-report.mjs \
  --previous docs/performance/mypage-summary-baseline.json \
  --previous-label "baseline" \
  --current docs/performance/mypage-summary-current.json \
  --current-label "current" \
  --output-md docs/performance/mypage-summary-comparison.md \
  --title "MyPage Summary Benchmark Comparison"
```

### 7. 참고

- 이 벤치마크는 전체 테이블 row 수보다 `요청 대상 사용자당 records 수`에 더 민감하다.
- 첫 단계는 `GET /api/users/me/profile`만 벤치마크 대상으로 두고, 필요하면 이후 `GET /api/home`를 별도 시나리오로 확장한다.
- 로컬에서 이미 `8080` 포트를 사용 중이면 벤치마크용 backend는 별도 포트(`18080`)로 고정하는 편이 안전하다.

### Grafana 시각화

랭킹 벤치마크와 같은 방식으로 `k6 -> Prometheus -> Grafana` 경로를 재사용할 수 있다.

기본 전제:

- 벤치마크용 backend는 `8080` 포트에서 실행한다.
- Prometheus scrape target은 기본값 `host.docker.internal:8080`을 그대로 사용한다.
- 사용자가 이미 `8080`을 점유 중이면 이 절차 대신 위의 `18080` 대체 경로만 사용한다.

#### 1. Grafana 대시보드

- 폴더: `Cubing Hub Performance`
- 대시보드 제목: `MyPage Summary Benchmark`
- 변수:
  - `run`
  - `storage`

#### 2. 기준선 remote write 실행

```bash
K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max \
docker run --rm \
  -v "${PWD}:/workspace" \
  -w /workspace \
  -e BASE_URL=http://host.docker.internal:8080 \
  -e RUN_LABEL=mypage-10k-baseline \
  -e STORAGE_LABEL=mysql \
  -e BENCHMARK_USER_COUNT=10 \
  -e K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max \
  grafana/k6 run \
  -o experimental-prometheus-rw=http://host.docker.internal:9090/api/v1/write \
  --summary-export /workspace/docs/performance/mypage-summary-10k-baseline.json \
  /workspace/k6/mypage-summary-profile.js
```

#### 3. current remote write 실행

```bash
K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max \
docker run --rm \
  -v "${PWD}:/workspace" \
  -w /workspace \
  -e BASE_URL=http://host.docker.internal:8080 \
  -e RUN_LABEL=mypage-10k-current \
  -e STORAGE_LABEL=mysql \
  -e BENCHMARK_USER_COUNT=10 \
  -e K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max \
  grafana/k6 run \
  -o experimental-prometheus-rw=http://host.docker.internal:9090/api/v1/write \
  --summary-export /workspace/docs/performance/mypage-summary-10k-current.json \
  /workspace/k6/mypage-summary-profile.js
```

#### 4. Grafana 캡처 보관

권장 캡처 경로:

- `docs/performance/grafana/mypage-summary-10k-baseline.png`
- `docs/performance/grafana/mypage-summary-10k-current.png`

비교표와 시계열 그래프를 함께 보관하면 포트폴리오 설명에 유리하다.
