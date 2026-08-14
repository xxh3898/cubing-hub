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
  - docs/06-quality/performance/growth-read-api-10k.md
  - backend/src/main/java/com/cubinghub/domain/growth/repository/GrowthReadRepository.java
  - backend/src/test/java/com/cubinghub/domain/growth/repository/GrowthQueryPlanIntegrationTest.java
---
# Growth Read API Query Plan Evidence — MySQL 8.4.11

## Fixture

격리된 `mysql:8.4.11` container에 기존 Flyway migration을 적용하고 WCA_333 한 user/event의 `records` 10,000건을 생성했다. PR B의 fixture와 SQL을 그대로 사용했으며 `ANALYZE TABLE records` 뒤 `EXPLAIN ANALYZE`를 실행했다. production data, schema, index는 사용하지 않았다.

아래 숫자는 Mac mini Docker Desktop에서 얻은 local snapshot이다. CI의 `GrowthQueryPlanIntegrationTest`는 같은 engine patch와 query를 다시 검증하지만, local execution time을 production latency나 capacity로 해석하지 않는다.

## MySQL 8.0.46 비교

| Query | MySQL 8.0.46 baseline | MySQL 8.4.11 | MySQL 8.4.11 access |
| --- | ---: | ---: | --- |
| latest 24 Record | 0.701–0.706ms | 0.473ms | `idx_record_user_event_created_at_id` reverse index lookup, 24 rows 반환 |
| 30-day daily trend | 27.0ms | 19.9ms | 같은 index의 range scan, 10,000 rows scan, 9,412 rankable rows window, 8 rows 반환 |
| PB progression | 25.1ms | 16.7ms | 같은 index lookup, 10,000 rows scan, 9,412 rankable rows materialize, 2 PB points 반환 |

세 query 모두 V3 `idx_record_user_event_created_at_id (user_id, event_type, created_at, id)`를 선택했다. Trend는 daily aggregate와 median 계산에 temporary table을 사용하고, PB progression은 running minimum과 `LAG`를 위해 sort/materialize 단계를 유지한다. MySQL 8.4.11에서 scan shape나 반환량이 악화되지 않았고 새 index나 Flyway migration은 추가하지 않는다.

## 범위

- latest, trend, progression SQL과 10,000-record seed는 MySQL 8.0.46 baseline과 같다.
- 절대 실행 시간은 host 상태에 따라 달라질 수 있으므로 access path와 actual row shape를 우선 비교한다.
- 100,000-record progression stress와 production request latency는 이 snapshot의 범위가 아니다.
