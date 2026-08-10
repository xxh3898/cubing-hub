---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/02-requirements/non-functional-requirements.md
---
# Acceptance Criteria

## 공통

- 요구한 사용자 흐름의 normal·failure 상태가 구분된다.
- validation, authentication, authorization, ownership이 server에서 검증된다.
- public contract가 바뀌면 REST Docs test와 consumer를 갱신한다.
- schema·storage 변경은 data migration과 rollback 한계를 설명한다.
- secret, debug bypass, dead code, 중복 Source of Truth가 남지 않는다.

## Auth

- 유효 login, 잘못된 credential, refresh rotation, token reuse, logout을 검증한다.
- access token은 persistent browser storage에 남지 않는다.
- cookie path·Secure·SameSite와 recovery 경로를 검증한다.

## Solve와 Ranking

- NONE, PLUS_TWO, DNF와 PB 재계산을 검증한다.
- 저장·penalty 변경·삭제 뒤 MySQL과 Redis 결과가 일치한다.
- Redis 미준비와 nickname 검색은 MySQL fallback을 사용한다.
- tie-break와 pagination에서 누락·중복이 없다.

## Community와 Upload

- JSON·multipart create와 update, 유지·삭제 image를 검증한다.
- type·size·count, 소유권, not-found를 검증한다.
- DB object_key와 실제 file lifecycle을 확인한다.

## Deployment와 Backup

- exact SHA와 configuration digest 검증, one-shot migration, public smoke를 통과한다.
- 실패 시 이전 verified pair 복구가 가능하다.
- MySQL dump와 image snapshot, manifest, record·file 정합성을 확인한다.
- migration이 자동 rollback되지 않음을 명시한다.

기능별 세부 기준은 [Requirements](../02-requirements/)와 함께 읽는다.
