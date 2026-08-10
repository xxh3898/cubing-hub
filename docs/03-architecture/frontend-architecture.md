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
  - docs/08-decisions/adr-0009-practice-event-capability.md
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

guest Timer history는 browser localStorage를 사용한다. authenticated Timer의 단일 pending solve는 user-scoped sessionStorage에만 보존한다. V2.1 Timer는 browser event를 직접 알지 않는 reducer/state machine과 browser orchestration을 분리한다.

## V2.1 Timer Core / Input Adapter

```text
Keyboard Adapter ─┐
                  ├→ Timer Core commands → reducer/state machine
Touch Adapter ────┘
```

- Pure `timerMachine` reducer는 idle, holding, ready, running, stopped 상태와 transition만 소유한다.
- `useCubeTimer` core hook은 reducer, hold timeout, injected clock provider와 requestAnimationFrame lifecycle을 조합한다. Default clock은 `performance.now()`다.
- Keyboard/Touch adapter는 browser event를 `PRESS`, `RELEASE`, `CANCEL` command와 KEYBOARD·TOUCH provenance로 변환한다. UNKNOWN은 legacy 또는 provenance 없는 Record의 normalized 의미이며 adapter가 hardware value처럼 발행하지 않는다. Internal `HOLD_READY`, `TICK`, `RESET`은 core가 처리한다.
- Reducer는 browser global을 직접 읽지 않고 hook이 읽은 monotonic `now`를 event payload로 받는다.
- solve를 시작한 initial press provenance를 stopped snapshot까지 유지하고, stop adapter는 provenance를 바꾸지 않는다.
- RAF는 running 표시만 갱신한다. Stop에서는 elapsed를 `Math.round()`한 integer millisecond로 한 번 확정하고 stopped rendering, guest save, pending snapshot과 request가 같은 값을 사용한다.
- create 성공 뒤 server의 canonical Record 표현을 사용하고 effective time을 page에서 다시 계산하지 않는다.

V2.1은 generic `DeviceAdapter<T>`, connection state, WebSerial, WebBluetooth abstraction을 만들지 않는다. Future adapter는 같은 semantic command를 호출할 수 있는 경계만 사용한다.

## Event capability consumer

Frontend label 목록은 EventType 표현을 유지하되 각 option에 `supported` boolean을 반복하지 않는다. `SUPPORTED_PRACTICE_EVENT_TYPES = new Set(['WCA_333'])` 같은 한 client constant와 helper를 사용한다. Backend capability가 authority이며 미지원 request를 최종 거절한다.

지원 event가 하나인 V2.1에서는 별도 capability endpoint를 만들지 않는다. Event가 늘거나 runtime discovery 요구가 생기면 그때 server-provided catalog를 검토한다.

## Pending solve boundary

- solve stop에서 browser-native `crypto.randomUUID()`로 UUID v4를 생성한다. ID는 ordering에 사용하지 않으며 UUID v7·ULID dependency를 추가하지 않는다.
- authenticated Timer는 `cubing-hub.timer.pending.v1:<userId>`처럼 user-scoped key로 한 건의 pending solve를 sessionStorage에서 복구한다.
- versioned snapshot에는 userId, eventType, canonical timeMs, penalty, scramble, Input Method, clientSubmissionId와 recovery용 savedAt을 보존한다.
- POST 전에 snapshot을 저장하고 canonical response를 받은 뒤에만 삭제한다. Network failure에서는 유지한다.
- reload에서 유효한 pending을 발견하면 stopped solve로 보여 주고 사용자가 retry 또는 discard한다. 자동 submit하지 않는다.
- retry는 같은 client submission identity를 유지해 같은 server operation을 가리킨다. Response가 유실된 이미 저장된 solve도 server replay 뒤 정리된다.
- access token, refresh token, credential은 browser storage에 저장하지 않는다.
- 현재 userId가 key와 snapshot에 모두 일치할 때만 복구한다. Logout·session clear는 현재 user key를 제거하고 다른 account key를 읽지 않는다.
- malformed JSON, unknown schema version, invalid event·time·UUID는 server에 제출하지 않고 recoverable notice와 explicit discard로 처리한다.
- arbitrary time expiry는 두지 않는다. sessionStorage lifecycle과 explicit discard가 stale pending 경계이며 savedAt은 occurrence timestamp가 아니다.
- 여러 solve를 쌓는 offline queue와 background sync는 V2.1 범위가 아니다.

## Future input boundary

Stackmat과 Smart Timer는 future input adapter 후보지만 실제 device protocol, browser permission, disconnect UX는 V2.1에서 구현하지 않는다.

Smart Cube는 Timer input 외에도 move sequence, phase, TPS, pause, analysis, evidence 역할을 가질 수 있다. telemetry와 analysis를 Timer state나 Practice Record browser model에 직접 넣지 않는다.

## 검증

route protection, loading·error, API integration branch와 화면별 동작은 인접 Vitest test로 검증한다. Timer Core transition, adapter provenance, canonical millisecond, pending recovery, idempotent retry consumer flow를 focused test 대상으로 추가한다.

Endpoint payload shape의 기준은 frontend mock가 아니라 Spring REST Docs다.
