---
doc_type: operation
status: active
created: 2026-08-10
updated: 2026-08-13
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

MySQL engine maintenance의 final backup은 canonical quiesce evidence가 만들어진 뒤 시작해야 한다. Quiesce는 API·Web write path와 post-image write를 중지하고 DB를 healthy 상태로 유지한다. 일반 scheduled backup은 active runtime worker를 유지하고, maintenance final mode만 approved target runtime artifact의 exact worker를 선택한다. Target은 worker code provenance이고 snapshot의 `source`는 계속 current production runtime이다. Backup manifest는 실제 DB exact image·image ID·volume과 target worker evidence를 분리해 기록하고, candidate는 source runtime·DB identity와 backup 시작 시각을 quiesce evidence에 결합한다. Human confirmation token만으로 cutover를 허용하지 않는다.

MySQL engine rollback은 upgraded original volume을 downgrade하지 않는다. Pre-upgrade backup을 fresh 이전-engine volume에 restore·검증한 뒤 dedicated maintenance candidate로 runtime binding을 전환한다. Candidate·quiesce·restore evidence·exact command는 command-level Source of Truth를 따른다.

실제 backup, restore, retention 삭제는 각각 별도 운영·data 승인 대상이다.
