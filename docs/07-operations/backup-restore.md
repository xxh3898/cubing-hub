---
doc_type: operation
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - homeserver/docs/db-backup-restore.md
  - docs/03-architecture/storage-architecture.md
---
# Backup and Restore Gateway

command-level backup·restore 절차의 Source of Truth는 [DB와 이미지 백업·복구](../../homeserver/docs/db-backup-restore.md)다. 이 문서는 중앙 책임 경계만 정의한다.

## Backup unit

- MySQL logical dump
- post image directory snapshot
- metadata·file manifest와 checksum
- engine·version, record·file count, SUCCESS marker

Redis는 현재 backup set에서 제외된다. ranking은 MySQL에서 rebuild하지만 active auth session과 temporary verification state는 복구되지 않는다.

## 정상 판정

새 snapshot은 dump 검증, post_attachments.object_key와 file 대조, manifest 검증을 통과해야 정상이다. 정상 snapshot 최신 3개를 보존하며 새 snapshot 검증 전에 이전 정상본을 삭제하지 않는다.

## Restore

restore는 격리된 target, write freeze, source snapshot, schema·engine version, expected count와 rollback을 먼저 확인한다. DB와 image를 같은 set에서 복구하고 application smoke와 ranking rebuild를 수행한다.

실제 backup, restore, retention 삭제는 각각 별도 운영·data 승인 대상이다.
