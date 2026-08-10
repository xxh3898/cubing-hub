---
doc_type: adr
status: accepted
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/storage-architecture.md
  - docs/04-data/erd.md
---
# ADR-0001 MySQL을 business data Source of Truth로 사용

## Context

solve, PB, account, community, feedback는 영속 정합성과 관계·제약이 필요하다. ranking 조회를 위해 Redis도 사용하지만 Redis 손실이나 미준비 상태에서 원본을 복구할 기준이 필요하다.

## Decision

MySQL의 Flyway-managed schema를 business data Source of Truth로 사용한다. records와 user_pbs가 ranking의 원본이며 Redis ranking은 MySQL에서 재생성한다.

## Alternatives

- Redis를 ranking의 독립 Source of Truth로 사용
- 모든 ranking을 records에서 실시간 계산
- 별도 analytical database를 원본으로 사용

## Consequences

- FK, unique constraint, transaction으로 핵심 정합성을 유지할 수 있다.
- Redis 장애에서 MySQL fallback과 rebuild가 가능하다.
- ranking mutation은 MySQL과 Redis 사이 동기화 실패를 감지·복구해야 한다.
- query 비용을 줄이기 위해 user_pbs projection과 index를 관리해야 한다.
