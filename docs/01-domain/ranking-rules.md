---
doc_type: domain
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/ranking-architecture.md
  - docs/04-data/redis-model.md
---
# Ranking Rules

## 대상

Ranking은 EventType별로 사용자당 하나의 PB를 비교하는 Cubing Hub 내부 순위다. raw solve 전체를 직접 정렬하지 않는다.

## 정렬 규칙

1. best effective time 오름차순
2. 동률이면 PB가 된 record의 created_at 오름차순
3. 다시 동률이면 record id 오름차순
4. Redis member는 마지막 안정화 기준으로 user id도 포함한다

현재 구현은 ROW_NUMBER 방식의 고유한 순번을 사용하므로 같은 시간도 공동 순위가 아니라 1, 2처럼 순차 순위를 받는다.

## Penalty

- NONE과 PLUS_TWO는 effective time으로 비교한다.
- DNF는 PB와 ranking에서 제외한다.
- penalty 수정 또는 PB record 삭제 시 남은 solve 전체에서 PB를 재계산한다.

## 조회 규칙

- 준비 완료된 Redis Read Model이 있고 nickname filter가 없으면 Redis에서 조회한다.
- nickname 검색은 MySQL에서 전체 global rank를 먼저 계산한 뒤 결과를 필터링한다.
- 로그인 사용자의 내 순위는 결과 page와 별도로 제공될 수 있다.
- page는 1부터 시작하며 size는 1~100 범위다.

## 정합성

MySQL의 records와 user_pbs가 Source of Truth다. Redis 값이 손실되거나 준비되지 않았을 때 MySQL 조회가 가능해야 하며, Redis는 MySQL로부터 rebuild할 수 있어야 한다.
