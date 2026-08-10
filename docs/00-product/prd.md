---
doc_type: product
status: draft
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/vision.md
  - docs/00-product/roadmap.md
  - docs/01-domain/solve-model.md
  - docs/02-requirements/features/timer.md
  - docs/02-requirements/user-flows.md
  - docs/06-quality/acceptance-criteria.md
---
# Product Requirements Document

## 상태

제품 Vision과 V2.1 Foundation 방향은 승인됐다. 다만 Practice Record가 지원할 event 범위는 production data audit 뒤 결정해야 하므로 이 문서는 `draft`를 유지한다. 승인된 기준과 미결정 gate를 구분해 구현 준비에 사용한다.

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
| Input Method provenance | 측정 입력 출처 보존 | Record에 입력 방식이 없음 | UNKNOWN, KEYBOARD, TOUCH를 현재 값으로 사용하고 legacy unknown 허용 | future hardware 값을 DB enum에 선등록 |
| Record submission idempotency | 응답 유실 재시도 중복 방지 | client in-flight guard만 존재 | `clientSubmissionId`와 server-side idempotency 경계 도입 | 다중 offline queue |
| Canonical Record create response | server 결과를 consumer가 재계산하지 않음 | create가 ID만 반환 | 기존 client를 깨지 않는 additive evolution으로 authoritative Record 표현 반환 | exact response schema 선확정 |
| Event-filtered Record history | event별 최근 기록을 정확히 조회 | 전체 page를 받은 뒤 client가 event filter | server-side event filter 경계 추가 | 새로운 analytics API |
| Stable Record ordering | pagination 누락·중복 방지 | created timestamp만으로 순서가 겹칠 수 있음 | stable tie-break를 포함한 ordering 계약 | cursor pagination 전환 |
| Ao5 / Ao12 domain rule | 계산 의미를 code 밖에서도 검증 | frontend code/test가 사실상 규칙 | 최근 같은 event의 rolling average 규칙과 fixture를 공식화 | Session 도입, WCA-compliant 표기 |
| Practice Record invariant | future lifecycle와 PB 의미 보호 | Record가 future context를 구분하지 못함 | Record를 completed Practice solve로 정의 | catch-all context enum |
| Event capability / result kind | event별 유효 결과와 기능 지원 구분 | 넓은 EventType과 time-only ranking이 결합 | Event Code, Result Kind, Timer, Scramble, Practice Ranking capability를 application domain에서 구분 | dynamic event table |
| Single pending authenticated solve | 일시적 failure와 reload에서 한 solve 보호 | 저장 실패 snapshot이 memory에만 있음 | sessionStorage 수준의 단일 pending solve 복구 | 여러 solve offline 기록 |
| Real Flyway upgrade compatibility test | 실제 schema upgrade 안전성 확인 | test profile은 Flyway disabled, Hibernate create-drop | 기존 schema에서 forward-only migration과 기존 row 보존을 검증할 quality gate 정의 | 이번 단계의 test/config 구현 |
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

로그인 Timer는 solve마다 client submission identity를 만들고 server retry가 중복 Record를 만들지 않도록 한다. Browser에는 한 건의 pending solve만 복구 가능하게 보존한다. 식별자 format, 저장 column과 exact conflict response는 구현 전 API·data 설계에서 확정한다.

결정 이유는 [ADR-0008](../08-decisions/adr-0008-record-submission-idempotency.md)을 따른다.

## History와 Average

- Ao5와 Ao12는 최근 같은 event의 rolling average다. Penalty, DNF, trimming과 integer millisecond 계산 규칙은 [Timer 요구사항](../02-requirements/features/timer.md)이 Source of Truth다.
- Session은 사용자 가치가 검증되기 전까지 추가하지 않는다.
- WCA 규칙과 실제 일치를 검증하기 전에는 WCA-compliant라고 표현하지 않는다.

## Event Capability

현재 public Practice Timer와 Scramble service는 WCA_333 중심이지만 Record API는 더 넓은 EventType을 받을 수 있다. WCA_333FM, WCA_333MBF 같은 event를 일반 `time_ms` lower-is-better 결과로 확정하지 않는다.

V2.1 구현 전에 application domain에서 다음 능력을 분리한다.

```text
Event Code
Result Kind
Practice Timer Capability
Scramble Capability
Practice Ranking Capability
```

Practice Record creation을 WCA_333으로 제한할지는 production event distribution을 확인한 뒤 결정한다.

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

- production에 비-WCA_333 Record나 PB가 존재하는가
- 현재 API consumer가 public Timer 밖의 EventType으로 Record를 생성하는가
- 어떤 event를 TIME Practice Record와 Practice Ranking 대상으로 허용할 것인가
- canonical create response의 exact field와 idempotency conflict contract는 무엇인가
- future export에서 stable logical identity와 timestamp를 어떻게 표현할 것인가

## Pre-implementation Gates

1. production을 변경하지 않는 SELECT-only audit로 records와 user_pbs의 event distribution, 전체 row 수, null created_at을 확인한다.
2. audit 결과를 근거로 Practice Record creation·ranking capability를 확정한다.
3. optional input provenance, submission identity, canonical create response의 API compatibility와 rollout 순서를 설계한다.
4. forward-only migration, old/new application compatibility, actual upgrade test 계획을 승인한다.
5. 그 뒤에만 backend/frontend/Flyway 구현 계획과 별도 실행 승인을 진행한다.

이 gate가 닫히기 전에는 V2.1 application code와 migration 구현을 시작하지 않는다.
