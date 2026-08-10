---
doc_type: adr
status: accepted
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/04-data/migration-policy.md
  - docs/03-architecture/deployment-architecture.md
---
# ADR-0004 Forward-only Flyway migration 사용

## Context

production schema와 application image를 독립적으로 안전하게 갱신하고, 적용 이력과 checksum을 신뢰할 수 있어야 한다. image rollback이 이미 실행된 DDL을 자동 복구하지는 않는다.

## Decision

적용된 Flyway migration은 수정하지 않고 새 version migration만 추가한다. production deploy는 candidate image로 one-shot migration을 먼저 실행하고 running API는 Flyway disabled, Hibernate validate로 시작한다.

## Alternatives

- application startup마다 자동 migration
- 적용된 SQL을 직접 수정
- Hibernate ddl-auto update
- deploy 실패 시 자동 down migration

## Consequences

- schema history와 artifact의 대응을 추적할 수 있다.
- migration 실패 전에 기존 application을 유지할 수 있다.
- breaking schema 변경은 expand-and-contract와 별도 recovery 계획이 필요하다.
- application rollback만으로 schema를 되돌릴 수 없음을 운영자가 인지해야 한다.
