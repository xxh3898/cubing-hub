---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/solve-model.md
  - docs/01-domain/scramble-rules.md
---
# Timer

## 현재 사용자 가치

사용자는 event와 scramble을 고르고 keyboard 또는 touch로 solve를 측정한 뒤 자신의 기록으로 저장한다.

## 현재 동작

- 공개 timer 화면과 event 선택
- 지원 event의 scramble 생성과 VisualCube preview
- Space hold → ready → start → stop 상태 전이
- touch·pen 입력에서 같은 timer 상태 전이
- NONE, PLUS_TWO, DNF penalty 선택
- 로그인 사용자의 solve 저장
- 최근 기록 기반 Ao5·Ao12와 기록 목록
- 저장된 solve penalty 수정과 삭제

## 요구사항

- timer 중 browser scroll 같은 기본 동작이 측정을 방해하지 않아야 한다.
- 동일 입력 event가 중복 start·stop을 일으키지 않아야 한다.
- 저장 전 raw time, event, penalty, scramble이 유효해야 한다.
- 저장 실패 시 측정 결과를 성공으로 표시하지 않는다.
- DNF와 PLUS_TWO는 [Solve Model](../../01-domain/solve-model.md)의 계산 규칙을 따른다.

미지원 scramble event는 실제 scramble처럼 오해시키지 않아야 한다.
