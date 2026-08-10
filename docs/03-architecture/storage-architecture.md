---
doc_type: architecture
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/04-data/data-dictionary.md
  - docs/07-operations/backup-restore.md
---
# Storage Architecture

## MySQL

계정, solve, PB, 게시글·댓글, attachment metadata, view, feedback, admin memo의 Source of Truth다. schema는 Flyway migration이 관리한다.

## Redis

refresh session, access blacklist, email verification·password reset temporary state와 ranking Read Model을 저장한다. ranking은 재구축할 수 있지만 auth temporary state는 손실 시 사용자 session·진행 중 verification에 영향을 준다.

## Post image storage

- API: configured host directory를 /data/post-images에 read-write mount
- Web: 같은 directory를 read-only mount
- Nginx: /uploads 경로로 공개
- MySQL post_attachments: object_key, image_url, content type, file size, display order 등 metadata

binary와 metadata는 서로 다른 storage에 있으므로 create·update·delete failure와 backup에서 정합성을 확인한다.

## Backup 단위

MySQL logical dump와 post image snapshot을 같은 backup set으로 취급한다. post_attachments.object_key와 실제 file을 대조하고 file count, total size, SHA-256 manifest를 검증한다. Redis는 현재 backup set에서 제외되며 ranking은 rebuild한다.

## 금지 가정

- running MySQL raw volume copy만을 정상 backup으로 보지 않는다.
- image URL이 존재한다고 binary가 존재한다고 가정하지 않는다.
- Redis 손실이 모든 기능에 무해하다고 가정하지 않는다.
