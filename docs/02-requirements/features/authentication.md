---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/auth-security.md
---
# Authentication

## 현재 사용자 가치

사용자는 이메일을 검증해 계정을 만들고, login 상태로 개인 기록·글·feedback을 관리하며, 비밀번호를 잊었을 때 계정을 복구할 수 있다.

## 현재 동작

- 이메일 인증번호 요청과 확인
- 인증 완료 후 signup
- login, access token refresh, logout
- browser bootstrap 시 현재 사용자 조회
- 이메일 인증을 재사용한 password reset
- malformed refresh cookie를 지우는 session recovery
- USER와 ADMIN 역할 기반 route·API 제한

## 요구사항

- access token이 만료돼도 유효한 refresh session이면 한 번 갱신 후 원래 요청을 재시도할 수 있어야 한다.
- refresh token은 rotation되며 재사용되거나 logout된 token은 유효하지 않아야 한다.
- login·signup 화면은 이미 인증된 사용자를 일반 화면으로 보낸다.
- 비밀번호 변경, profile 변경, 개인 데이터 변경은 인증과 소유권을 확인한다.
- 인증 실패 원인이 secret 또는 token 원문을 노출해서는 안 된다.

세부 token lifecycle과 cookie 경계는 [auth security](../../03-architecture/auth-security.md)가 Source of Truth다.
