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
  - docs/03-architecture/ranking-architecture.md
  - docs/04-data/redis-model.md
  - docs/08-decisions/adr-0002-redis-ranking-read-model.md
---
# Ranking Rules

## 대상과 권위

Ranking은 지원되는 event별로 사용자당 하나의 completed Practice solve PB를 비교하는 Cubing Hub 내부 순위다. raw solve 전체, Daily Challenge submission, Verified lifecycle, Competition Result, External WCA Result를 자동으로 함께 정렬하지 않는다.

어떤 event가 Practice Ranking을 지원하는지는 Event Code 존재 여부와 분리한다. V2.1 Practice Ranking은 WCA_333만 지원한다. 다른 EventType 요청은 비어 있는 Ranking처럼 표현하지 않고 unsupported Practice event 400 응답으로 거절한다.

## 정렬 규칙

1. best effective time 오름차순
2. 동률이면 PB가 된 Record의 `created_at` 오름차순
3. 다시 동률이면 Record ID 오름차순
4. Redis member는 마지막 안정화 기준으로 user ID도 포함

현재 구현은 ROW_NUMBER 방식의 고유한 순번을 사용하므로 같은 시간도 공동 순위가 아니라 순차 순위를 받는다.

`created_at`은 server persistence timestamp이며 actual solve occurrence time으로 재정의하지 않는다.

## Penalty

- NONE과 PLUS_TWO는 effective time으로 비교한다.
- DNF는 PB와 Ranking에서 제외한다.
- penalty 수정 또는 PB Record 삭제 시 남은 Practice Record 전체에서 PB를 재계산한다.
- effective time은 persistent column으로 중복 저장하지 않는다.

## 조회 규칙

- 준비 완료된 Redis Read Model이 있고 nickname filter가 없으면 Redis에서 조회한다.
- nickname 검색은 MySQL에서 전체 global rank를 먼저 계산한 뒤 결과를 filter한다.
- 로그인 사용자의 내 순위는 결과 page와 별도로 제공될 수 있다.
- page는 1부터 시작하며 size는 1~100 범위다.

## 정합성과 책임

- MySQL `records`는 completed Practice solve Source of Truth다.
- MySQL `user_pbs`는 사용자·event별 PB projection이며 Ranking의 business Source of Truth다.
- Redis Ranking은 조회용 Read Model이고 MySQL에서 rebuild할 수 있어야 한다.
- Record 저장 idempotency는 같은 retry가 중복 Record와 중복 projection 변경을 만들지 않도록 해야 한다.
- Redis 손실이나 미준비 상태에서도 MySQL fallback이 가능해야 한다.

V2.1 input provenance, canonical create response, history query는 이 책임을 바꾸지 않는다. Redis를 PB·Ranking Source of Truth로 전환하거나 outbox·CDC를 도입하는 작업은 V2.1 범위가 아니다.

## Average와의 경계

Ao5와 Ao12는 최근 같은 event의 Record sequence를 계산하는 Practice metric이며 `user_pbs`나 Redis Ranking projection에 저장하지 않는다. 계산 규칙은 [Timer 요구사항](../02-requirements/features/timer.md)을 따른다.
