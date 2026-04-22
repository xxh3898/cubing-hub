# MyPage Summary Benchmark Comparison (10k per user)

- Generated at: 2026-04-22T10:23:44.871Z
- Current summary: `docs/performance/mypage-summary-10k-current.json`
- Baseline summary: `docs/performance/mypage-summary-10k-baseline.json`

## Metrics

| Metric | baseline-10k | current-optimized-10k | Delta |
| --- | --- | --- | --- |
| HTTP request duration avg | 451.04 ms | 77.86 ms | -82.74% |
| HTTP request duration p95 | 790.68 ms | 137.39 ms | -82.62% |
| HTTP request duration max | 2,041.89 ms | 437.16 ms | -78.59% |
| HTTP requests count | 9,561 | 55,115 | +476.46% |
| HTTP requests rate | 70.62/s | 407.21/s | +476.64% |
| HTTP request failed rate | 0.00% | 0.00% | n/a |
| Checks success rate | 100.00% | 100.00% | 0.00% |

## Notes

- Baseline label: `baseline-10k`
- Current label: `current-optimized-10k`
