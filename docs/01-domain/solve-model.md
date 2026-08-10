---
doc_type: domain
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/ranking-rules.md
  - docs/02-requirements/features/timer.md
---
# Solve Model

## 저장 단위

records는 한 번의 solve를 보존하는 Source of Truth다.

- user: solve 소유자
- event_type: EventType 코드
- time_ms: 0보다 큰 raw time
- penalty: NONE, PLUS_TWO, DNF
- scramble: 비어 있지 않은 문자열
- created_at, updated_at: UTC instant 기반 timestamp

현재 entity에는 comment, device, video evidence, session id가 없다.

## Effective time

| Penalty | Effective time | Ranking 대상 |
| --- | --- | --- |
| NONE | time_ms | 예 |
| PLUS_TWO | time_ms + 2000 | 예 |
| DNF | 없음 | 아니오 |

time_ms 자체는 penalty를 바꿀 때 덮어쓰지 않는다.

## PB projection

user_pbs는 사용자·event별 하나의 PB를 보존한다. best_time_ms와 그 근거 records row를 함께 가리킨다.

solve 저장, penalty 변경, 삭제로 최선 기록이 달라지면 해당 사용자의 event PB를 다시 계산한다. rankable solve가 없으면 PB를 제거한다.

## Lifecycle invariants

- 다른 사용자의 solve를 수정하거나 삭제할 수 없다.
- DNF만 남은 사용자는 해당 event ranking에 포함되지 않는다.
- PB가 아닌 solve도 개인 history로 유지된다.
- PB의 best_time_ms는 참조 record의 effective time과 일치해야 한다.

DB 상세는 [data dictionary](../04-data/data-dictionary.md), endpoint 계약은 [API 안내](../05-api/README.md)를 따른다.
