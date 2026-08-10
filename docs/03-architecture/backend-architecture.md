---
doc_type: architecture
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/01-domain/solve-model.md
  - docs/04-data/data-dictionary.md
  - docs/05-api/README.md
  - docs/08-decisions/adr-0006-practice-record-future-lifecycle-boundary.md
  - docs/08-decisions/adr-0008-record-submission-idempotency.md
---
# Backend Architecture

## Package 구조

- domain/*/controller: HTTP와 인증 principal 경계
- domain/*/service: use case, transaction, 권한·domain rule
- domain/*/repository: JPA, Querydsl, native query, Redis access
- domain/*/entity: MySQL persistence model
- domain/post/storage: post image binary adapter
- security: JWT filter, token provider, user details
- config: Security, CORS, JPA, properties
- common: response, exception, validation, utility
- ops: 운영용 제한된 lifecycle entrypoint

## 주요 패턴

- 읽기 service는 기본 read-only transaction을 사용하고 mutation만 쓰기 transaction을 연다.
- controller response는 ApiResponse envelope를 사용한다.
- validation annotation과 service domain validation을 함께 사용한다.
- ownership은 server에서 현재 user와 resource owner를 비교한다.
- Ranking 조회는 MySQL repository와 Redis repository를 service에서 선택한다.

## V2.1 Timer / Record 목표 구조

아래는 사용자 승인된 구현 목표이며 현재 code에는 아직 반영되지 않았다.

### Practice Record boundary

- Record aggregate는 completed Practice solve를 저장한다.
- Daily Challenge, Verification, Competition, External WCA Result는 future separate aggregate를 기본 방향으로 한다.
- generic `record_context` enum과 `records.verified` boolean을 도입하지 않는다.

### Create boundary

- client submission identity와 현재 user를 기준으로 retry idempotency를 보장한다.
- 같은 submission의 retry는 duplicate Record와 중복 PB·Redis mutation을 만들지 않아야 한다.
- create response는 server-authoritative raw time, effective result, penalty 등 Record 표현을 제공하는 additive evolution을 우선한다.
- exact request·response field, ID format, persistence constraint와 conflict contract는 구현 전 API·data 설계에서 확정한다.

### Query boundary

- 사용자 Record history는 optional event filter를 지원한다.
- ordering은 timestamp 동률에서도 stable tie-break를 사용한다.
- Ao5/Ao12가 전체 event page를 client에서 잘라낸 결과에 의존하지 않도록 한다.

### Event capability

Event enum 존재와 Result Kind, Practice Timer, Scramble, Practice Ranking capability를 분리한다. V2.1에서는 dynamic event table을 만들지 않는다. 실제 지원 제한은 production event distribution audit 뒤 결정한다.

### Projection responsibility

MySQL `records`와 `user_pbs`를 PB·Ranking Source of Truth로 유지하고 Redis는 rebuild 가능한 Read Model로 유지한다. Input Method, idempotency, canonical response를 추가해도 이 책임을 바꾸지 않는다.

## Integration

- SMTP adapter는 email verification과 password reset에 사용한다.
- Discord webhook adapter는 feedback 운영 알림에 사용한다.
- local post image storage는 configurable root와 public base URL을 사용한다.

## Source of Truth

- endpoint request·response: backend REST Docs test와 `backend/src/docs/asciidoc`
- schema: Flyway migration
- current behavior: production code와 focused test
- product·domain contract: [PRD](../00-product/prd.md)와 [Solve Model](../01-domain/solve-model.md)
- architecture 설명: 이 문서

새 domain을 추가할 때 기존 package 경계와 transaction·authorization 책임을 먼저 검토한다. 승인된 목표와 아직 구현되지 않은 상태를 같은 사실로 표현하지 않는다.
