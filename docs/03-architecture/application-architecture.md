---
doc_type: architecture
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/backend-architecture.md
  - docs/03-architecture/frontend-architecture.md
---
# Application Architecture

## 형태

- frontend: React + Vite single-page application
- backend: Java 17 + Spring Boot modular monolith
- interface: HTTP REST, JSON과 community image용 multipart
- data: MySQL 8, Redis 7.2, host filesystem
- contract documentation: Spring REST Docs

## Request 흐름

1. React route가 page와 AuthContext 상태를 결정한다.
2. apiClient가 memory access token을 Authorization header에 추가한다.
3. Spring Security가 token과 role을 확인한다.
4. controller가 request validation과 response boundary를 제공한다.
5. domain service가 transaction과 domain rule을 적용한다.
6. repository 또는 storage adapter가 MySQL, Redis, filesystem을 사용한다.
7. ApiResponse envelope로 결과 또는 error를 반환한다.

## Domain 경계

backend는 auth, user, record, home, post, feedback, adminmemo domain package를 갖는다. common, config, security, ops는 횡단 관심사를 맡는다.

## 정합성 원칙

- business mutation은 MySQL transaction을 우선한다.
- Redis ranking sync는 PB 변화에 따라 수행하고 재구축 경로를 유지한다.
- filesystem image와 DB metadata의 failure boundary를 명시적으로 다룬다.
- generated endpoint 계약을 수동 Markdown 표로 복제하지 않는다.

## 변경 규칙

공개 API, schema, auth, storage, deployment unit을 바꿀 때 해당 architecture·data·quality 문서와 test를 같은 변경 단위에서 검토한다.
