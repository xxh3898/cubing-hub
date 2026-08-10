---
doc_type: architecture
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/02-requirements/user-flows.md
  - docs/03-architecture/auth-security.md
---
# Frontend Architecture

## 구조

React SPA는 pages, components, context, hooks, lib, utils, constants, styles로 구성된다. Vite가 build하고 production Web image의 Nginx가 정적 asset과 SPA route를 제공한다.

## Route 경계

- public: home, timer, rankings, learning, community read, Q&A, password reset
- guest-only: login, signup
- authenticated: community write·edit, MyPage, feedback
- ADMIN: admin dashboard, feedback detail, memo detail

ProtectedRoute와 AdminRoute가 화면 접근을 제어하지만 server authorization을 대체하지 않는다.

## State와 API

- AuthContext가 bootstrap, current user, login 상태를 관리한다.
- access token은 module memory store에만 둔다.
- apiClient는 credential cookie를 포함하고 401에서 단일 공유 refresh 요청을 수행한 뒤 대기 요청을 재시도한다.
- multipart request는 browser가 boundary를 설정하도록 기본 Content-Type을 제거한다.
- page는 api module을 통해 backend endpoint를 호출한다.

## Timer와 local state

guest timer history는 browser localStorage를 사용할 수 있으나 access token은 localStorage에 저장하지 않는다. keyboard와 pointer 입력은 같은 timer 상태 machine을 공유한다.

## 검증

route protection, loading·error, API integration branch와 화면별 동작은 인접 Vitest test로 검증한다. endpoint payload shape의 기준은 frontend mock가 아니라 Spring REST Docs다.
