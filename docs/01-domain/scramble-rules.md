---
doc_type: domain
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/solve-model.md
  - docs/02-requirements/features/timer.md
  - docs/02-requirements/features/daily-challenge.md
---
# Scramble Rules

## 현재 event 집합

EventType은 3x3x3, 2x2x2, 4x4x4~7x7x7, blindfolded, one-handed, fewest moves, Clock, Megaminx, Pyraminx, Skewb, Square-1 코드를 포함한다.

Event code 존재, 내부 generator 능력, public Scramble API 지원, Practice Timer 지원, Practice Ranking 지원은 서로 같은 의미가 아니다.

## 현재 public 지원 범위

현재 `ScrambleService`와 public Practice Timer가 지원하는 event는 WCA_333이다. 미지원 event 요청은 실제 scramble 대신 error로 처리한다.

내부 `ScrambleGenerator`에는 다음 문자열 생성 로직이 존재한다.

- WCA_333과 WCA_333OH: U, D, L, R, F, B를 사용한 20 move 문자열
- WCA_222: U, R, F를 사용한 10 move 문자열
- 그 밖의 event: 미구현 안내 문자열

내부 utility가 문자열을 만들 수 있다는 사실만으로 public 지원 capability를 주장하지 않는다. 이 구현은 WCA 공식 scramble program과 동등하다고 간주하지 않는다.

## Practice Record snapshot

Practice Record는 solve에 사용한 exact scramble 문자열 snapshot을 보존한다. Record 생성 뒤 snapshot을 바꾸지 않는다.

현재 없는 것:

- scramble identity
- generator 이름·version
- seed
- 발급 주체
- challenge 또는 competition assignment

일반 Practice snapshot에 generic `scramble_id`를 V2.1에서 추가하지 않는다.

## Daily scramble과 future identity

홈의 오늘의 scramble은 Asia/Seoul 날짜와 event를 seed로 사용한다. 같은 날짜와 event에는 같은 문자열을 반환하고 날짜가 바뀌면 seed가 달라진다. 현재 홈은 WCA_333을 사용한다.

이 기능은 Daily Challenge의 issued scramble, attempt, submission, ranking을 의미하지 않는다. Daily Challenge가 구현될 때는 challenge 또는 issued scramble aggregate가 identity와 exact snapshot을 소유하는 방향을 검토한다.

## 제품 표현 원칙

- generator 미지원 event를 공식 scramble처럼 보여 주지 않는다.
- 내부 utility capability와 public 지원 범위를 구분한다.
- Cubing Hub Practice scramble과 WCA Competition scramble을 구분한다.
- Input Method나 scramble source만으로 Verification Level을 판단하지 않는다.
- generator algorithm 변경은 기존 daily scramble 재현성에 영향을 주므로 requirement·test와 함께 검토한다.

public event 지원 제한은 production Record 분포를 확인한 뒤 [PRD](../00-product/prd.md)의 pre-implementation gate에서 결정한다.
