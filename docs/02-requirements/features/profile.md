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
  - docs/02-requirements/features/authentication.md
  - docs/02-requirements/features/timer.md
---
# Profile

## 현재 사용자 가치

로그인 사용자는 자신의 account와 completed Practice Record history를 관리하고 현재 성과를 확인한다.

## 현재 동작

- profile, 주 종목, 요약 통계 조회
- 전체 Record history와 pagination
- client에서 선택 event의 최근 기록 추세와 PB 표시
- nickname과 주 종목 변경
- 현재 비밀번호 확인 후 비밀번호 변경
- Record penalty 수정과 삭제

현재 summary의 average 의미와 event별 성장 지표는 V2.2에서 별도 제품 결정을 거쳐야 한다.

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
