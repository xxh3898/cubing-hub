---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-12
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/06-quality/performance/ranking-baseline.md
  - docs/06-quality/performance/mypage-baseline.md
  - docs/06-quality/performance/growth-read-api-10k.md
  - docs/06-quality/performance/growth-read-api-10k-mysql-8-4.md
---
# Performance Evidence

이 영역은 성능 목표를 선언하는 곳이 아니라 재현 조건이 남은 측정 evidence를 보존한다.

## 현재 snapshot

- [Ranking baseline](ranking-baseline.md): 2026-04-20~21 MySQL V1과 Redis V2 비교
- [MyPage baseline](mypage-baseline.md): 2026-04-22 사용자당 10,000 records 비교
- [Growth read API 10k query plan](growth-read-api-10k.md): MySQL 8.0.46 baseline
- [Growth read API 10k MySQL 8.4 query plan](growth-read-api-10k-mysql-8-4.md): MySQL 8.4.11 비교 snapshot
- [Legacy benchmark runbook](benchmarks/legacy-runbook.md): 당시 실행 절차 원문

raw JSON, generated Markdown·HTML, Grafana screenshot은 benchmarks와 docs/assets/screenshots/performance에 보존한다.

## 해석 원칙

- 날짜, commit, hardware, dataset, VU, duration이 다른 결과를 직접 비교하지 않는다.
- local snapshot을 현재 production latency나 capacity로 표현하지 않는다.
- 평균만 보지 않고 p95, max, failure rate와 correctness check를 함께 본다.
- 최적화 전후에 동일 seed와 scenario를 사용한다.
- benchmark 실행은 개발 stack과 Mac mini 자원 영향을 확인하고 별도 승인한다.

## 새 측정 기록

새 snapshot에는 목적, environment, revision, dataset, command, raw output, 비교 기준, 한계와 결론을 남긴다.
