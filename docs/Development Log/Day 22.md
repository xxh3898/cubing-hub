# Development Log - 2026-04-21

프로젝트: Cubing Hub

---

## 오늘 작업

- `GET /api/rankings`의 기본 조회 경로를 Redis ZSET 기반 랭킹 V2 구조로 전환
- `nickname` 부분 검색 계약은 유지하기 위해 MySQL `user_pbs` 대체 경로를 유지
- `POST`, `PATCH`, `DELETE /api/records`에서 PB 변경 시 Redis 랭킹 읽기 모델을 증분 동기화하도록 보강
- `RankingRedisBackfillService`, `RankingRedisStartupRunner`로 초기 재구축 경로를 추가하고 로컬 프로필 시작 시 재구축을 확인
- `2026-04-20` 기준선과 같은 `300,000` PB seed, 같은 `k6` 시나리오로 V2 재측정을 실행하고 전/후 비교 산출물을 생성
- 프런트 브랜딩 이름과 파비콘도 실제 서비스 표기에 맞게 정리했다
- `2026-04-21` 결과에 맞춰 일정, 설계 문서, 개발 로그 허브를 동기화

---

## 핵심 정리 상세

### Redis 랭킹 V2 구조 적용

#### 문제 상황
- `2026-04-20` 기준선 측정에서 `GET /api/rankings?eventType=WCA_333&page=1&size=25`는 `300,000` PB 후보에서 `p95 13.02s`가 나왔다.
- 기존 V1은 사용자 중복 제거를 위해 `user_pbs`를 사용했지만, 읽기 병목 구간은 여전히 MySQL 정렬/페이징에 남아 있었다.
- 동시에 `nickname` 검색 계약은 `containsIgnoreCase()` 기반 부분 검색이라, 단순 ZSET만으로는 같은 비용 구조로 유지하기 어려웠다.

#### 해결 방법
- `nickname`이 비어 있는 기본 랭킹 조회만 Redis ZSET 읽기 모델로 전환했다.
- `nickname` 검색 요청과 Redis 준비 상태 키가 없는 경우는 기존 MySQL QueryDSL 대체 경로를 사용하도록 유지했다.
- Redis ZSET score는 `bestTimeMs`, member는 `createdAtMillis:recordId:userId` 0-패딩 문자열로 구성해 기존 동점 처리 기준인 `created_at asc -> record.id asc`를 유지했다.
- `nicknames` hash에는 `userId -> nickname`, `members` hash에는 `userId -> member`를 저장해 update/delete 동기화를 단순하게 만들었다.
- `RecordService`에서 PB 재계산 결과가 실제로 바뀐 경우에만 Redis 읽기 모델을 증분 갱신하거나 제거하도록 연결했다.

#### 결과
- `GET /api/rankings`의 응답 형식과 검색/페이지네이션 계약은 유지됐다.
- 기본 조회는 Redis ZSET, `nickname` 검색은 MySQL 대체 경로라는 V2 구조가 정리됐다.
- MySQL `records` / `user_pbs`는 기준 데이터로 유지되고, Redis는 읽기 최적화를 위한 읽기 모델 역할만 맡는다.

### 초기 재구축 경로 추가와 startup 비용 확인

#### 문제 상황
- Redis 읽기 모델을 조회 경로에 추가하면 Redis가 비어 있는 초기 상태를 먼저 해결해야 했다.
- empty Redis 상태에서 바로 조회를 Redis로 넘기면 첫 요청이 빈 랭킹으로 보일 수 있었다.

#### 해결 방법
- `RankingRedisBackfillService`를 추가해 MySQL `user_pbs`에서 Redis 랭킹 키를 전체 재구축하도록 했다.
- `RankingRedisStartupRunner`를 추가하고 `ranking.redis.rebuild-on-startup` property로 시작 시 재구축 여부를 제어하도록 했다.
- `application.yaml` 기본값은 `false`, `application-local.yaml`은 `true`로 두어 로컬 benchmark에서는 자동 재구축이 돌도록 맞췄다.
- Redis 준비 상태 키를 도입해 재구축이 끝나기 전에는 조회가 MySQL 대체 경로를 타도록 했다.

#### 결과
- 로컬 `300,000` PB 기준 `WCA_333` 시작 시 재구축은 약 9분이 걸렸다.
- 재구축 완료 후 `ranking:v2:WCA_333:ready`와 `ZCARD 300000`을 확인했고, 기본 조회는 Redis 경로, `nickname` 검색은 MySQL 대체 경로로 정상 응답했다.
- 시작 시 재구축은 로컬 검증에는 단순하지만, 운영에서 항상 켤지 여부는 별도 배포 세션에서 결정해야 한다.

### `2026-04-21` `k6` 재측정 결과

#### 실행 조건
- API: `GET /api/rankings?eventType=WCA_333&page=1&size=25`
- 데이터셋: `users`, `records`, `user_pbs` 각 `300,000`
- seed: `k6/sql/seed-rankings-v1-baseline.sql`
- 시나리오: `k6/rankings-v1-baseline.js`
- baseline run label: `MySQL-v1`
- current run label: `redis-v2`
- storage label: `mysql`, `redis`

#### 핵심 결과
- `http_req_duration avg`: `21.10 ms`
- `http_req_duration p95`: `36.94 ms`
- `http_req_duration max`: `94.53 ms`
- `http_reqs count`: `202,875`
- `http_reqs rate`: `1,502.77/s`
- `http_req_failed`: `0.00%`
- `checks`: `100.00%`

#### V1 대비 비교
- avg: `7,245.23 ms -> 21.10 ms` (`-99.71%`)
- p95: `12,429.58 ms -> 36.94 ms` (`-99.70%`)
- max: `13,288.98 ms -> 94.53 ms` (`-99.29%`)
- request rate: `4.21/s -> 1,502.77/s` (`+35,610.49%`)
- 산출물:
  - `docs/performance/rankings-v2-summary.json`
  - `docs/performance/rankings-v2-report.md`
  - `docs/performance/rankings-v2-report.html`
  - `docs/performance/rankings-v1-v2-comparison.md`
  - `docs/performance/rankings-v1-v2-comparison.html`

#### 해석
- Prometheus 초기화 후 `MySQL-v1`, `redis-v2` 두 라벨로 다시 측정했고, 같은 seed와 같은 endpoint 기준으로 읽기 성능 개선 폭이 충분히 분명하게 드러났다.
- 이번 측정은 `nickname` 없는 기본 랭킹 조회를 Redis로 전환한 결과다.
- `nickname` 검색은 계속 MySQL 대체 경로이므로, 검색 부하 최적화는 후속 범위로 남는다.

### 프런트 브랜딩 이름과 파비콘 정리

#### 작업 내용
- 브라우저 탭과 정적 자산에서 보이는 서비스 이름과 아이콘을 현재 `Cubing Hub` 표기에 맞게 정리했다.
- 파비콘 자산을 실제 브랜드 기준 이미지로 교체해 배포 후 브라우저 탭에서도 서비스 정체성이 바로 드러나게 맞췄다.

#### 결과
- Redis V2 성능 개선과 직접 관련은 없지만, 같은 날 배포 전 기준선 정리 과정에서 사용자-facing 브랜딩도 현재 서비스 이름과 맞춰졌다.

### 배포 범위 분리

#### 문제 상황
- `2026-04-21` 원래 계획에는 최종 배포가 포함돼 있었지만, 저장소 안에는 프로덕션 env 값, 실제 도메인, AWS 자원, 배포 스크립트가 충분히 정리돼 있지 않았다.

#### 결정
- 이번 세션은 `리팩토링 + 재측정 + 문서 마감`까지만 완료했다.
- 실제 배포와 대상 환경 스모크 테스트는 별도 세션으로 분리했다.

#### 영향
- 설계 문서와 일정 문서는 배포가 아직 남아 있음을 명시한다.
- 성능 개선과 코드/문서 정합성은 이번 세션에서 확보했고, 운영 반영 절차는 다음 세션에서 이어서 다룬다.

---

## 사용 기술

- Spring Boot
- MySQL
- Redis
- QueryDSL
- JUnit 5
- Testcontainers
- k6
- Prometheus
- Grafana

---

## 검증

- `cd backend && ./gradlew test`
- `cd backend && ./gradlew build`
- `curl 'http://127.0.0.1:8080/api/rankings?eventType=WCA_333&page=1&size=3'`
- `curl 'http://127.0.0.1:8080/api/rankings?eventType=WCA_333&nickname=User24&page=1&size=3'`
- `docker exec cubing_hub_redis redis-cli EXISTS ranking:v2:WCA_333:ready`
- `docker exec cubing_hub_redis redis-cli ZCARD ranking:v2:WCA_333:zset`
- `K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max k6 run -o experimental-prometheus-rw=http://127.0.0.1:9090/api/v1/write --summary-export ... -e RUN_LABEL=MySQL-v1 ...`
- `K6_PROMETHEUS_RW_TREND_STATS=avg,p(95),max k6 run -o experimental-prometheus-rw=http://127.0.0.1:9090/api/v1/write --summary-export ... -e RUN_LABEL=redis-v2 ...`
- `node k6/generate-performance-report.mjs --previous docs/performance/rankings-v1-summary.json --current docs/performance/rankings-v2-summary.json ...`
- `curl 'http://127.0.0.1:9090/api/v1/label/run/values'`
- `curl -u admin:*** 'http://127.0.0.1:3000/api/search?query=Rankings%20Baseline'`

## 남은 리스크

- `300,000` PB 기준 로컬 시작 시 재구축이 약 9분이 걸려 운영에서 같은 방식을 그대로 켜기 어렵다.
- `nickname` 검색은 여전히 MySQL 대체 경로라 검색 부하까지 Redis로 옮긴 상태는 아니다.
