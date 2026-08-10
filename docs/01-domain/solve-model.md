---
doc_type: domain
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/record-verification.md
  - docs/01-domain/ranking-rules.md
  - docs/02-requirements/features/timer.md
  - docs/08-decisions/adr-0006-practice-record-future-lifecycle-boundary.md
  - docs/08-decisions/adr-0007-canonical-timer-time-input-provenance.md
  - docs/08-decisions/adr-0009-practice-event-capability.md
---
# Solve Model

## Record 정의

```text
Record = completed Practice solve
```

Record aggregate는 완료된 Practice solve를 저장한다. `self-reported`는 현재 verification 수준을 설명할 수 있지만 Record의 영구 정의나 특정 Input Method를 뜻하지 않는다.

다음 세 축을 구분한다.

```text
Practice 여부
Input Method
Verification Level
```

Keyboard, Touch, Manual, Stackmat, Smart Timer, Smart Cube는 Input Method 후보다. 자동 측정 여부만으로 Verification Level이 결정되지는 않는다.

## 현재 저장 단위

현재 `records`는 다음 값을 보존한다.

- user: solve 소유자
- event_type: EventType 코드
- time_ms: 0보다 큰 raw integer millisecond
- penalty: NONE, PLUS_TWO, DNF
- scramble: 비어 있지 않은 문자열 snapshot
- created_at, updated_at: UTC instant 기반 persistence timestamp

현재 entity에는 Input Method, submission identity, comment, device, video evidence, session id, challenge, verification, competition reference가 없다. `created_at`은 실제 solve 발생 시각으로 재정의하지 않는다.

## V2.1 Input Provenance

V2.1은 Practice Record에 Input Method provenance를 추가하는 방향을 사용한다.

현재 값의 기준은 다음과 같다.

```text
UNKNOWN
KEYBOARD
TOUCH
```

- legacy row와 값을 보내지 않는 기존 client는 UNKNOWN 의미를 가질 수 있어야 한다.
- future hardware 값은 실제 지원 시 추가한다.
- Stackmat, Smart Timer, Smart Cube 값을 DB ENUM에 미리 선등록하지 않는다.
- Input Method는 Record 생성 뒤 변경하지 않는 provenance다.

Java application enum은 `InputMethod`를 사용하고 DB는 `VARCHAR(32)` nullable column으로 확장한다. 새 Timer는 항상 현재 값을 쓰고, legacy null·미지정 request는 API에서 UNKNOWN으로 정규화한다. Input Method는 Record 생성 뒤 수정하지 않는다.

알 수 없는 API enum 값은 UNKNOWN으로 조용히 바꾸지 않고 400으로 거절한다. Future 값은 reader가 먼저 이해하도록 배포한 뒤 writer에서 활성화한다. 정확한 column과 rollout은 [Data Dictionary](../04-data/data-dictionary.md)와 [Migration Policy](../04-data/migration-policy.md)를 따른다.

## Canonical elapsed time

Practice Timer가 직접 측정하는 elapsed time은 다음 순서로 확정한다.

```text
performance.now()
→ solve stop
→ Math.round()
→ integer millisecond
```

정지 이후 화면 표시, API payload, `records.time_ms`는 같은 canonical integer를 사용한다. running animation의 임시 표시는 이 계약과 분리할 수 있다.

WCA Competition의 hundredth 처리나 event별 공식 result 규칙을 현재 Practice Timer 계약에 섞지 않는다.

## Effective time

| Penalty | Effective time | Practice PB·Ranking 대상 |
| --- | --- | --- |
| NONE | time_ms | 예 |
| PLUS_TWO | time_ms + 2000 | 예 |
| DNF | 없음 | 아니오 |

`time_ms` 자체는 penalty 변경 시 덮어쓰지 않는다. effective time은 raw time과 penalty에서 계산하며 별도 persistent column으로 중복 저장하지 않는다.

## PB projection

`user_pbs`는 사용자·event별 하나의 Practice PB를 보존한다. `best_time_ms`와 그 근거 `records` row를 함께 가리킨다.

Record 저장, penalty 변경, 삭제로 최선 기록이 달라지면 해당 사용자·event PB를 다시 계산한다. rankable Record가 없으면 PB를 제거한다. MySQL과 Redis 역할은 [Ranking Rules](ranking-rules.md)를 따른다.

## Submission identity

`clientSubmissionId`는 authenticated Practice Record create command의 retry identity다. Record의 public ID나 정렬 기준이 아니며 사용자 범위에서만 유일하다. UUID 자체로 chronological ordering을 만들지 않는다.

같은 identity의 payload 충돌 판정을 위해 최초 server-normalized logical payload의 fingerprint를 불변 보존한다. logical payload는 eventType, canonical timeMs, penalty, exact scramble, normalized Input Method로 구성한다. `created_at`과 이후 penalty PATCH 결과는 최초 create payload에 포함하지 않는다.

## Event capability 경계

Event code가 존재한다는 사실만으로 해당 event가 `time_ms` Practice Record와 lower-is-better ranking을 지원한다는 의미는 아니다.

V2.1 application domain은 다음 능력을 구분한다.

```text
Event Code
Result Kind
Practice Timer Capability
Scramble Capability
Practice Record Capability
Practice Ranking Capability
```

WCA_333은 TIME 결과의 Practice Timer·Scramble·Record·Ranking을 지원한다. 그 밖의 EventType은 코드로 존재하지만 V2.1 public Practice flow에서는 미지원이다. Future event는 capability를 명시적으로 추가할 때만 활성화하며 dynamic event table은 V2.1 목표가 아니다.

## Future lifecycle 경계

다음 lifecycle은 `records`의 generic context enum으로 합치지 않고 future separate aggregate를 기본 방향으로 한다.

- Daily Challenge attempt와 submission
- Verified Record의 attempt, evidence, verification, review
- Competition Result
- External WCA Result

필요한 future aggregate는 Practice Record를 참조할 수 있지만, 그 연결과 PB·Ranking 포함 여부는 각 기능 정책에서 결정한다. 자세한 결정은 [ADR-0006](../08-decisions/adr-0006-practice-record-future-lifecycle-boundary.md)을 따른다.

## Lifecycle invariants

- 다른 사용자의 Record를 수정하거나 삭제할 수 없다.
- raw time, event, scramble, owner와 input provenance는 Record 생성 뒤 불변이다.
- 현재 수정 가능한 결과 속성은 penalty다.
- DNF만 남은 사용자는 해당 event Practice Ranking에 포함되지 않는다.
- PB가 아닌 Record도 개인 history로 유지된다.
- PB의 `best_time_ms`는 참조 Record의 effective time과 일치해야 한다.
- `records`에 verification boolean이나 Smart Cube telemetry를 직접 추가하지 않는다.

DB의 현재 상세는 [Data Dictionary](../04-data/data-dictionary.md), endpoint의 실제 계약은 [API 안내](../05-api/README.md)를 따른다.
