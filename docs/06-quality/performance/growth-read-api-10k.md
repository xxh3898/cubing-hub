---
doc_type: quality
status: active
created: 2026-08-12
updated: 2026-08-12
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/growth-architecture.md
  - docs/06-quality/performance/README.md
  - backend/src/main/java/com/cubinghub/domain/growth/repository/GrowthReadRepository.java
  - backend/src/test/java/com/cubinghub/domain/growth/repository/GrowthQueryPlanIntegrationTest.java
---
# Growth Read API Query Plan Evidence (10k)

## Fixture

격리된 MySQL 8.0.46 container에서 WCA_333 한 user/event의 `records` 10,000건을 만들고 `ANALYZE TABLE records`를 실행했다. Growth query는 V3 `idx_record_user_event_created_at_id (user_id, event_type, created_at, id)`를 `FORCE INDEX`로 사용했다. production data, schema, index는 사용하지 않았다.

`GrowthQueryPlanIntegrationTest`는 같은 MySQL 8 query를 CI에서 다시 실행한다. 아래 숫자는 local snapshot이며 production latency나 capacity를 뜻하지 않는다.

## EXPLAIN ANALYZE

| Query | Chosen access | Rows examined | Returned rows | Execution time |
| --- | --- | ---: | ---: | ---: |
| latest 24 Record | `idx_record_user_event_created_at_id` reverse index lookup | 24 | 24 | 0.701–0.706ms |
| 30-day daily trend | `idx_record_user_event_created_at_id` range scan, 9,412 rankable rows in median window | 10,000 | 8 date aggregate rows | 27.0ms |
| PB progression | `idx_record_user_event_created_at_id` lookup, 9,412 rankable rows materialized | 10,000 | 2 PB points | 25.1ms |

Daily trend는 10,000-row range에서 daily count와 rankable median을 함께 계산한다. 10,000-row snapshot에서 27.0ms로 끝나며 새 covering index나 generated effective column을 추가할 근거는 없다.

PB progression은 inclusive running minimum 뒤 `LAG`로 이전 minimum을 비교한다. 10,000-row snapshot은 25.1ms로 끝났다. tie와 strict improvement semantics는 unchanged다.

## 범위

- latest, trend, progression은 모두 current retained Record만 읽는다.
- response는 latest 24, fixed 30 points, progression page 50으로 각각 제한한다.
- 100,000-record progression stress와 production request latency는 이 snapshot의 범위가 아니다.
