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
  - docs/05-api/README.md
---
# Backend Architecture

## Package 구조

- domain/*/controller: HTTP와 인증 principal 경계
- domain/*/service: use case, transaction, 권한·domain rule
- domain/*/repository: JPA, Querydsl, native query, Redis access
- domain/*/entity: MySQL persistence model
- domain/post/storage: post image binary adapter
- security: JWT filter, token provider, user details
- config: Security, CORS, JPA, properties
- common: response, exception, validation, utility
- ops: 운영용 제한된 lifecycle entrypoint

## 주요 패턴

- 읽기 service는 기본 read-only transaction을 사용하고 mutation만 쓰기 transaction을 연다.
- controller response는 ApiResponse envelope를 사용한다.
- validation annotation과 service domain validation을 함께 사용한다.
- ownership은 server에서 현재 user와 resource owner를 비교한다.
- ranking 조회는 MySQL repository와 Redis repository를 service에서 선택한다.

## Integration

- SMTP adapter는 email verification과 password reset에 사용한다.
- Discord webhook adapter는 feedback 운영 알림에 사용한다.
- local post image storage는 configurable root와 public base URL을 사용한다.

## Source of Truth

- endpoint request·response: backend REST Docs test와 backend/src/docs/asciidoc
- schema: Flyway migration
- current behavior: production code와 focused test
- architecture 설명: 이 영역 문서

새 domain을 추가할 때 기존 package 경계와 transaction·authorization 책임을 먼저 검토한다.
