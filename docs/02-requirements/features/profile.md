---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/02-requirements/features/authentication.md
---
# Profile

## 현재 사용자 가치

로그인 사용자는 자신의 account와 solve history를 관리하고 현재 성과를 확인한다.

## 현재 동작

- profile, 주 종목, 요약 통계 조회
- event별 기록 history와 pagination
- 최근 기록 추세와 PB 표시
- nickname과 주 종목 변경
- 현재 비밀번호 확인 후 비밀번호 변경
- 기록 penalty 수정과 삭제

## 요구사항

- 본인 profile과 기록만 변경할 수 있어야 한다.
- nickname 변경은 ranking Read Model에도 반영돼야 한다.
- record 수정·삭제로 PB가 달라지면 summary와 ranking이 함께 갱신돼야 한다.
- 페이지 단위 history와 summary가 같은 사용자의 데이터여야 한다.
- password 변경 후 기존 인증 session 처리 정책은 auth architecture와 일치해야 한다.
