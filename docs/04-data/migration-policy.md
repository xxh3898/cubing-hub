---
doc_type: data
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/deployment-architecture.md
  - docs/08-decisions/adr-0004-forward-only-flyway-migrations.md
---
# Migration Policy

## Source of Truth

backend/src/main/resources/db/migration의 Flyway SQL이 production schema의 Source of Truth다. 현재 적용 순서는 V1 init schema, V2 query support indexes다.

## 작성 원칙

- 적용된 migration 파일을 수정하지 않는다.
- 변경은 다음 version의 새 migration으로 추가한다.
- migration은 deterministic하고 재실행 전제가 명확해야 한다.
- 큰 table lock, data backfill, enum·column 변경은 예상 시간과 중단 위험을 검토한다.
- application rollback과 schema rollback을 같은 것으로 보지 않는다.

## Compatibility

가능하면 다음 순서의 expand-and-contract를 사용한다.

1. 이전 application과 호환되는 schema 확장
2. 새 application 배포와 data 전환
3. 이전 revision이 더 이상 필요 없음을 확인
4. 후속 migration에서 obsolete 구조 정리

destructive change는 backup, reverse 또는 forward recovery, write freeze, record count 검증 없이 수행하지 않는다.

## Production 실행

production API는 SPRING_FLYWAY_ENABLED=false와 Hibernate validate로 실행한다. deployment script가 candidate API image를 사용해 one-shot migration을 먼저 수행하며 실패하면 application activation을 진행하지 않는다.

## 검증

- migration checksum과 순서
- clean test database 적용
- 이전·새 application compatibility
- index와 query plan 영향
- backup과 restore 또는 forward recovery 절차

이번 문서 rebaseline은 migration 파일이나 schema를 변경하지 않는다.
