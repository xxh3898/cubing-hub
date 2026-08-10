---
doc_type: operation
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - homeserver/docs/home-server-runbook.md
  - docs/03-architecture/deployment-architecture.md
---
# Deployment Runbook Gateway

이 문서는 중앙 문서 체계에서 배포 책임과 canonical 절차로 연결하는 gateway다. command와 Mac mini exact path를 중복 관리하지 않는다.

## Canonical runbook

- [Mac mini 운영 Runbook](../../homeserver/docs/home-server-runbook.md)
- [Mac mini 운영 준비](../../homeserver/docs/mac-mini-server-setup.md)
- [Deployment Architecture](../03-architecture/deployment-architecture.md)

## 배포 전 판단

canonical runbook에서 exact application SHA, runtime config digest, current·previous verified pair, backup, migration, disk·Docker, service·DB health와 rollback target을 확인한다.

## 완료 기준

container health만이 아니라 public Web, SPA deep link, API health, 대표 asset과 필요한 인증·기록·ranking·image smoke를 확인한다. state는 public smoke가 성공한 뒤에만 target pair를 정상으로 기록한다.

## 중단과 Rollback

migration 실패는 기존 application activation 전에 중단한다. activation 또는 public smoke 실패는 이전 verified application·configuration pair를 복구한다. DB migration은 자동 rollback되지 않는다.

실제 배포·restart·운영 파일 설치는 문서 수정 승인에 포함되지 않는다.
