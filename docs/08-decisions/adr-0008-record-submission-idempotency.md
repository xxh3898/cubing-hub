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

- 같은 submission의 retry는 같은 logical Record를 가리킨다.
- 같은 identity를 다른 payload에 재사용하는 경우는 정상 retry와 구분한다.
- concurrent duplicate는 application check만이 아니라 persistence uniqueness까지 고려한다.
- idempotent replay는 Record, PB와 Redis Ranking을 중복 반영하지 않는다.
- create response는 server-authoritative canonical Record 표현을 반환하는 additive evolution을 우선한다.
- authenticated Timer는 한 건의 pending solve와 같은 submission identity를 sessionStorage에서 복구할 수 있게 한다.
- pending storage에는 access token이나 credential을 넣지 않으며 user session 경계를 검증한다.

UUID format, request 위치, column type, exact HTTP status와 conflict response는 implementation 전 API·data 설계에서 확정한다.

## Alternatives

- frontend in-flight flag만 유지
- event, time, scramble 조합으로 중복 추정
- server response 유실 시 사용자에게 새 Record 생성 위험을 감수하고 재시도하도록 함
- 다중 offline queue와 background sync를 V2.1에서 함께 구현
- global identity만 사용하고 user scope를 두지 않음

## Consequences

- network response 유실과 retry에서 duplicate Record를 방지할 수 있다.
- PB와 Ranking projection이 같은 logical create에 한 번만 반영돼야 한다.
- legacy client compatibility를 위해 additive rollout과 optional transition을 설계해야 한다.
- identity uniqueness, payload conflict와 concurrent request를 integration test로 검증해야 한다.
- sessionStorage 복구는 한 건의 pending solve만 다루며 완전한 offline 기능이 아니다.
- guest → account migration은 자동으로 해결되지 않지만 future portability가 재사용할 identity 경계를 얻는다.
