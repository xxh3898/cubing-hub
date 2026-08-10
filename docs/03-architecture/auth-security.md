---
doc_type: architecture
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/02-requirements/features/authentication.md
  - docs/04-data/redis-model.md
  - docs/08-decisions/adr-0003-memory-access-token-http-only-refresh-cookie.md
---
# Auth and Security

## Token 저장 경계

- access token: React module memory, Bearer header
- refresh token: HttpOnly, SameSite=Strict cookie
- production refresh cookie: Secure
- cookie path: /api/auth

새로고침 뒤 access token은 사라지고 refresh cookie로 session을 bootstrap한다.

## Login과 Refresh

1. server가 access·refresh JWT를 발급한다.
2. refresh token은 email과 jti를 포함한 Redis key에 TTL로 저장한다.
3. client는 access token만 response body에서 받아 memory에 둔다.
4. refresh 요청은 JWT 유효성과 Redis 저장값 일치를 모두 확인한다.
5. 성공하면 기존 refresh entry를 제거하고 새 token pair로 rotation한다.
6. Redis 불일치는 재사용 의심으로 보고 해당 email의 refresh entries를 제거한다.

## Logout과 Recovery

logout은 가능한 경우 refresh entry를 제거하고 access token의 남은 수명 동안 Redis blacklist에 둔다. cookie는 같은 path 속성으로 만료한다.

cookie path 밖의 login bootstrap이 malformed cookie로 막힐 수 있어 /api/session/clear-refresh-cookie recovery endpoint가 존재한다. 이 endpoint는 인증 우회가 아니라 cookie 제거만 수행한다.

## Email verification과 Password reset

인증 code, resend cooldown, verified marker, reset code는 Redis TTL data다. password reset 성공 시 해당 사용자의 refresh entries를 제거한다.

## Authorization

Spring Security가 public endpoint와 인증 endpoint를 구분하며 ADMIN operation은 role을 검증한다. 글·댓글·record 변경은 role 외에도 ownership을 service에서 확인한다.

## 위험과 운영 원칙

- token·code·password·cookie 원문을 log나 문서에 남기지 않는다.
- Redis 손실은 ranking뿐 아니라 session·verification에도 영향을 준다.
- cookie domain, path, SameSite, CORS 변경은 browser flow와 security test를 함께 검토한다.
