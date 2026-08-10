# Rankings Benchmark Comparison

- Generated at: 2026-04-21T09:37:10.094Z
- Current summary: `docs/performance/rankings-v2-summary.json`
- Baseline summary: `docs/performance/rankings-v1-summary.json`

## Metrics

| Metric | MySQL-v1 | redis-v2 | Delta |
| --- | --- | --- | --- |
| HTTP request duration avg | 7,245.23 ms | 21.10 ms | -99.71% |
| HTTP request duration p95 | 12,429.58 ms | 36.94 ms | -99.70% |
| HTTP request duration max | 13,288.98 ms | 94.53 ms | -99.29% |
| HTTP requests count | 586 | 202,875 | +34,520.31% |
| HTTP requests rate | 4.21/s | 1,502.77/s | +35,610.49% |
| HTTP request failed rate | 0.00% | 0.00% | n/a |
| Checks success rate | 100.00% | 100.00% | 0.00% |

## Notes

- Baseline label: `MySQL-v1`
- Current label: `redis-v2`
