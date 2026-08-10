---
doc_type: adr
status: accepted
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/ranking-architecture.md
  - docs/04-data/redis-model.md
---
# ADR-0002 Redis ZSET을 ranking Read Model로 사용

## Context

event별 PB ranking의 반복 조회와 pagination을 MySQL window query만으로 처리한 V1 baseline 이후 빠른 기본 조회 경로가 필요했다. 동시에 nickname search와 복구 가능성을 유지해야 했다.

## Decision

event별 Redis ZSET과 보조 Hash를 ranking:v2 key model로 사용한다. ready marker가 있는 무검색 조회는 Redis를 사용하고, nickname 검색이나 미준비 상태는 MySQL로 fallback한다.

## Alternatives

- 모든 ranking 조회를 MySQL에서 수행
- Redis cache에 page response만 저장
- Redis를 원본으로 사용하고 MySQL projection을 제거

## Consequences

- 기본 page 조회가 정렬된 Read Model을 활용한다.
- MySQL과 같은 tie-break를 member serialization에 반영해야 한다.
- mutation sync, nickname sync, startup 또는 oneshot rebuild가 필요하다.
- Redis loss는 ranking을 재구축할 수 있지만 auth key 영향은 별도로 다뤄야 한다.
