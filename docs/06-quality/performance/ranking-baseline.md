---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/ranking-architecture.md
---
# Ranking Performance Baseline

## Snapshot

2026-04-20 MySQL V1과 2026-04-21 Redis V2를 300,000 users·records·user_pbs dataset으로 비교한 local k6 결과다. 요청은 3x3 ranking 첫 page 25개였다.

| Metric | MySQL V1 | Redis V2 |
| --- | ---: | ---: |
| average | 7,245.23 ms | 21.10 ms |
| p95 | 12,429.58 ms | 36.94 ms |
| max | 13,288.98 ms | 94.53 ms |
| failed rate | 0.00% | 0.00% |

이 결과는 당시 두 run의 summary이며 현재 production 성능 보장이 아니다.

## Evidence

- [generated comparison](benchmarks/rankings/rankings-v1-v2-comparison.md)
- [MySQL report](benchmarks/rankings/rankings-v1-report.md)
- [Redis report](benchmarks/rankings/rankings-v2-report.md)
- [MySQL raw JSON](benchmarks/rankings/rankings-v1-summary.json)
- [Redis raw JSON](benchmarks/rankings/rankings-v2-summary.json)
- [MySQL dashboard](../../assets/screenshots/performance/rankings-mysql-v1.png)
- [Redis dashboard](../../assets/screenshots/performance/rankings-redis-v2.png)

## 결론 범위

이 snapshot은 Redis Read Model 도입 판단의 역사적 근거다. nickname search와 Redis 미준비 fallback은 MySQL 경로이므로 별도 latency를 가진다.
