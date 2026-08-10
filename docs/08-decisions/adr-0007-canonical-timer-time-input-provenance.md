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
  - docs/02-requirements/features/timer.md
  - docs/03-architecture/frontend-architecture.md
---
# ADR-0007 Practice Timer canonical time과 Input Method provenance를 분리

## Context

현재 Timer는 `performance.now()`로 fractional millisecond elapsed time을 측정한다. 화면 formatter는 값을 `Math.floor()`하고 Record snapshot은 `Math.round()`하므로 정지 직후 표시와 저장값이 최대 1ms 다를 수 있다.

또한 keyboard와 touch·pen이 같은 Timer 상태 전이를 사용하지만 Record에는 Input Method가 남지 않는다. Stackmat, Smart Timer, Smart Cube 같은 future input 후보가 있어도 측정 방식 자체를 verification 수준으로 해석해서는 안 된다.

## Decision

Practice Timer의 canonical elapsed time은 다음 순서로 확정한다.

```text
performance.now()
→ solve stop
→ Math.round()
→ integer millisecond
```

정지 이후 화면 표시, API payload, Record raw time은 같은 canonical integer를 사용한다. running animation의 임시 표시는 별개일 수 있다. WCA Competition의 hundredth 처리 정책은 이 Practice Timer 계약에 포함하지 않는다.

Practice Record의 Input Method provenance를 V2.1에 도입한다. 현재 값은 UNKNOWN, KEYBOARD, TOUCH를 기준으로 하며 legacy row는 UNKNOWN 의미를 가질 수 있어야 한다. Future hardware 값은 실제 지원 시 추가하고 DB ENUM에 미리 예약하지 않는다.

Java application enum은 `InputMethod`를 사용하고 DB는 `VARCHAR(32) NULL`을 DB default 없이 사용한다. New Timer는 항상 명시 값을 보내고 legacy null·optional request 누락은 application boundary에서 UNKNOWN으로 정규화한다. Unknown wire value를 UNKNOWN으로 silently downgrade하지 않고 400으로 거절한다. Future writer는 모든 reader가 새 값을 이해한 뒤 활성화한다.

Timer Core와 current Keyboard/Touch adapter의 책임을 분리하는 방향을 사용한다. Input Method는 Verification Level이 아니다.

## Alternatives

- 화면은 floor, 저장은 round인 현재 동작 유지
- `Date.now()` wall clock으로 elapsed time 측정
- fractional millisecond를 API와 DB에 그대로 저장
- WCA Competition 표시 정밀도를 Practice Timer에 바로 적용
- future hardware 값을 지금 DB ENUM에 모두 추가
- MySQL ENUM으로 Input Method를 저장
- 알 수 없는 future value를 UNKNOWN으로 자동 치환
- 각 input adapter가 별도 Timer 상태 machine을 소유

## Consequences

- 사용자가 본 stopped 결과와 저장된 raw time이 일치한다.
- Record와 API는 integer millisecond 계약을 유지한다.
- keyboard와 touch가 같은 Timer Core를 재사용하면서 provenance를 구분할 수 있다.
- future physical timer adapter가 들어갈 경계를 남기지만 실제 device protocol과 permission UX는 별도 설계가 필요하다.
- nullable expand column, legacy UNKNOWN 처리와 additive API/schema rollout이 필요하다.
- Smart Timer나 Smart Cube 입력만으로 Verified badge를 부여할 수 없다.
- Input Method는 Record create 뒤 불변이며 response에는 normalized non-null value를 제공한다.
