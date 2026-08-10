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
  - docs/01-domain/solve-model.md
  - docs/01-domain/record-verification.md
---
# ADR-0006 Practice Record와 future lifecycle을 분리

## Context

현재 `records`는 raw time, penalty, scramble을 가진 완료 solve를 저장하고 PB·Ranking의 근거가 된다. Daily Challenge, Verification, Competition, External WCA Result는 challenge 발급, attempt, evidence, review, judge, result correction, external authority처럼 서로 다른 lifecycle과 책임이 필요하다.

이들을 하나의 `record_context` enum으로 `records`에 넣으면 future 정책이 확정되기 전부터 PB·Ranking eligibility, nullable field, 수정 권한과 lifecycle 조건이 현재 Practice Record에 결합된다.

## Decision

```text
Record = completed Practice solve
```

Record의 측정 방식과 verification 수준은 Record의 Practice 경계와 분리한다.

Daily Challenge, Verified Record, Competition Result, External WCA Result는 future separate aggregate를 기본 방향으로 한다. 필요한 future aggregate가 Practice Record를 참조하거나 별도 Practice Record를 생성할 수는 있지만, 연결과 PB·Ranking 포함 여부는 해당 기능 정책에서 결정한다.

V2.1에서는 future aggregate schema를 만들지 않고 현재 Record 경계만 고정한다.

## Alternatives

- `records`에 PRACTICE, DAILY, VERIFIED, COMPETITION, WCA를 담는 generic context enum 추가
- `records.verified` boolean과 challenge·competition optional column 추가
- 공통 `solve_attempt`, `result`, `context` 구조로 기존 Record 전체 migration
- 모든 future result를 Practice Record로 복제

## Consequences

- 현재 PB와 Ranking의 의미를 completed Practice solve로 유지할 수 있다.
- future feature의 정책과 lifecycle을 검증 전에 schema로 고정하지 않는다.
- verification boolean, competition correction, external authority를 Record 하나에 과적재하지 않는다.
- future Profile activity history는 여러 aggregate를 합치는 별도 query/read model이 필요할 수 있다.
- Challenge나 Competition result를 Practice PB에 포함할지는 자동 결정되지 않으며 별도 제품 정책이 필요하다.
- 새로운 aggregate를 구현할 때 data ownership, retention, authorization과 migration을 각각 설계해야 한다.
