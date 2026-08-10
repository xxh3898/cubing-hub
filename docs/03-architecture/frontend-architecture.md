---
doc_type: architecture
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/02-requirements/user-flows.md
  - docs/02-requirements/features/timer.md
  - docs/03-architecture/auth-security.md
  - docs/08-decisions/adr-0007-canonical-timer-time-input-provenance.md
  - docs/08-decisions/adr-0008-record-submission-idempotency.md
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

## 현재 Timer와 local state

guest Timer history는 browser localStorage를 사용한다. keyboard와 pointer 입력은 한 hook의 Timer 상태 전이를 공유한다. 현재 상태, clock, keyboard, touch 처리와 animation 책임은 완전히 분리되어 있지 않다.

## V2.1 Timer 목표 구조

아래는 사용자 승인된 구현 목표이며 현재 frontend에는 아직 반영되지 않았다.

```text
Timer Core
← Keyboard Adapter
← Touch Adapter
```

- Timer Core는 device-neutral 상태 전이와 canonical stop 결과를 책임진다.
- Keyboard/Touch adapter는 input event와 Input Method provenance를 전달한다.
- elapsed measurement는 `performance.now()`를 사용한다.
- stop에서 `Math.round()`한 integer millisecond를 canonical value로 한 번 확정한다.
- 정지 이후 표시와 API payload는 같은 canonical value를 사용한다.
- create 성공 뒤 server의 canonical Record 표현을 사용하고 effective time을 page에서 다시 계산하지 않는다.

## Pending solve boundary

- authenticated Timer는 한 건의 pending solve를 sessionStorage에서 복구할 수 있게 한다.
- pending solve는 client submission identity를 유지해 retry가 같은 server operation을 가리키게 한다.
- access token, refresh token, credential은 browser storage에 저장하지 않는다.
- 사용자 전환이나 logout에서 다른 account의 pending solve가 제출되지 않도록 scope를 검증한다.
- 여러 solve를 쌓는 offline queue와 background sync는 V2.1 범위가 아니다.

## Future input boundary

Stackmat과 Smart Timer는 future input adapter 후보지만 실제 device protocol, browser permission, disconnect UX는 V2.1에서 구현하지 않는다.

Smart Cube는 Timer input 외에도 move sequence, phase, TPS, pause, analysis, evidence 역할을 가질 수 있다. telemetry와 analysis를 Timer state나 Practice Record browser model에 직접 넣지 않는다.

## 검증

route protection, loading·error, API integration branch와 화면별 동작은 인접 Vitest test로 검증한다. Timer Core transition, adapter provenance, canonical millisecond, pending recovery, idempotent retry consumer flow를 focused test 대상으로 추가한다.

Endpoint payload shape의 기준은 frontend mock가 아니라 Spring REST Docs다.
