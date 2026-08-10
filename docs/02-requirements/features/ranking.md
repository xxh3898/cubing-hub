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
  - docs/01-domain/ranking-rules.md
  - docs/03-architecture/ranking-architecture.md
  - docs/08-decisions/adr-0002-redis-ranking-read-model.md
---
# Ranking

## 현재 사용자 가치

사용자는 event별 Cubing Hub PB 순위를 탐색하고 nickname으로 사용자를 찾으며, 로그인 상태에서는 자신의 global rank를 확인한다.

## 현재 동작

- EventType별 PB Ranking
- 1-based page와 page size
- nickname 부분 검색
- 로그인 사용자의 myRanking
- Redis 기본 조회와 MySQL fallback

현재 API는 넓은 EventType을 수용할 수 있지만 모든 event를 같은 `time_ms` lower-is-better 모델로 지원할 수 있는지는 확정되지 않았다.

## 요구사항

- 순위 결과는 [Ranking Rules](../../01-domain/ranking-rules.md)의 정렬과 penalty 규칙을 따른다.
- nickname 검색 결과에서도 표시되는 rank는 검색 결과 내부 순번이 아니라 global rank다.
- Redis가 준비되지 않아도 사용 가능한 MySQL 결과를 반환해야 한다.
- Record·penalty·nickname 변경 뒤 Read Model을 동기화해야 한다.
- Read Model이 유실되면 MySQL에서 rebuild할 수 있어야 한다.

## V2.1 Foundation 요구사항

- completed Practice Record와 `user_pbs`를 PB·Ranking의 MySQL Source of Truth로 유지한다.
- Redis는 rebuild 가능한 Read Model로 유지하며 Source of Truth로 전환하지 않는다.
- idempotent Record retry가 duplicate Record나 중복 PB·Redis 반영을 만들지 않아야 한다.
- Input Method만으로 Ranking eligibility나 Verification Level을 바꾸지 않는다.
- Event Code, Result Kind, Practice Timer, Scramble, Practice Ranking capability를 구분한다.
- WCA_333FM, WCA_333MBF 등을 일반 time ranking 대상으로 확정하기 전에 production data audit과 event 정책 결정을 완료한다.

## V2.1 비목표

- Daily Challenge Ranking
- Verified Record 전용 Ranking
- Competition Result·External WCA Result 통합
- Redis outbox·CDC
- 새로운 공동 순위 정책
