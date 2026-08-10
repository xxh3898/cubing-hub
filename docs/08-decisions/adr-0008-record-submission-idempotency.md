---
doc_type: adr
status: accepted
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/02-requirements/features/timer.md
  - docs/03-architecture/backend-architecture.md
  - docs/03-architecture/frontend-architecture.md
---
# ADR-0008 client submission identity로 Record 저장을 idempotent하게 처리

## Context

현재 frontend는 같은 stopped snapshot의 동시 in-flight 요청을 막지만 server는 저장 요청의 identity를 알지 못한다.

```text
server save 성공
→ response 유실
→ client retry
→ duplicate Record
```

이 경우 raw history뿐 아니라 PB 재계산과 Redis Ranking projection도 중복 mutation을 거칠 수 있다. Authenticated pending solve도 page memory에만 있어 reload 뒤 복구할 수 없다.

## Decision

V2.1 Record create는 client가 solve별 submission identity를 만들고 server가 현재 user 범위에서 idempotency를 보장하는 방향을 사용한다.

- Browser는 solve stop에서 dependency 없이 `crypto.randomUUID()`로 UUID v4를 만들고 retry에서 유지한다. ID는 ordering에 사용하지 않는다.
- `clientSubmissionId`는 POST JSON body field다. Updated Timer는 항상 보내지만 cached legacy client transition 동안 server에서는 optional로 받고, 누락 request에는 idempotency를 소급 적용하지 않는다.
- DB는 `client_submission_id CHAR(36) NULL`과 `UNIQUE(user_id, client_submission_id)`로 user-scoped concurrency를 보장한다.
- Server-normalized logical payload는 eventType, canonical timeMs, penalty, exact scramble, normalized Input Method다. SHA-256 fingerprint를 `BINARY(32) NULL`로 최초 create와 함께 불변 보존한다.
- 같은 user·identity·fingerprint는 최초와 같은 201 Created, Location과 canonical Record body를 반환한다.
- 같은 user·identity에 다른 fingerprint를 사용하면 409 Conflict다.
- Concurrent unique loser는 failed transaction 밖의 새 read transaction에서 winner를 조회하고 fingerprint를 비교한다. Record insert flush는 PB·Redis mutation보다 먼저 수행한다.
- Idempotent replay와 unique loser는 Record, PB와 Redis Ranking을 중복 반영하지 않는다.
- Create response는 기존 `data.id`를 보존하면서 server-authoritative Record 표현을 additive하게 반환한다. clientSubmissionId와 fingerprint는 response에 노출하지 않는다.
- authenticated Timer는 한 건의 pending solve와 같은 submission identity를 sessionStorage에서 복구할 수 있게 한다.
- pending storage에는 access token이나 credential을 넣지 않으며 user session 경계를 검증한다.

## Alternatives

- frontend in-flight flag만 유지
- event, time, scramble 조합으로 중복 추정
- Generic `Idempotency-Key` header 사용
- Current mutable Record field만 비교하고 최초 payload fingerprint를 보존하지 않음
- Dedicated idempotency table과 retention lifecycle을 V2.1에 추가
- server response 유실 시 사용자에게 새 Record 생성 위험을 감수하고 재시도하도록 함
- 다중 offline queue와 background sync를 V2.1에서 함께 구현
- global identity만 사용하고 user scope를 두지 않음

## Consequences

- network response 유실과 retry에서 duplicate Record를 방지할 수 있다.
- PB와 Ranking projection이 같은 logical create에 한 번만 반영돼야 한다.
- legacy client compatibility를 위해 additive rollout과 optional transition을 설계해야 한다.
- Identity uniqueness, immutable payload fingerprint, conflict와 concurrent request를 integration test로 검증해야 한다.
- sessionStorage 복구는 한 건의 pending solve만 다루며 완전한 offline 기능이 아니다.
- guest → account migration은 자동으로 해결되지 않지만 future portability가 재사용할 identity 경계를 얻는다.
