---
doc_type: domain
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/02-requirements/features/timer.md
---
# Scramble Rules

## 현재 event 집합

EventType은 3x3x3, 2x2x2, 4x4x4~7x7x7, blindfolded, one-handed, fewest moves, Clock, Megaminx, Pyraminx, Skewb, Square-1 코드를 포함한다.

## Generator 지원 범위

- WCA_333과 WCA_333OH: U, D, L, R, F, B를 사용한 20 move 문자열
- WCA_222: U, R, F를 사용한 10 move 문자열
- 그 밖의 event: 현재 미구현 안내 문자열 반환

3x3 계열은 같은 face 연속과 같은 axis의 3회 연속 선택을 피한다. 이 구현은 WCA 공식 scramble program과 동등하다고 간주하지 않는다.

## Daily scramble

홈의 오늘의 scramble은 Asia/Seoul 날짜와 event를 seed로 사용한다. 같은 날짜와 event에는 같은 문자열을 반환하고 날짜가 바뀌면 seed가 달라진다. 현재 홈은 WCA_333을 사용한다.

## 제품 표현 원칙

- generator 미지원 event를 공식 scramble처럼 보여 주지 않는다.
- Cubing Hub 연습 scramble과 WCA competition scramble을 구분한다.
- generator algorithm 변경은 기존 daily scramble 재현성에 영향을 주므로 요구사항·test와 함께 검토한다.
