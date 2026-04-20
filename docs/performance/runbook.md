# 랭킹 benchmark 실행 문서

## 범위

- 대상 API: `GET /api/rankings?eventType=WCA_333&page=1&size=25`
- 데이터셋: `users = 300,000`, `records = 300,000`, `user_pbs = 300,000`
- 사용자 계정: `userN@test.com` / `pass1234!`

## Day 19 로컬 기준선

### 1. schema 초기화

`ddl-auto=create`로 Spring Boot를 한 번 실행한 뒤 schema가 다시 만들어지면 종료한다.

```bash
cd backend
SPRING_PROFILES_ACTIVE=local \
SPRING_DOCKER_COMPOSE_ENABLED=false \
SPRING_JPA_HIBERNATE_DDL_AUTO=create \
./gradlew bootRun
```

### 2. 기준선 데이터 적재

```bash
mysql -h 127.0.0.1 -uroot -p"${LOCAL_DB_PASSWORD}" cubing_hub < k6/sql/seed-rankings-v1-baseline.sql
```

### 3. 기준선용 애플리케이션 실행

```bash
cd backend
SPRING_PROFILES_ACTIVE=local \
SPRING_DOCKER_COMPOSE_ENABLED=false \
SPRING_JPA_HIBERNATE_DDL_AUTO=update \
./gradlew bootRun
```

### 4. `k6` 실행과 Prometheus/Grafana 메트릭 전송

```bash
K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max \
k6 run \
  -o experimental-prometheus-rw=http://localhost:9090/api/v1/write \
  --summary-export docs/performance/rankings-v1-summary.json \
  -e BASE_URL=http://localhost:8080 \
  -e RUN_LABEL=v1 \
  -e STORAGE_LABEL=mysql \
  k6/rankings-v1-baseline.js
```

### 5. 로컬 Markdown/HTML 요약 리포트 생성

```bash
node k6/generate-performance-report.mjs \
  --current docs/performance/rankings-v1-summary.json \
  --current-label "V1 MySQL" \
  --output-md docs/performance/rankings-v1-report.md \
  --output-html docs/performance/rankings-v1-report.html \
  --title "Rankings V1 Baseline"
```

- `report.md`, `report.html`은 `summary.json` 기반 요약 리포트다.
- 시간축 그래프와 포트폴리오용 전/후 시각화는 Grafana 대시보드 캡처를 기준으로 둔다.

## Day 20 비교

### 1. schema 재초기화

Day 19와 같은 초기화 절차를 다시 사용한다.

### 2. 동일한 seed 재적재

Day 19와 같은 seed SQL을 다시 사용한다.

### 3. Redis 기반 구현 실행

Day 20 구현을 같은 실행 조건으로 기동한다.

### 4. `k6` 재실행

```bash
K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max \
k6 run \
  -o experimental-prometheus-rw=http://localhost:9090/api/v1/write \
  --summary-export docs/performance/rankings-v2-summary.json \
  -e BASE_URL=http://localhost:8080 \
  -e RUN_LABEL=v2 \
  -e STORAGE_LABEL=redis \
  k6/rankings-v1-baseline.js
```

### 5. 비교 요약 리포트 생성

```bash
node k6/generate-performance-report.mjs \
  --previous docs/performance/rankings-v1-summary.json \
  --previous-label "V1 MySQL" \
  --current docs/performance/rankings-v2-summary.json \
  --current-label "V2 Redis" \
  --output-md docs/performance/rankings-v1-v2-comparison.md \
  --output-html docs/performance/rankings-v1-v2-comparison.html \
  --title "Rankings V1 vs V2 Comparison"
```

- 비교 `md`, `html`도 요약표 중심 산출물이다.
- V1, V2 전/후 그래프는 Grafana 동일 대시보드 캡처로 보관한다.

## Grafana 대시보드

- 폴더: `Cubing Hub Performance`
- 대시보드 제목: `Rankings Baseline`
- 변수:
  - `run`
  - `storage`

V1, V2 결과는 같은 대시보드, 같은 시간 범위, 같은 패널 레이아웃으로 캡처한다.

권장 로컬 캡처 파일:

- `docs/performance/grafana/rankings-v1.png`
- `docs/performance/grafana/rankings-v2.png`
- `docs/performance/grafana/rankings-v1-v2-comparison.png`
