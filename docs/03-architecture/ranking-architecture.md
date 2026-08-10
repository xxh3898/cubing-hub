---
doc_type: architecture
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/ranking-rules.md
  - docs/04-data/redis-model.md
  - docs/08-decisions/adr-0002-redis-ranking-read-model.md
---
# Ranking Architecture

## 역할 분리

- records: raw solve Source of Truth
- user_pbs: 사용자·event별 PB projection, MySQL Source of Truth
- Redis ranking:v2 keys: 조회용 Read Model

## Mutation 흐름

solve 저장, penalty 변경, solve 삭제는 해당 사용자·event의 PB를 MySQL에서 다시 계산한다. PB가 바뀌면 Redis entry를 upsert하거나 제거한다. nickname 변경도 Read Model을 동기화한다.

## Read 흐름

- nickname이 비어 있고 event의 ready key가 있으면 Redis page를 읽는다.
- nickname 검색 또는 Redis 미준비 상태는 MySQL query를 사용한다.
- 로그인 사용자의 myRanking은 Redis ready 여부에 맞춰 Redis 또는 MySQL에서 찾는다.

## Ordering parity

MySQL은 effective time, PB record created_at, record id 순으로 ROW_NUMBER를 만든다. Redis ZSET score는 effective time이고 member 문자열에 created_at, record id, user id를 고정 폭으로 넣어 같은 시간의 순서를 안정화한다.

## Rebuild

rebuild는 event별 기존 Read Model을 clear하고 user_pbs를 batch 조회해 다시 채운 뒤 마지막에 ready key를 기록한다. mode는 disabled, startup, oneshot이 있으며 production operation은 canonical runbook을 따른다.

## Failure 경계

Redis가 비어 있거나 rebuild 중이면 ready가 없으므로 일반 조회가 MySQL로 fallback한다. Redis write failure와 MySQL commit 경계는 강한 atomic transaction이 아니므로 모니터링과 rebuild 가능성을 유지한다.
