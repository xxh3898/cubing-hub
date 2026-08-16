---
doc_type: architecture
status: draft
created: 2026-08-11
updated: 2026-08-16
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/growth-metrics.md
  - docs/02-requirements/features/growth.md
  - docs/02-requirements/features/profile.md
  - docs/03-architecture/backend-architecture.md
  - docs/03-architecture/frontend-architecture.md
  - docs/04-data/data-dictionary.md
  - docs/04-data/erd.md
  - docs/04-data/migration-policy.md
  - docs/05-api/conventions.md
  - docs/08-decisions/adr-0010-current-record-growth-read-contract.md
---
# Growth Architecture

## 문서 상태와 경계

V2.2 Growth & Profile architecture는 `draft`다. pure metric calculator, private Growth read API, repository projection, MySQL query, My Growth UI consumer와 legacy MyPage/Home consumer transition은 dev에서 구현했다. Automated CI, isolated runtime과 manual browser/mobile evidence는 [release evidence](../06-quality/v2-2-growth-release-evidence.md)에 기록한다. 이 근거는 `main` merge나 production release를 뜻하지 않는다. Exact request·response는 Spring REST Docs test가 Source of Truth다.

```text
Current
- private profile summary와 paginated Record history
- MySQL records·user_pbs Source of Truth
- WCA_333 event-filtered history와 stable ordering
- Timer client의 recent Ao5/Ao12
- current Record projection을 받는 pure Growth metric calculator
- private Growth summary, 30-day trend, paginated PB progression API
- lightweight Record projection, MySQL daily median and PB progression query
- Redis ranking read model

Next implementation
- release approval

Future candidate
- observed cost에 근거한 PB progression cache/projection
- additional supported event와 user timezone
- opt-in public Profile read contract

Out of scope
- Flyway, Redis key, analytics platform
- Challenge, Verification, Competition lifecycle 통합
```

## Current implementation

### Record와 PB

현재 `records`는 completed Practice solve를 저장한다.

| 값 | Current source | Growth 의미 |
| --- | --- | --- |
| id | `records.id` | 같은 timestamp의 stable tie-break와 progression point identity |
| user | `records.user_id` | authenticated owner scope |
| event | `records.event_type` | 모든 metric의 dimension. public capability는 WCA_333만 지원 |
| raw time | `records.time_ms` | penalty 전 canonical integer millisecond |
| penalty | `NONE`, `PLUS_TWO`, `DNF` | current effective result 계산 |
| scramble | `records.scramble` | history detail에는 필요하지만 Growth aggregate에는 불필요 |
| input method | `records.input_method` | provenance이며 Growth performance dimension이 아님 |
| recorded time | `records.created_at` | UTC instant 의미의 server persistence timestamp |

Effective result는 persistent column이 아니다.

```text
NONE     -> time_ms
PLUS_TWO -> time_ms + 2000
DNF      -> numeric result 없음
```

`user_pbs`는 사용자·event별 current PB와 source Record를 보유하는 MySQL projection이다. Record create, penalty PATCH와 delete 뒤 재계산된다. Redis `ranking:v2:*`는 전체 Ranking 조회를 위한 rebuild 가능한 Read Model이며 Growth 통계의 Source of Truth가 아니다.

### Current read API와 client calculation

- `GET /api/users/me/records`는 optional `eventType`, 1-based page, `created_at DESC, id DESC` ordering을 제공한다.
- page size 상한은 100이다.
- `GET /api/users/me/profile`의 `totalRecords`와 `averageTimeMs`는 모든 event를 섞는다. average는 DNF를 제외한 all-time arithmetic mean이며 population이 UI label에 드러나지 않는다.
- `GET /api/home`의 additive `summary.averageTimeMs`도 Profile summary를 그대로 전달하는 같은 all-event, all-time arithmetic mean이다. MyPage와 Home은 이 값을 canonical Growth metric으로 렌더링하지 않는다.
- Timer는 WCA_333 recent 12 Record를 받아 Ao5/Ao12를 frontend에서 계산한다.
- MyPage는 Record History만 `GET /api/users/me/records?page={page}&size=10`으로 읽는다. Growth metric이나 chart를 위해 Record page를 bulk fetch하거나 client에서 raw trend를 계산하지 않는다.
- public user Profile route/API는 없다. Ranking은 nickname, event와 PB를 보여 주지만 stable public user profile contract를 제공하지 않는다.

따라서 current history API를 canonical Growth 계산에 그대로 사용하는 것은 client별 metric drift와 불필요한 Record payload를 만든다. 기존 endpoint는 Record 관리와 detail pagination에 유지하고 Growth는 별도 read contract로 둔다.

## Current data 계산 가능성

| 질문 | 현재 data로 가능한가 | 조건과 한계 |
| --- | --- | --- |
| PB progression 재구성 | 가능 | current penalty와 retained Record 기준이다. 삭제·수정 전 immutable 과거는 복원할 수 없음 |
| 최근 7/30/90일 Practice trend | 가능 | `created_at` UTC range를 사용할 수 있음. V2.2 UI/API는 7-day comparison과 30-day series만 채택하고 90일은 future 후보 |
| `created_at`을 activity timestamp로 사용 | 조건부 가능 | actual solve occurrence가 아니라 Cubing Hub에 기록된 Practice activity라고 명시. `occurred_at`은 prerequisite가 아님 |
| historical Ao5/Ao12 progression | 계산 가능 | 모든 chronological contiguous window가 필요해 O(N). Recent Ao만 MVP, best/Ao progression은 SHOULD |
| solve count·daily count·mean/median·trend | 가능 | entity 전체 load 대신 indexed range와 SQL aggregate/projection 사용. Generic mean은 제품 이유로 채택하지 않음 |
| best Ao5/Ao12 | 계산 가능 | ordered history O(N) 또는 future projection 필요. Current data 부족 문제가 아니라 MVP 가치·비용 우선순위 문제 |
| recent Ao5/Ao12·IQR | 가능 | latest 24 lightweight row면 충분 |
| current PB | 가능 | `user_pbs` unique projection 재사용 |

`scramble`, `input_method`와 submission identity는 Growth aggregate 계산에 필요하지 않다. Detail history가 이미 제공하므로 summary payload에 복제하지 않는다.

## API 접근 대안

| 안 | 장점 | 비용·위험 | 판단 |
| --- | --- | --- | --- |
| A. history API에서 frontend 계산 | backend endpoint 추가가 적음 | 최대 100 page 제한, O(N) transfer, client별 DNF/timezone drift, scramble 등 불필요 payload | 채택하지 않음 |
| B. 하나의 Growth aggregate endpoint | client 단순, 한 번의 request | 30-day series와 full PB history가 initial payload/query lifecycle을 결합 | 채택하지 않음 |
| C. summary + trend + PB progression 분리 | initial payload bounded, query 성격·refresh·evolution 분리 | endpoint 3개와 server calculator 필요 | **V2.2 proposal** |

## Current API

모든 endpoint는 authenticated owner 전용이다. query의 `eventType`은 required이며 현재 `WCA_333`만 허용한다. known but unsupported EventType은 current Practice capability 정책과 같은 400 error를 반환한다. exact request·response field는 [Spring REST Docs](../../backend/src/docs/asciidoc/index.adoc)가 기준이다.

| Endpoint | 역할 | Payload boundary | Refresh trigger |
| --- | --- | --- | --- |
| `GET /api/users/me/growth?eventType=WCA_333` | current performance, comparison, consistency, activity summary | fixed-size object | Record create/PATCH/delete 후 |
| `GET /api/users/me/growth/trend?eventType=WCA_333&period=30D` | daily performance와 activity series | 항상 30 date point | Record create/PATCH/delete 후 |
| `GET /api/users/me/growth/pb-progression?eventType=WCA_333&page=1&size=50` | PB milestone list | page size 기본 50, 최대 100 | Record create/PATCH/delete 후 |

V2.2에서 `period`는 `30D`만 지원한다. future 90-day 조회 가능성을 위해 dimension을 유지하되, 지원하지 않는 값에 빈 배열을 반환하지 않고 400으로 거절한다.

### Summary

Summary는 `user_pbs` current PB와 latest 24, completed 14-day, activity aggregate projection을 조합한다. `AVAILABLE`, `DNF`, `NO_DATA`, `INSUFFICIENT_DATA`, `INSUFFICIENT_SAMPLE`을 명시적으로 구분한다. 적용되지 않는 numeric field는 `null`일 수 있지만 status 없이 해석하지 않는다.

`currentPb.timeMs`는 raw value, `effectiveTimeMs`는 penalty 반영 value다. PB가 없으면 `status=NO_DATA`이고 Record 관련 field는 null이다.

### Trend

Trend는 `asOfDate` 기준 30개의 Asia/Seoul date point를 반환한다. DB query가 반환하지 않은 date는 application이 채운다. missing day는 `recordCount=0`, `medianTimeMs=null`이고 DNF-only day는 `recordCount>0`, `rankableCount=0`, `medianTimeMs=null`이다. 오늘 point는 `todayPartial=true`로 표시한다.

### PB progression

Progression content는 current PB부터 과거로 가는 `created_at DESC, id DESC` milestone order다. `basis=CURRENT_RECORD_STATE`는 penalty PATCH와 Record delete 뒤 current canonical state에서 다시 계산된 결과임을 뜻한다. page boundary는 모든 solve가 PB인 경우에도 client transfer를 제한한다. DB는 current progression을 판별하기 위해 user/event history를 모두 읽을 수 있으므로 100,000-record stress는 별도 gate로 둔다.

### Error와 cache boundary

- unauthenticated request: current auth contract의 401
- invalid enum/query format: 400 generic validation error
- known unsupported Practice event: 400 `지원하지 않는 Practice 종목입니다.`
- empty WCA_333 history: 200과 explicit empty/status response
- 다른 사용자의 identifier를 받는 parameter나 public variant는 V2.2에 추가하지 않음
- browser/shared cache를 canonical store로 사용하지 않음
- shared Redis cache를 추가하지 않음
- private response의 HTTP caching/ETag는 observed traffic과 mutation invalidation 필요가 확인된 뒤 검토

## Server component 책임

```text
GrowthController
  -> authentication + query validation + response envelope

GrowthReadService (@Transactional(readOnly = true))
  -> one asOf clock/date 결정
  -> capability 검증
  -> repository projection 조합
  -> pure metric calculator 호출

GrowthMetricCalculator
  -> effective result, Ao5/Ao12, median, percentile, improvement status

GrowthReadRepository
  -> bounded Record projection, current PB projection, activity aggregate,
     daily aggregate, progression projection
```

- 기존 Timer frontend utility의 Ao fixture를 backend calculator test로 이식해 두 계산이 같은 규칙을 사용하게 한다.
- Response DTO는 persistence entity를 노출하지 않는다.
- Summary는 MySQL `records`와 `user_pbs`만 읽는다. Redis fallback/ready 상태를 Growth에 전파하지 않는다.
- 같은 summary request의 시간 경계는 한 번 정한 `generatedAt`과 `asOfDate`를 모든 query에 사용한다.
- 여러 query를 하나의 read-only transaction에 두어 Record와 current PB가 서로 다른 mutation 시점을 보지 않게 한다.

## Query 설계

### Current index

V3의 핵심 index는 다음 순서다.

```text
(user_id, event_type, created_at, id)
```

이 index는 leftmost equality인 `user_id`, `event_type` 뒤에서 `created_at` range와 chronological/recent ordering을 지원한다. 따라서 다음 query의 candidate row scope를 user/event로 좁힌다.

- latest 5/12/24 Record
- 7/14/30-day date range
- total count와 first/latest created_at
- full chronological PB progression scan

한계도 명확하다.

- `penalty`, `time_ms`가 index에 없어 effective metric은 table row를 읽는다.
- `DATE(created_at + 9 hours)` group과 median은 index만으로 끝나지 않는다.
- effective result는 persistent/indexed column이 아니므로 DB가 계산한다.
- all-time progression은 해당 user/event의 전체 index range를 순회한다.

WHERE 절에는 `created_at` function을 두지 않는다. Application이 KST calendar boundary를 UTC instant로 변환해 raw `created_at >= :fromUtc AND created_at < :toUtc`로 전달한다. 선택된 30-day row를 group할 때만 UTC semantics의 DATETIME에 명시적으로 9시간을 더해 KST date를 만든다.

### Query별 전략

| Result | Query | 계산 위치 | 이유 |
| --- | --- | --- | --- |
| Current PB | `user_pbs` unique lookup + source Record join | DB projection | current ranking/PB contract 재사용 |
| Recent Ao/IQR | user/event recent order `LIMIT 24` | application pure calculator | DNF trim·percentile status를 test하기 쉽고 bounded |
| total/first/latest | user/event count, min, max | SQL aggregate 또는 index endpoint query | entity 전체 load 불필요 |
| 7/14/30-day counts | raw UTC range conditional aggregate | SQL | bounded range, payload 없음 |
| period median | 두 7-day range의 lightweight Record projection | application pure calculator | PR A period status와 median contract를 그대로 사용 |
| daily median/count | 30-day range daily aggregate + rankable median | MySQL 8 native projection | 최대 30 row response |
| PB progression | running previous minimum window query | MySQL 8 native projection | 전체 Record를 application/client로 전달하지 않고 point만 반환 |

### Effective result expression

Native aggregate에서 canonical expression은 다음과 같다.

```sql
CASE penalty
  WHEN 'NONE' THEN time_ms
  WHEN 'PLUS_TWO' THEN time_ms + 2000
  WHEN 'DNF' THEN NULL
END
```

이 expression은 schema column을 새로 만들지 않는다. Java calculator도 같은 enum mapping을 가져야 하며 fixture parity test로 drift를 막는다.

### Daily aggregate outline

다음은 query shape 설명용 outline이다. 실제 repository query와 REST Docs 구현이 아니다.

```sql
WITH ranged AS (
  SELECT
    DATE(DATE_ADD(created_at, INTERVAL 9 HOUR)) AS practice_date,
    penalty,
    CASE penalty
      WHEN 'NONE' THEN time_ms
      WHEN 'PLUS_TWO' THEN time_ms + 2000
      WHEN 'DNF' THEN NULL
    END AS effective_time_ms
  FROM records FORCE INDEX (idx_record_user_event_created_at_id)
  WHERE user_id = :userId
    AND event_type = :eventType
    AND created_at >= :fromUtc
    AND created_at < :toUtc
),
rankable AS (
  SELECT
    practice_date,
    effective_time_ms,
    ROW_NUMBER() OVER (
      PARTITION BY practice_date
      ORDER BY effective_time_ms
    ) AS position_in_day,
    COUNT(*) OVER (PARTITION BY practice_date) AS rankable_count
  FROM ranged
  WHERE effective_time_ms IS NOT NULL
)
SELECT
  practice_date,
  ROUND(AVG(effective_time_ms)) AS median_time_ms
FROM rankable
WHERE position_in_day IN (
  FLOOR((rankable_count + 1) / 2),
  FLOOR((rankable_count + 2) / 2)
)
GROUP BY practice_date;
```

Record/DNF/+2 count는 같은 `ranged` population의 daily conditional aggregate로 구한다. 두 result를 date로 조합하고 30-date skeleton의 missing day를 application에서 채운다. SQL session timezone에 암묵적으로 의존하지 않는다.

### PB progression outline

```sql
WITH canonical AS (
  SELECT
    id,
    time_ms,
    penalty,
    created_at,
    CASE penalty
      WHEN 'NONE' THEN time_ms
      WHEN 'PLUS_TWO' THEN time_ms + 2000
    END AS effective_time_ms
  FROM records FORCE INDEX (idx_record_user_event_created_at_id)
  WHERE user_id = :userId
    AND event_type = :eventType
    AND penalty <> 'DNF'
),
running AS (
  SELECT
    canonical.*,
    MIN(effective_time_ms) OVER (
      ORDER BY created_at, id
      ROWS UNBOUNDED PRECEDING
    ) AS running_best_time_ms
  FROM canonical
),
scanned AS (
  SELECT
    running.*,
    LAG(running_best_time_ms) OVER (
      ORDER BY created_at, id
    ) AS previous_best_time_ms
  FROM running
)
SELECT id, time_ms, penalty, effective_time_ms, created_at
FROM scanned
WHERE previous_best_time_ms IS NULL
   OR effective_time_ms < previous_best_time_ms
ORDER BY created_at DESC, id DESC;
```

Penalty PATCH 또는 delete 뒤 이 query를 다시 실행하면 current canonical state 기준으로 progression이 바뀐다. 마지막 progression point의 effective time과 `user_pbs.best_time_ms`가 일치해야 한다.

### Repository 기술 선택

현재 repository의 단순 동적 조건은 Querydsl custom repository가 담당하고, Ranking의 `ROW_NUMBER()`처럼 DB window 기능이 필요한 부분은 native query를 사용한다. V2.2는 query-specific `GrowthReadRepository`에서 MySQL native lightweight projection을 사용한다. Growth Record query는 event-filtered history index `idx_record_user_event_created_at_id`를 `FORCE INDEX`로 지정한다. 같은 user의 legacy 또는 future event row가 섞여도 user/event range와 ordering을 같은 index에서 처리한다.

- recent 24와 completed comparison range: native lightweight Record projection
- current PB와 count/min/max activity: native projection/aggregate
- daily median과 PB progression: MySQL 8 native window query
- metric policy: repository SQL에 흩뿌리지 않고 pure Java calculator와 domain fixture로 검증
- entity list 전체 반환 또는 frontend raw history aggregate: 사용하지 않음

## Migration과 index 결정

**V2.2에서는 Flyway migration과 새 index를 추가하지 않는다.**

| 후보 | 필요한 query | 기존 index가 부족한 이유 | write/storage cost | 판단 |
| --- | --- | --- | --- | --- |
| `(user_id,event_type,created_at,id,penalty,time_ms)` covering index | recent/range metric을 table lookup 없이 처리 | current index에 value column이 없음 | 모든 Record mutation의 더 큰 index write, raw time·penalty 중복 storage | 실제 latency evidence 전에는 과도 |
| effective generated column + index | effective min/median | current effective result가 계산값 | schema 의미와 penalty mutation write 확대, V2.1 non-persistent 결정 변경 | 채택하지 않음 |
| PB event/snapshot table | progression read | current history scan은 O(N) | create/PATCH/delete correction과 audit 의미, migration·backfill·정합성 비용 | V2.2 불필요 |
| Growth Redis keys | repeated summary | 현재 Redis는 Ranking read model | invalidation·rebuild·운영 책임 추가 | 책임 경계와 맞지 않음 |

Current composite index가 필요한 최소 row scope와 ordering을 제공한다. MySQL의 composite index는 leftmost prefix를 이용하며, index가 많거나 넓어지면 write와 storage 비용이 증가한다. 구현 PR에서는 10,000-record fixture의 `EXPLAIN ANALYZE`를 보존하고 관찰 결과가 기준을 넘을 때만 별도 index proposal을 연다.

## 규모별 비용과 최소 gate

| user/event Record 수 | Summary/recent | 30-day trend | PB progression | V2.2 판단 |
| ---: | --- | --- | --- | --- |
| 100 | constant recent + 작은 aggregate | 작은 range | 작은 full scan | request-time 계산 |
| 1,000 | bounded/reasonable | 최근 row만 | user/event 1K scan | request-time 계산 |
| 10,000 | entity load 없이 projection이면 적정 | activity density에 따라 range | 10K window scan | query plan·latency evidence를 release gate로 기록 |
| 100,000 | current PB/recent는 index로 제한 | 30-day density에 좌우 | 매 view 100K scan 가능 | stress 측정, 문제가 확인되면 progression cache/projection 후보 |

Production row count와 request frequency는 V2.2 architecture의 전제가 아니다. 100,000-record case는 current 요구사항이 아니라 future stress evidence로 다룬다.

Pre-aggregation이 필요해지는 신호는 다음과 같다.

- PB progression query가 실제 p95 budget을 반복적으로 초과
- 한 user/event의 progression view가 자주 반복되고 Record mutation은 상대적으로 적음
- 30-day density가 커져 range aggregate가 measured bottleneck이 됨

그때에도 local request cache, progression projection과 invalidation-on-mutation을 비교한 뒤 선택한다. Ranking Redis namespace에 통계를 넣는 것을 기본값으로 하지 않는다.

## Time과 timezone

- JPA persistence와 API `createdAt`/`generatedAt`은 UTC instant 의미를 유지한다.
- current frontend formatter와 Home daily boundary가 사용하는 `Asia/Seoul`을 V2.2 service day로 사용한다.
- Application Clock으로 한 request의 KST `asOfDate`와 UTC bounds를 만든다.
- `created_at`은 recorded time이며 delayed retry가 실제 solve보다 늦게 저장될 수 있다.
- 30-day activity는 오늘 포함, performance comparison은 partial today 제외다.
- user timezone preference와 V2.3 Daily Challenge day identity를 V2.2 schema/API prerequisite로 만들지 않는다.

User timezone이 도입되면 historical day regrouping, profile setting, cache key와 comparison consistency를 새 계약으로 검토해야 한다. `timeZone` response field를 유지하므로 API 전체 rewrite 없이 진화할 수 있다.

## Event evolution

- 모든 endpoint와 query는 `eventType` predicate를 유지한다.
- current public Growth capability는 WCA_333만 제공한다.
- frontend는 supported Practice event만 선택지로 보여 준다.
- enum에 존재하지만 capability가 없는 event에 empty metric을 만들지 않는다.
- future event는 Result Kind, Timer, Record와 Growth capability를 함께 승인한다.
- WCA_333FM, WCA_333MBF 같은 non-time result를 millisecond metric에 자동 편입하지 않는다.

## Frontend integration

- `/mypage`를 유지하고 current summary/raw chart 영역을 My Growth section으로 대체한다.
- Record history와 account modal은 유지한다.
- Timer는 current recent Ao5/Ao12를 계속 즉시 보여 주되 `내 성장 보기` link만 추가한다.
- Recharts 3.8.1의 existing components를 사용한다. dependency 추가는 필요하지 않다.
- Summary와 trend는 parallel fetch가 가능하지만 independent loading/error state를 둔다.
- progression은 summary 뒤 lazy load한다. page 1을 먼저 표시하고 사용자가 전체 이력을 열 때 다음 page를 읽는다.
- chart에는 text summary/timeline을 함께 제공하고 mobile tick 수를 줄인다.
- Record create/PATCH/delete 성공 후 관련 Growth query를 invalidate/refetch한다.
- Record penalty PATCH/delete 성공 후 current Record History page도 refetch한다. Profile/account request는 다시 시작하지 않는다.
- Profile PATCH 성공 후 Profile read와 AuthContext nickname만 동기화한다. Record History와 Growth query를 다시 시작하지 않는다.

## Test 전략

### Domain unit

- NONE, PLUS_TWO, DNF effective result
- Ao5/Ao12 부족, numeric, 1 DNF trim, 2 DNF result
- median odd/even과 integer rounding
- period sample status와 improvement direction/rounding
- type-7 Q1/Q3 interpolation, rankable 8 gate, IQR direction
- next Practice CTA fallback

### Repository integration on MySQL 8.4

- same `created_at` + id ordering
- KST 전후 UTC instant와 half-open range
- missing day, DNF-only day, PLUS_TWO median
- PB tie, mutable penalty, delete 후 progression
- final progression point와 `user_pbs` parity
- unsupported event는 repository call 전 차단
- 10,000-record fixture `EXPLAIN ANALYZE`와 returned row/payload count

H2로 MySQL window/date behavior를 대신 증명하지 않는다. Current MySQL 8.4.11 runtime과 같은 engine patch의 integration evidence를 사용한다.

### REST Docs / API

- authenticated success, unauthenticated, invalid/unsupported event
- empty, insufficient, DNF와 available response field
- fixed 30 point와 progression pagination metadata
- UTC instant, KST date와 enum documentation
- owner scope 외 identifier가 contract에 없는지 확인

### Frontend

- loading/error/empty/partial/available/DNF state
- mobile chart tick, tooltip, text alternative
- 30-day missing line point와 zero activity bar 구분
- progression page merge/order와 current-state notice
- Timer CTA와 Record create/PATCH/delete refresh
- current ambiguous all-time average를 Growth label로 재사용하지 않음

### Manual release smoke

1. keyboard와 touch에서 WCA_333 save
2. Timer recent Ao와 Growth recent Ao parity 확인
3. penalty NONE → PLUS_TWO → DNF 변경과 PB/progression/trend refresh
4. Record delete 후 current PB와 progression final point parity
5. empty/insufficient user와 30-day gap 표시
6. iPhone-width My Growth → Timer → My Growth flow

Build와 CI success는 production request 성공을 뜻하지 않는다. main merge, deploy와 public URL smoke는 별도 release 승인과 운영 gate를 따른다.

## 구현 PR 순서

### PR A — Growth contract와 calculator

- status: implemented
- scope: accepted metric/ADR 반영, backend pure calculator와 fixture, no endpoint
- dependency: ADR-0010과 MUST metric contract acceptance
- acceptance: DNF/+2/Ao/median/IQR/time-window contract가 executable test와 일치
- tests: focused domain unit tests
- rollback risk: production behavior 없음, 새 internal code 제거 가능

### PR B — Growth read API와 query

- status: implemented
- scope: summary/trend/progression controller, service, projection, native query, REST Docs
- dependency: PR A
- acceptance: private WCA_333 contract, bounded payload, progression parity, no migration/Redis
- tests: service/repository MySQL integration, REST Docs, [10,000-record query-plan evidence](../06-quality/performance/growth-read-api-10k.md)
- rollback risk: additive GET endpoint 제거. DB rollback 없음

### PR C — My Growth dashboard

- status: implemented on dev
- scope: `/mypage` information architecture, summary/trend/activity/progression, Timer CTA
- dependency: PR B
- acceptance: state matrix, mobile/accessibility, existing history/account 유지
- tests: utility/component test, focused frontend build, manual responsive flow
- rollback risk: prior MyPage presentation으로 되돌릴 수 있고 API/data 영향 없음

### PR D — Legacy Profile consumer 전환

- status: implemented on dev
- scope: MyPage의 legacy 100-record source와 raw Record trend 제거, Profile/Record/Growth refresh ownership 분리
- dependency: PR C가 Growth replacement 제공
- acceptance: existing account/history/PB consumer 회귀 없음, Record History server pagination 유지, breaking API removal 없음
- tests: frontend route와 pagination·mutation refresh regression
- rollback risk: MyPage consumer transition만 되돌릴 수 있다. API field 제거는 별도 compatibility 결정 전 금지

### PR E — Release evidence

- status: automated, isolated runtime and manual browser/mobile evidence recorded on dev candidate
- scope: acceptance/quality 문서, targeted smoke checklist와 query evidence 갱신
- dependency: PR A~D integrated on dev
- acceptance: required Validate, no blocker, metric parity와 mobile smoke evidence
- tests: docs link/diff validation, integrated CI 결과 기록
- rollback risk: documentation-only. merge/deploy 권한을 포함하지 않음

각 PR은 commit, push, PR, merge와 deploy 승인을 별도로 받는다. V2.2 implementation이 끝나도 Daily Challenge 구현으로 자동 진행하지 않는다.

## Release gate와 rollback

V2.2 release candidate는 다음을 모두 만족해야 한다.

- canonical metric fixture와 API/generated docs 일치
- authenticated owner/event boundary와 secret/scramble 비노출
- full Record entity/history가 Growth payload로 전송되지 않음
- 10,000-record query plan과 observed latency 기록
- frontend empty/insufficient/DNF/mobile/accessibility state 확인
- Record mutation 뒤 PB, progression, summary가 일치
- required CI 성공과 unresolved blocker 0건
- main merge와 release/deploy 승인 경계를 다시 확인

Rollback은 additive endpoint와 frontend consumer를 이전 revision으로 되돌리는 application rollback이다. V2.2가 migration을 만들지 않으므로 DB reverse migration은 없다. 다만 release 뒤 생성·수정된 Record는 기존 V2.1 schema와 호환돼야 하며 삭제하지 않는다.

## 근거와 검증할 항목

- MySQL 8은 window function을 지원하므로 running minimum과 median rank query가 가능하다.
- Composite index의 leftmost prefix가 현재 user/event/date query shape에 맞는다.
- Index 추가는 read speed뿐 아니라 write와 storage cost를 함께 검토해야 한다.
- 정확한 execution plan과 latency는 구현 branch의 MySQL 8 fixture에서 검증한다. 설계 문서의 query outline만으로 성능을 완료 판정하지 않는다.

참고:

- [MySQL 8.4 Window Function Descriptions](https://dev.mysql.com/doc/refman/8.4/en/window-functions.html)
- [MySQL Multiple-Column Indexes](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)
- [How MySQL Uses Indexes](https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html)
