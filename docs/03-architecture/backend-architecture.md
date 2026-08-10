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
  - docs/04-data/migration-policy.md
  - docs/05-api/README.md
  - docs/08-decisions/adr-0006-practice-record-future-lifecycle-boundary.md
  - docs/08-decisions/adr-0008-record-submission-idempotency.md
  - docs/08-decisions/adr-0009-practice-event-capability.md
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

아래 Record Foundation backend 경계는 V3 migration, application service와 executable test에 반영됐다. Timer Core, stopped time canonicalization, frontend provenance wiring과 pending solve recovery도 Timer Foundation slice에서 이 backend contract를 소비하도록 구현됐다.

### Practice Record boundary

- Record aggregate는 completed Practice solve를 저장한다.
- Daily Challenge, Verification, Competition, External WCA Result는 future separate aggregate를 기본 방향으로 한다.
- generic `record_context` enum과 `records.verified` boolean을 도입하지 않는다.

### Create boundary

- `clientSubmissionId`는 JSON body의 canonical UUID v4 string이다. 갱신된 Timer는 필수로 보내지만 cached legacy client transition 동안 server request field는 optional이다.
- user-scoped identity는 DB `UNIQUE(user_id, client_submission_id)`로 최종 보장한다. identity가 없는 legacy request는 기존 non-idempotent create로 처리한다.
- server는 `v1`, eventType, canonical timeMs, penalty, exact scramble, normalized Input Method 순서로 각 UTF-8 byte length를 4-byte big-endian integer로 붙인 `v1` sequence를 만들고 SHA-256 fingerprint를 계산해 최초 create payload와 함께 불변 보존한다. JSON serialization 결과에는 의존하지 않는다.
- 같은 user·identity·fingerprint는 기존 Record를 반환하고, fingerprint가 다르면 409 Conflict다. 현재 penalty가 이후 PATCH로 바뀌어도 최초 fingerprint 비교에는 영향을 주지 않는다.
- 일반 replay는 Record create와 같은 201 Created, 같은 Location과 현재 canonical Record body를 반환한다. 최초 create 뒤 penalty PATCH가 있으면 response의 penalty와 effective time은 최초 request와 달라질 수 있다. 이렇게 해야 기존 client의 status contract를 바꾸지 않는다.
- pre-check replay는 repository mutation 전에 반환한다. Concurrent race에서는 Record insert를 flush해 unique 위반을 PB·Redis 계산보다 먼저 확정한다.
- unique loser의 `DataIntegrityViolationException`은 이미 rollback-only인 transaction 안에서 처리하지 않는다. Non-transactional submission coordinator가 create transaction 실패를 받은 뒤 새 read transaction에서 winner를 조회하고 fingerprint를 비교한다.
- replay와 unique loser는 PB 재계산과 Redis sync를 실행하지 않는다. Winner만 현재 PB·Redis 흐름을 한 번 수행한다.

Create response는 기존 `data.id`를 유지하며 eventType, timeMs, penalty, nullable effectiveTimeMs, scramble, Input Method, server createdAt을 additive하게 반환한다. DNF의 effectiveTimeMs는 null이다. `clientSubmissionId`와 fingerprint는 command correlation·internal consistency 값이므로 canonical Record response에 노출하지 않는다. Endpoint field의 executable Source of Truth는 REST Docs test다.

### Query boundary

- 사용자 Record history는 optional event filter를 지원한다.
- eventType이 있으면 `findByUserIdAndEventTypeOrderByCreatedAtDescIdDesc`, 없으면 기존 all-event 의미를 유지하는 `findByUserIdOrderByCreatedAtDescIdDesc` 형태의 Spring Data JPA query를 사용한다. 이 조회에 Querydsl 추가는 필요 없다.
- canonical ordering은 `created_at DESC, id DESC`다. Offset pagination은 concurrent insert에 따라 page가 이동할 수 있지만 timestamp 동률의 비결정성은 제거한다. Cursor pagination은 V2.1 범위가 아니다.
- Ao5/Ao12가 전체 event page를 client에서 잘라낸 결과에 의존하지 않도록 한다.

### Event capability

`EventType`은 event identity와 WCA code를 계속 소유하며 값을 삭제하지 않는다. Practice 지원 정책은 enum constructor와 endpoint별 Set에 분산하지 않고 다음 application-domain 구조로 분리한다.

```text
PracticeEventCapability
- eventType
- resultKind
- practiceTimerSupported
- scrambleSupported
- practiceRecordSupported
- practiceRankingSupported

PracticeEventCapabilities
- immutable EnumMap<EventType, PracticeEventCapability>
```

V2.1 registry에는 WCA_333 한 건만 두고 `ResultKind.TIME`과 네 supported flag를 true로 지정한다. Entry가 없는 EventType은 public Practice flow에서 unsupported다. 다른 event의 Result Kind를 미리 추측하지 않는다.

- Record create와 event-filtered Practice history는 service use case 시작에서 `practiceRecordSupported`를 검사한다.
- ScrambleService는 기존 private Set 대신 같은 registry의 `scrambleSupported`를 검사한다.
- Ranking service는 Redis·MySQL을 읽기 전에 `practiceRankingSupported`를 검사한다.
- unsupported known EventType은 `CustomApiException` 기반 400과 `지원하지 않는 Practice 종목입니다.` message를 반환한다.
- JSON enum·UUID 형식 자체가 잘못된 request도 generic 500이 아니라 400 validation error가 되도록 message conversion error contract를 보강한다.

Capability는 배포와 code review로 변경되는 제품 계약이고 runtime admin 설정 요구가 없으므로 DB table이나 capability endpoint를 만들지 않는다. Future event는 registry와 backend·frontend contract test를 함께 추가할 때만 활성화한다.

### Input Method persistence

- Java representation은 record domain의 `InputMethod` enum이며 현재 UNKNOWN, KEYBOARD, TOUCH만 정의한다.
- Entity는 DB `VARCHAR(32)`를 읽고 쓰며 new create는 non-null normalized value를 기록한다.
- Legacy null과 optional request 누락은 API/domain boundary에서 UNKNOWN으로 정규화해 response에는 null을 노출하지 않는다.
- 알 수 없는 wire·DB enum 문자열을 UNKNOWN으로 silently downgrade하지 않는다. API는 400으로 거절하고 future writer는 모든 reader가 새 값을 이해한 뒤 활성화한다.
- owner, event, raw time, scramble, Input Method, client submission identity와 payload fingerprint는 create 뒤 불변이다. Penalty만 현재 PATCH 대상이다.

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
