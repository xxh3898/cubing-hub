---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/01-domain/solve-model.md
  - docs/02-requirements/features/authentication.md
  - docs/02-requirements/features/timer.md
  - docs/02-requirements/features/growth.md
  - docs/01-domain/growth-metrics.md
---
# Profile

## 현재 사용자 가치

로그인 사용자는 자신의 account와 completed Practice Record history를 관리하고 현재 성과를 확인한다.

## 현재 동작

- Profile API는 nickname과 주 종목을 조회하고 account modal의 수정 상태를 동기화한다.
- Record History는 `GET /api/users/me/records`의 1-based server pagination으로 관리한다.
- Growth metric, trend, PB progression, activity는 private Growth aggregate API로만 표시한다.
- nickname과 주 종목 변경, 현재 비밀번호 확인 후 비밀번호 변경, Record penalty 수정과 삭제를 유지한다.

Profile response와 Home summary의 additive `averageTimeMs`는 all-event, all-time arithmetic mean이고 DNF를 제외한다. MyPage와 Home은 이 값을 V2.2 canonical Growth metric으로 사용하지 않는다. provider field의 compatibility cleanup은 별도 API 결정이다.

## 요구사항

- 본인 profile과 Record만 변경할 수 있어야 한다.
- nickname 변경은 Ranking Read Model에도 반영돼야 한다.
- Record 수정·삭제로 PB가 달라지면 summary와 Ranking이 함께 갱신돼야 한다.
- page 단위 history와 summary가 같은 사용자의 data여야 한다.
- password 변경 후 기존 인증 session 처리 정책은 auth architecture와 일치해야 한다.

## V2.1 Foundation 요구사항

- event별 Record history를 server query로 조회할 수 있어야 한다.
- 같은 timestamp에서도 stable tie-break로 page 누락·중복을 방지해야 한다.
- Profile이 표시하는 raw time, effective time, penalty는 server-authoritative Record 표현과 일치해야 한다.
- Input Method를 노출할지는 Profile UI 요구사항에서 별도로 결정하되 provenance를 Verification Level로 표현하지 않는다.
- Daily Challenge, Verified Record, Competition Result, External WCA Result를 Practice history에 자동 병합하지 않는다.

## V2.1 비목표

- Session별 history
- 전체 event를 섞은 새 growth metric 정의
- Daily Challenge·Verification·Competition activity timeline
- Import·Export UI와 guest migration
- `occurred_at` 기반 chronology

Growth, trend와 장기 activity history의 제품 범위는 [Roadmap](../../00-product/roadmap.md)의 V2.2에서 검증한다.

## V2.2 Profile 상태

[Growth 요구사항](growth.md)의 `draft`를 따른다. 아래 범위는 dev 구현 상태이며 release evidence는 아직 남아 있다.

### My Growth

- authenticated owner만 current performance, trend, PB progression, activity와 Record history를 본다.
- `/mypage`를 새 top-level route 없이 My Growth dashboard로 확장한다.
- Account 관리와 Record penalty/delete는 current 기능을 유지한다.
- Full Record history를 client metric 계산용으로 전송하지 않고 private Growth aggregate API를 사용한다.
- Record mutation은 Growth와 current Record History page를 갱신하며 Profile/account request를 다시 시작하지 않는다.
- Profile 수정은 Profile/account state와 AuthContext nickname만 갱신하며 Record History를 다시 읽지 않는다.
- Home은 Profile/Home arithmetic mean을 Growth metric으로 표시하지 않는다.

### Public Profile

- V2.2 MVP에서 신규 public Profile route/API를 만들지 않는다.
- Existing Ranking의 nickname과 event PB 공개 범위만 유지한다.
- Practice count, first/latest activity, detailed trend, DNF/+2와 consistency를 공개하지 않는다.
- 따라서 V2.2 문제 해결을 위해 full visibility setting system을 선구현하지 않는다.

Public Profile이 future scope로 승인되면 stable user identifier, opt-in/visibility, deleted/blocked user와 activity privacy를 먼저 결정한다.
