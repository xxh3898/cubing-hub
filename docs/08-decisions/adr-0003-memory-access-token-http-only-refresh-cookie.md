---
doc_type: adr
status: accepted
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/auth-security.md
---
# ADR-0003 memory Access Token과 HttpOnly Refresh Cookie 사용

## Context

SPA에서 인증을 유지하면서 JavaScript에 장기 token을 노출하는 위험을 줄이고, page reload 뒤 session 복구와 API 인증을 지원해야 한다.

## Decision

access token은 frontend module memory에만 저장해 Bearer header로 전송한다. refresh token은 HttpOnly, SameSite=Strict cookie로 전송하고 server-side Redis entry와 rotation으로 검증한다.

## Alternatives

- access·refresh token을 localStorage에 저장
- 두 token을 모두 JavaScript-readable cookie에 저장
- server-side traditional session만 사용
- access token까지 HttpOnly cookie로 사용

## Consequences

- persistent browser storage에 access token이 남지 않는다.
- reload마다 refresh bootstrap이 필요하다.
- concurrent 401은 하나의 refresh request를 공유해야 한다.
- cookie path, CORS, SameSite, Secure 설정이 login·recovery 동작에 직접 영향을 준다.
- logout blacklist와 refresh token reuse 대응을 Redis에서 관리한다.
