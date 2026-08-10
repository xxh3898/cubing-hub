---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/01-domain/solve-model.md
  - docs/01-domain/scramble-rules.md
  - docs/03-architecture/frontend-architecture.md
  - docs/08-decisions/adr-0007-canonical-timer-time-input-provenance.md
  - docs/08-decisions/adr-0008-record-submission-idempotency.md
---
# Timer

## 사용자 가치

사용자는 지원되는 event와 scramble로 Practice solve를 측정하고 completed Practice Record로 저장한 뒤 최근 기록과 rolling average를 확인한다.

## 현재 동작

- public Timer 화면과 event 선택
- 지원 event의 scramble 생성과 VisualCube preview
- Space hold → ready → start → stop 상태 전이
- touch·pen 입력에서 같은 Timer 상태 전이
- `performance.now()` 기반 elapsed 측정
- NONE, PLUS_TWO, DNF penalty 선택
- 로그인 사용자의 Record 저장
- guest Record의 localStorage 저장
- 최근 기록 기반 Ao5·Ao12와 기록 목록
- 저장된 Record penalty 수정과 삭제

현재 public Timer와 Scramble service는 WCA_333을 지원한다. Inspection, Manual input, physical timer와 Smart Cube 연결은 구현돼 있지 않다.

## Record 경계

Timer가 저장하는 Record는 completed Practice solve다. Keyboard와 Touch는 Input Method이며 Verification Level이 아니다. Daily Challenge, Verified Record, Competition Result, External WCA Result를 같은 `records` lifecycle에 넣지 않는다.

## V2.1 Canonical Time

Practice Timer는 다음 계약을 따른다.

```text
performance.now()
→ solve stop
→ Math.round()
→ integer millisecond
```

- stop에서 canonical elapsed time을 한 번만 확정한다.
- 정지 이후 화면 표시, API payload, Record raw time은 같은 값을 사용한다.
- running animation의 임시 표시는 canonical Record가 아니다.
- WCA Competition의 hundredth 처리 정책을 Practice Timer에 적용했다고 표현하지 않는다.

## V2.1 Timer Core와 Input Adapter

Keyboard와 Touch가 device-neutral Timer Core의 같은 상태 전이를 사용하도록 책임을 분리한다.

```text
Timer Core
← Keyboard Adapter
← Touch Adapter
```

V2.1 Input Method 기준은 다음과 같다.

```text
UNKNOWN
KEYBOARD
TOUCH
```

- legacy Record는 UNKNOWN 의미를 가질 수 있어야 한다.
- touch·pen은 현재 TOUCH 입력 범위로 다룬다.
- future hardware 값은 실제 지원 시 추가한다.
- Input Method는 Record 생성 뒤 변경하지 않는다.

Stackmat·Smart Timer adapter는 extension point일 뿐 V2.1 구현 대상이 아니다. Smart Cube telemetry·analysis·evidence도 Timer Core에 넣지 않는다.

## V2.1 저장과 복구

- solve마다 client submission identity를 생성한다.
- server save가 성공하고 response가 유실된 뒤 retry해도 duplicate Record를 만들지 않아야 한다.
- authenticated Timer는 sessionStorage 수준에서 한 건의 pending solve를 복구할 수 있어야 한다.
- pending solve에는 access token이나 credential을 저장하지 않는다.
- 다른 사용자 session의 pending solve를 잘못 제출하지 않아야 한다.
- 여러 solve를 쌓는 offline queue는 만들지 않는다.
- 저장 성공 전에는 결과를 저장 완료로 표시하지 않는다.
- create 성공 후에는 frontend가 effective value를 임의 재구성하지 않고 server의 canonical Record 표현을 사용한다.

## Rolling Ao5 / Ao12

Ao5와 Ao12는 최근 같은 event의 completed Practice Record를 대상으로 한다. Session 경계는 사용하지 않는다.

1. NONE은 raw time을 사용한다.
2. PLUS_TWO는 raw time에 2,000ms를 더한 effective value를 사용한다.
3. DNF 1개는 정렬상 worst로 제거될 수 있다.
4. DNF가 2개 이상이면 average는 DNF다.
5. best와 worst를 각각 한 개 제거한다.
6. 나머지 effective value의 산술평균을 integer millisecond로 반올림한다.

이 규칙은 current code와 test에 근거한다. WCA 규정과 실제 일치를 별도로 검증하기 전에는 WCA-compliant라고 표현하지 않는다.

## History 요구사항

- 로그인 사용자는 event별 history를 server에서 조회할 수 있어야 한다.
- 최근 Record와 rolling average가 전체 event page를 client에서 잘라낸 결과에 의존하지 않아야 한다.
- 같은 timestamp에서도 pagination 순서가 안정적이어야 한다.
- Record 생성 응답은 기존 client compatibility를 깨지 않는 additive evolution으로 server-authoritative 표현을 제공해야 한다.

## Event Support Gate

Event code와 Practice Timer, Scramble, Practice Ranking capability를 분리한다. Practice Record creation을 WCA_333으로 제한할지는 production event distribution audit 뒤 결정하며 V2.1 구현 전까지 Open Question이다.

## 공통 요구사항

- Timer 중 browser scroll 같은 기본 동작이 측정을 방해하지 않아야 한다.
- 동일 입력 event가 중복 start·stop을 일으키지 않아야 한다.
- 저장 전 raw time, event, penalty, scramble, submission identity가 해당 계약에 따라 유효해야 한다.
- DNF와 PLUS_TWO는 [Solve Model](../../01-domain/solve-model.md)의 계산 규칙을 따른다.
- 미지원 scramble event는 실제 scramble처럼 오해시키지 않아야 한다.

## V2.1 비목표

- Session
- Inspection 정책 변경
- Daily Challenge
- Manual 입력 UI
- Stackmat·Smart Timer·Smart Cube 실제 연결
- multi-solve offline queue
- `occurred_at`
- Import·Export endpoint와 UI
- Verification·Competition lifecycle
