---
doc_type: product
status: draft
created: 2026-08-10
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/vision.md
  - docs/00-product/prd.md
  - docs/00-product/market-validation.md
  - docs/02-requirements/features/growth.md
---
# Roadmap

## 상태

단계 순서와 선행 관계는 제품 기준으로 유지한다. 출시 날짜, sprint 수, 월별 일정, 미래 기능의 상세 범위와 시장 검증 결과는 확정하지 않았으므로 `draft`를 유지한다.

일정 약속이 아니라 제품·기술 gate의 순서를 관리한다.

V2.1은 main에 병합됐고 release workflow가 성공했다. V2.2는 [Growth 요구사항](../02-requirements/features/growth.md)과 관련 `draft`를 정리하는 단계이며 구현·출시가 확정되지 않았다. Release workflow 결과는 public URL smoke를 대신하지 않는다.

## 단계 순서

```text
V2.1 Timer / Record Foundation
→ V2.2 Growth & Profile
→ V2.3 Daily Challenge
→ Validation Gate
→ Verified Record PoC
→ Competition
→ Organizer / Ecosystem
```

## Phase 기준

| Phase | Goal | Why now | Dependencies | In scope concept | Explicitly not included | Exit criteria |
| --- | --- | --- | --- | --- | --- | --- |
| V2.1 Timer / Record Foundation | Practice solve의 시간·입력·저장·조회 계약 안정화 | 이후 Growth와 Participation이 신뢰할 Record 기반 필요 | current Timer/Record 조사와 accepted product·domain decision | canonical time, WCA_333 Practice capability, input provenance, idempotency, pending solve, history·average, migration upgrade test | Session, Daily Challenge, device 연결, verification, competition | [PRD](prd.md)의 V2.1 acceptance와 migration·API compatibility gate 충족 |
| V2.2 Growth & Profile | Record를 성장 이해와 장기 활동 이력으로 연결 | Core Loop의 Record → Improve → Profile 구간 강화 | V2.1 canonical Record와 event별 history | [Growth draft](../02-requirements/features/growth.md)의 current performance, direction, consistency, PB progression, activity, next Practice | challenge, verification, competition 운영 | 사용자가 성장 변화와 다음 Practice 행동을 이해하는지 검증 가능 |
| V2.3 Daily Challenge | 같은 조건의 반복 참여 가설 검증 | Participate 가치를 낮은 운영 복잡도로 시험 | V2.1 Record 경계, V2.2 feedback, challenge 정책 결정 | issued scramble, cadence, attempt·submission의 최소 concept | Verified 판정, Competition·Organizer 전체 기능 | 반복 참여·retention 가설을 측정할 수 있고 abuse·timezone 경계가 정의됨 |
| Validation Gate | V2.1~V2.3이 실제 Cuber 문제를 해결하는지 판단 | 신뢰·운영 비용이 큰 기능 전 증거 필요 | 사용자 인터뷰와 usage evidence | Growth, Daily Challenge, portability, verification 수요 평가 | 자동 다음 phase 진입 | 계속·수정·중단 결정과 근거가 기록됨 |
| Verified Record PoC | 제한된 조건에서 evidence와 review 가치 검증 | 수요 확인 전 full verification system은 과도함 | Validation Gate 통과, privacy·retention·review 정책 | server-issued scramble, physical timer, one-take video, manual review 후보 검토 | WCA Official 표현, 범용 moderation platform | 제한된 PoC의 신뢰·운영비·privacy 결과가 평가됨 |
| Competition | advanced participation 문제를 별도 domain으로 검증 | Challenge·Verified 결과 없이 먼저 만들면 범위가 불명확함 | 사용자 검증, verification boundary, competition rule 결정 | 선택한 competition 유형의 최소 result·operation | 모든 공식·비공식 대회 유형, Organizer ecosystem 전체 | 참가자 가치와 운영·정정·audit 책임을 감당할 수 있음 |
| Organizer / Ecosystem | Organizer·Partner·Brand 확장의 사용자 가치를 검증 | Primary User 가치가 먼저 증명되어야 함 | Competition 결과와 ecosystem research | 운영 도구 또는 partnership의 검증된 최소 범위 | Primary User 변경, 독립 운영권·data 경계 완화 | Cuber 가치, 운영 가능성, 독립성과 data 책임이 함께 충족됨 |

## 공통 Gate

- 각 phase는 앞 단계의 결과를 자동 승인으로 간주하지 않는다.
- 제품 정책, schema, API, privacy, moderation, 운영 변경은 해당 단계에서 별도 결정한다.
- current와 future를 구분하고 draft 후보를 구현 일정으로 표현하지 않는다.
- 상세 ticket과 일정은 phase 진입 결정 뒤 별도 계획에서 관리한다.
- acceptance criteria와 rollback 범위가 없으면 delivery 단계로 이동하지 않는다.

## 계속 유지할 트랙

- V1 기능의 정확성, 보안, data 정합성, 배포·복구 가능성
- generated REST Docs와 실제 endpoint 계약의 일치
- 문서, code, test, migration, workflow의 동기화
- [Market Validation](market-validation.md)의 사용자 문제·가설 검증
