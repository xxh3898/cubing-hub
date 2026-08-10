---
doc_type: operation
status: review-needed
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/07-operations/backup-restore.md
  - homeserver/docs/db-backup-restore.md
---
# Disaster Recovery

## Repository에서 확인된 복구 수단

- 이전 verified application SHA와 runtime config digest pair
- 검증된 MySQL logical dump와 post image snapshot
- ranking Redis Read Model rebuild
- immutable GHCR application·runtime configuration artifact
- Mac mini setup·deploy·backup runbook

## 시나리오

| 장애 | 기본 복구 기준 |
| --- | --- |
| application regression | 이전 verified pair로 rollback |
| runtime config 손상 | state·current 무결성 확인 후 이전 verified release |
| MySQL data loss | 같은 backup set의 logical dump 복구 |
| post image loss | DB snapshot과 짝인 image snapshot 복구 |
| Redis loss | service 재기동, auth 영향 공지, ranking rebuild |
| Mac mini 교체 | setup guide와 artifact·backup으로 재구축 |
| Cloudflare·shared edge 장애 | shared infrastructure runbook과 조정 |

## 미검증

- 최근 isolated restore drill 일자와 결과
- 실제 RTO와 RPO
- Mac mini 전체 상실 시 새 host 준비 시간
- GHCR 또는 GitHub 장기 장애의 artifact 보존
- offsite backup materialization과 접근 절차
- 담당자와 communication channel

## 완료 조건

새 환경에서 DB·image 정합성, Web·API·auth·record·ranking·community image flow를 확인하고 실제 RTO·RPO를 기록해야 drill을 완료로 본다.

위 미검증을 실제 drill evidence로 채운 뒤 active 전환을 검토한다.
