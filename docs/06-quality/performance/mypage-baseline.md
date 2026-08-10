---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related: []
---
# MyPage Performance Baseline

## Snapshot

2026-04-22 사용자 10명, 사용자당 10,000 records dataset에서 profile summary 최적화 전후를 비교한 local k6 결과다.

| Metric | Baseline | Optimized |
| --- | ---: | ---: |
| average | 451.04 ms | 77.86 ms |
| p95 | 790.68 ms | 137.39 ms |
| max | 2,041.89 ms | 437.16 ms |
| failed rate | 0.00% | 0.00% |

이 결과는 당시 dataset과 code revision의 snapshot이며 현재 production 성능 보장이 아니다.

## Evidence

- [generated comparison](benchmarks/mypage/mypage-summary-10k-comparison.md)
- [baseline raw JSON](benchmarks/mypage/mypage-summary-10k-baseline.json)
- [optimized raw JSON](benchmarks/mypage/mypage-summary-10k-current.json)
- [baseline dashboard](../../assets/screenshots/performance/mypage-summary-10k-baseline-dashboard.png)
- [optimized dashboard](../../assets/screenshots/performance/mypage-summary-10k-current-dashboard.png)

## 결론 범위

profile summary query 최적화의 역사적 근거로 사용한다. record 수, database cache, host 자원과 scenario가 다르면 새 baseline을 만든다.
