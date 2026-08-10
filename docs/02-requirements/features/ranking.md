---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/ranking-rules.md
  - docs/03-architecture/ranking-architecture.md
---
# Ranking

## 현재 사용자 가치

사용자는 event별 Cubing Hub PB 순위를 탐색하고, nickname으로 사용자를 찾으며, 로그인 상태에서는 자신의 global rank를 확인한다.

## 현재 동작

- EventType별 ranking
- 1-based page와 page size
- nickname 부분 검색
- 로그인 사용자의 myRanking
- Redis 기본 조회와 MySQL fallback

## 요구사항

- 순위 결과는 [Ranking Rules](../../01-domain/ranking-rules.md)의 정렬과 penalty 규칙을 따른다.
- nickname 검색 결과에서도 표시되는 rank는 검색 결과 내부 순번이 아니라 global rank다.
- Redis가 준비되지 않아도 사용 가능한 MySQL 결과를 반환해야 한다.
- record·penalty·nickname 변경 뒤 Read Model을 동기화해야 한다.
- Read Model이 유실되면 MySQL에서 rebuild할 수 있어야 한다.
