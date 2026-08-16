---
doc_type: product
status: active
created: 2026-08-10
updated: 2026-08-17
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/vision.md
  - docs/00-product/roadmap.md
  - docs/01-domain/solve-model.md
  - docs/02-requirements/features/timer.md
  - docs/02-requirements/features/growth.md
  - docs/02-requirements/user-flows.md
  - docs/06-quality/acceptance-criteria.md
  - docs/08-decisions/adr-0009-practice-event-capability.md
---
# Product Requirements Document

## 상태

제품 Vision, V2.1 Foundation 범위와 Practice event 지원 범위는 현재 구현 계약으로 유지한다. V2.1 Event Support 결정에는 기존 data 분포 audit을 blocker로 두지 않았다.

V2.1은 main에 병합됐고 release workflow가 성공했다. V2.2 Growth & Profile implementation은 `dev`에 통합됐고 final `dev → main` release qualification Validate를 통과했다. Main merge와 release/deploy 승인, production verification은 별도 gate로 남아 있다.

## Product Definition

Cubing Hub는 큐버의 연습, 기록, 성장, 경쟁 활동을 하나의 흐름으로 연결하는 Cuber-first 큐빙 활동 플랫폼이다. 자세한 positioning과 장기 경계는 [Vision](vision.md)이 기준이다.

## Primary User

일상적으로 큐브를 반복 연습하며 기록 단축과 성장에 관심 있는 큐버를 우선한다.

## Problem과 Core Value

solve가 단순 기록으로 쌓이고 끝나면 연습 결과가 성장·비교·참여·장기 활동 이력으로 이어지지 않는다. Cubing Hub는 이 단절을 하나의 반복 흐름으로 연결한다.

```text
Practice
→ Record
→ Improve
→ Participate
→ Profile
→ Practice
```

## Current V1 Capability

- 이메일 인증을 포함한 가입, 로그인, token 갱신, 로그아웃, 비밀번호 재설정
- scramble 생성, timer 측정, solve 저장·penalty 변경·삭제
- 종목별 개인 기록과 전체 ranking 조회
- 홈 요약, profile·주 종목·비밀번호 관리
- 회전 기호, 초보자 과정, CFOP 학습 콘텐츠
- 게시글·댓글·이미지 첨부 community
- 사용자 feedback, 공개 Q&A, 관리자 답변·공개 여부·내부 memo

상세 current 동작은 [기능 요구사항](../02-requirements/features/)과 [사용자 흐름](../02-requirements/user-flows.md)이 기준이다.

## V2.1 Objective

현재 Timer와 Record 기능을 유지하면서 가까운 Growth·Profile 확장과 future input device가 기존 구조를 다시 뒤집지 않도록, 되돌리기 어려운 시간·입력·저장·조회 경계만 정비한다.

V2.1은 Daily Challenge, Verification, Competition을 구현하는 단계가 아니다.

## V2.1 In Scope

| Foundation 항목 | 목적 | 현재 문제 | V2.1 해결 경계 | 비목표 |
| --- | --- | --- | --- | --- |
| Timer canonical elapsed time | 표시와 저장 결과 일치 | stopped 표시는 floor, 저장은 round | `performance.now()` elapsed를 stop에서 `Math.round()`한 integer millisecond로 한 번 확정 | WCA competition hundredth 정책 |
| Timer Core / Input Adapter | future input 추가 시 상태 전이 재사용 | state, clock, keyboard, touch가 한 hook에 결합 | device-neutral Timer Core와 Keyboard/Touch adapter 책임 분리 | 실제 hardware 연결 |
| Input Method provenance | 측정 입력 출처 보존 | Record에 입력 방식이 없음 | DB VARCHAR + application enum으로 UNKNOWN, KEYBOARD, TOUCH를 기록하고 legacy null을 UNKNOWN으로 정규화 | future hardware 값을 DB enum에 선등록 |
| Record submission idempotency | 응답 유실 재시도 중복 방지 | client in-flight guard만 존재 | UUID v4 `clientSubmissionId`, user-scoped unique와 immutable payload fingerprint 도입 | 범용 idempotency framework, 다중 offline queue |
| Canonical Record create response | server 결과를 consumer가 재계산하지 않음 | create가 ID만 반환 | 기존 `data.id`를 보존하면서 raw·effective time, penalty, scramble, provenance, server timestamp를 additive하게 반환 | endpoint 전체 재설계 |
| Event-filtered Record history | event별 최근 기록을 정확히 조회 | 전체 page를 받은 뒤 client가 event filter | server-side event filter 경계 추가 | 새로운 analytics API |
| Stable Record ordering | pagination 누락·중복 방지 | created timestamp만으로 순서가 겹칠 수 있음 | stable tie-break를 포함한 ordering 계약 | cursor pagination 전환 |
| Ao5 / Ao12 domain rule | 계산 의미를 code 밖에서도 검증 | frontend code/test가 사실상 규칙 | 최근 같은 event의 rolling average 규칙과 fixture를 공식화 | Session 도입, WCA-compliant 표기 |
| Practice Record invariant | future lifecycle와 PB 의미 보호 | Record가 future context를 구분하지 못함 | Record를 completed Practice solve로 정의 | catch-all context enum |
| Event capability / result kind | event별 유효 결과와 기능 지원 구분 | 넓은 EventType과 time-only ranking이 결합 | WCA_333만 TIME Practice Timer·Scramble·Record·Ranking으로 지원하고 capability를 application domain에서 관리 | enum 삭제, dynamic event table |
| Single pending authenticated solve | 일시적 failure와 reload에서 한 solve 보호 | 저장 실패 snapshot이 memory에만 있음 | sessionStorage 수준의 단일 pending solve 복구 | 여러 solve offline 기록 |
| Real Flyway upgrade compatibility test | 실제 schema upgrade 안전성 확인 | test profile은 Flyway disabled, Hibernate create-drop | Dedicated MySQL Testcontainers test로 V2 → latest, representative legacy row와 Hibernate validate 검증 | CI DB infrastructure 재설계 |
| PB / user_pbs / Redis 책임 보존 | 기존 ranking 정합성 유지 | future context가 섞이면 PB 의미가 흐려질 수 있음 | MySQL records·user_pbs를 Source of Truth로, Redis를 rebuild 가능한 Read Model로 유지 | Redis를 Source of Truth로 전환 |

## Foundation Principles

- `Record = completed Practice solve`다.
- Practice 여부, Input Method, Verification Level은 서로 다른 축이다.
- raw time은 보존하고 effective result는 penalty에서 계산한다.
- completed Practice solve의 current PB와 ranking 책임을 future lifecycle에 자동 확대하지 않는다.
- 기존 API는 additive evolution을 우선하고 breaking change를 기본값으로 삼지 않는다.
- current schema timestamp인 `created_at`을 실제 solve 발생 시각으로 재정의하지 않는다.
- 구현되지 않은 future aggregate와 hardware schema를 미리 만들지 않는다.

## Record Boundary

Daily Challenge, Verification, Competition, External WCA Result는 future separate aggregate를 기본 방향으로 한다. 하나의 `record_context` enum으로 모든 lifecycle을 `records`에 넣지 않는다. 자세한 결정은 [ADR-0006](../08-decisions/adr-0006-practice-record-future-lifecycle-boundary.md)을 따른다.

## Input Provenance와 Canonical Time

- 현재 provenance 값은 UNKNOWN, KEYBOARD, TOUCH다.
- Stackmat, Smart Timer, Smart Cube 값은 실제 지원 시 추가한다.
- Input Method는 Verification Level이 아니다.
- Practice Timer는 `performance.now()`로 측정하고 stop에서 `Math.round()`한 integer millisecond를 canonical value로 사용한다.
- 정지 이후 화면, API payload, Record 저장값은 같은 canonical value를 사용한다.

세부 근거는 [ADR-0007](../08-decisions/adr-0007-canonical-timer-time-input-provenance.md)과 [Timer 요구사항](../02-requirements/features/timer.md)을 따른다.

## Idempotency와 Pending Recovery

로그인 Timer는 solve stop에서 UUID v4 `clientSubmissionId`를 만들고 같은 retry에서 유지한다. Request body field는 cached legacy client와의 additive rollout 동안 optional이며, 갱신된 Timer는 항상 보낸다.

- 같은 사용자·identity·server-normalized logical payload는 기존 canonical Record를 같은 201 응답으로 반환한다.
- 같은 사용자·identity에 다른 logical payload를 사용하면 409 Conflict다.
- DB unique constraint가 concurrent duplicate의 최종 방어선이다.
- mutable penalty가 변경된 뒤에도 최초 request를 판별할 수 있도록 normalized payload fingerprint를 불변 보존한다.
- Browser에는 사용자별 한 건의 pending solve만 sessionStorage에 복구 가능하게 보존한다.

API 공통 계약은 [API Conventions](../05-api/conventions.md), persistence와 rollout은 [Migration Policy](../04-data/migration-policy.md)를 따른다.

결정 이유는 [ADR-0008](../08-decisions/adr-0008-record-submission-idempotency.md)을 따른다.

## History와 Average

- Ao5와 Ao12는 최근 같은 event의 rolling average다. Penalty, DNF, trimming과 integer millisecond 계산 규칙은 [Timer 요구사항](../02-requirements/features/timer.md)이 Source of Truth다.
- Session은 사용자 가치가 검증되기 전까지 추가하지 않는다.
- WCA 규칙과 실제 일치를 검증하기 전에는 WCA-compliant라고 표현하지 않는다.

## Event Capability

V2.1 public Practice flow는 WCA_333만 지원한다.

| Event Code | Result Kind | Timer | Scramble | Practice Record | Practice Ranking |
| --- | --- | --- | --- | --- | --- |
| WCA_333 | TIME | 지원 | 지원 | 지원 | 지원 |
| 그 밖의 EventType | Practice capability 미부여 | 미지원 | 미지원 | 미지원 | 미지원 |

EventType 코드는 삭제하지 않는다. Event Code 존재와 Practice 지원 여부를 분리하며, WCA_333FM과 WCA_333MBF를 일반 `time_ms` lower-is-better 결과로 취급하지 않는다. Future event는 Result Kind와 각 capability를 명시적으로 추가한 뒤에만 활성화한다. Dynamic event table과 admin-configurable event system은 V2.1 범위가 아니다. 결정 이유는 [ADR-0009](../08-decisions/adr-0009-practice-event-capability.md)를 따른다.

## EXTENSION POINT ONLY

V2.1은 다음 기능을 구현하지 않고, 나중에 추가할 때 현재 Record와 Timer를 다시 뒤집지 않도록 연결 경계만 보존한다.

- scramble identity와 issued scramble
- Attempt
- Stackmat·Smart Timer adapter
- Smart Cube telemetry·analysis·evidence
- Verified Record aggregate
- Competition Result aggregate
- External WCA Result aggregate
- versioned canonical export boundary
- guest portability

## LATER

- Session
- Daily Challenge 구현
- Verified Record와 video evidence·manual review
- Competition과 Organizer
- Stackmat·Smart Timer·Smart Cube 실제 연결
- Smart Cube telemetry storage와 retention
- Import, Export endpoint·UI, guest → account migration
- multi-solve offline queue
- `occurred_at`
- WCA synchronization
- Redis outbox·CDC
- future aggregate schema 선구현

## REJECT

현재 기준으로 다음 설계는 채택하지 않는다.

- `records`에 모든 lifecycle을 담는 generic context enum
- `records.verified BOOLEAN`
- `effective_time_ms` persistent column
- future hardware 값을 미리 넣는 DB ENUM
- Smart Cube move sequence, TPS, video를 `records` column에 저장
- V2.1에서 범용 `solve_attempt`, `result`, `context` 구조로 전체 migration
- 사용자 근거 없는 Session table
- Daily Challenge, Verified Record, Competition, Organizer schema 선구현
- Stackmat input을 Verification Level로 간주
- External WCA Result를 Practice Record로 복제해 공식 결과처럼 표현
- Redis를 PB·Ranking Source of Truth로 변경

## Success / Acceptance Direction

- 정지 후 표시, payload, 저장 raw time이 같은 integer millisecond다.
- keyboard와 touch가 같은 Timer Core를 사용하면서 provenance를 구분한다.
- 같은 저장 요청의 retry가 duplicate Record·PB·Ranking 반영을 만들지 않는다.
- 기존 client 요청과 응답 소비가 additive 변경에서 계속 동작한다.
- event별 history가 stable ordering으로 누락·중복 없이 조회된다.
- Ao5/Ao12의 penalty·DNF 결과가 domain rule과 test fixture에서 일치한다.
- 새 migration은 실제 이전 schema와 기존 row를 이용한 upgrade test로 검증할 수 있다.
- PB와 Redis 책임이 현재 [Ranking Rules](../01-domain/ranking-rules.md)와 일치한다.

세부 acceptance criteria는 [품질 문서](../06-quality/acceptance-criteria.md)가 기준이다.

## Known Open Questions

다음은 V2.1 구현 blocker가 아니라 해당 future 범위에서 결정할 질문이다.

- future event를 추가할 때 Result Kind와 capability를 어떤 evidence로 승인할 것인가
- versioned export에서 stable logical identity와 timestamp를 어떻게 표현할 것인가
- legacy client transition 뒤 `clientSubmissionId`를 언제 required request field로 전환할 것인가

## Implementation / Release Gate 상태

1. 기존 `records`와 `user_pbs` data가 없다는 전제에서 event distribution audit blocker를 제거했다.
2. V2.1 Practice Timer·Scramble·Record·Ranking event를 WCA_333으로 확정했다.
3. Input Method, idempotency, canonical create response와 pending recovery의 API·data·architecture 계약을 문서화했다.
4. forward-only additive migration, old application compatibility와 실제 MySQL upgrade test 방식을 확정했다.
5. Record Foundation과 Timer Foundation, recovery·isolated smoke·final review correction이 dev에 통합됐다.
6. [PR #15](https://github.com/xxh3898/cubing-hub/pull/15)로 dev가 main에 병합됐고 main SHA `b8e243ed65dd016772ffe928d3675979842383e7`의 [Publish and Deploy workflow](https://github.com/xxh3898/cubing-hub/actions/runs/31442512749)가 성공했다. Public URL smoke는 release workflow와 별도 evidence로 관리한다.

V2.1 제품·기술 결정과 release gate는 닫혔다. 이후 발견되는 acceptance defect는 기존 제품 범위를 넓히지 않는 별도 corrective change로 다룬다.

## V2.2 Design Boundary

V2.2는 current Record를 성장 이해와 장기 활동 이력으로 연결한다. 현재 범위와 metric contract, `dev` implementation은 다음 문서에서 관리한다.

- [Growth 요구사항](../02-requirements/features/growth.md)
- [Growth Metric Contract](../01-domain/growth-metrics.md)
- [Growth Architecture](../03-architecture/growth-architecture.md)
- [Accepted ADR-0010](../08-decisions/adr-0010-current-record-growth-read-contract.md)

V2.2 설계는 Daily Challenge, Verified Record, Competition과 Organizer를 포함하지 않는다.
