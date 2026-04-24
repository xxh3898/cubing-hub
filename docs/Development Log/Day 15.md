# Development Log - 2026-04-13

프로젝트: Cubing Hub

---

> 후속 결정 메모 (2026-04-13): 이 문서 시점 구현은 여전히 `authStorage` + `localStorage` 기반 access token 보관 구조였다.
> 이후 `2026-04-14` 계획에서 `Access Token = 메모리`, `Refresh Token = HttpOnly cookie`로 전환하기로 확정했다.

---

## 오늘 작업

- 백엔드 인증 영역에 `GET /api/me`를 추가하고 현재 로그인 사용자 컨텍스트를 조회할 수 있게 구현
- `refresh_token` cookie의 `Secure` 속성을 환경 설정 기반으로 분기하도록 정리
- 프런트 `AuthContext`, `authStorage`, `apiClient`를 실제 인증 흐름에 맞게 개편
- 로그인/회원가입/로그아웃, 보호 라우트, 비로그인 전용 라우트, 로그인 후 복귀, `401 -> refresh -> retry` 흐름을 실제 동작 기반으로 연동
- REST Docs, 일정표, 작업 허브, 리뷰 문서를 `2026-04-13` 결과에 맞게 갱신

---

## 핵심 구현 상세

### `/api/me`와 전역 사용자 컨텍스트 도입

#### 문제 상황
- 로그인 응답에는 `accessToken`만 있고 닉네임이 없어 헤더와 전역 auth-aware UI가 mock 데이터에 의존하고 있었다.
- 마이페이지 상세 API를 `2026-04-13`에 함께 구현하면 작업 범위가 불필요하게 커진다.

#### 해결 방법
- 백엔드에 `GET /api/me`를 추가해 `userId`, `email`, `nickname`만 반환하는 경량 사용자 컨텍스트 API를 만들었다.
- 프런트 `AuthContext`는 access token이 생기면 `/api/me`를 조회하고, 성공 시 현재 사용자 상태를 유지하도록 바꿨다.
- 헤더 계정 chip은 mock 닉네임 대신 `/api/me.nickname`을 사용하도록 전환했다.

#### 선택 이유
- 로그인 응답을 과도하게 키우지 않으면서도 헤더와 전역 인증 상태를 실제 데이터로 맞출 수 있다.
- 향후 `/api/users/me/profile` 같은 상세 프로필 API와 역할을 분리할 수 있다.

#### 결과
- 헤더와 보호 라우트 판단이 더 이상 mock 데이터에 의존하지 않게 되었다.
- `/api/me` 실패 시 세션 정리 대체 처리를 적용할 수 있는 기반이 마련됐다.

### refresh 재발급과 같은 탭 안의 인증 상태 동기화 정리

#### 문제 상황
- 기존 프런트는 `localStorage`에 토큰만 저장하고 있었고, 만료 token에서 자동 refresh/retry가 없었다.
- interceptor에서 토큰이 바뀌더라도 React 상태가 즉시 따라오지 않으면 UI와 실제 인증 상태가 어긋날 수 있었다.

#### 해결 방법
- `authStorage`에 같은 탭 안의 구독 메커니즘을 추가해 토큰 변경을 `AuthContext`가 즉시 구독하도록 만들었다.
- `apiClient`에 Authorization 자동 부착, `401 -> refresh -> retry`, 단일 in-flight refresh 공유 로직을 넣었다.
- refresh 성공 후 저장된 access token을 갱신하고, `AuthContext`가 `/api/me`를 다시 조회해 사용자 컨텍스트를 맞추도록 구성했다.

#### 선택 이유
- 개별 API 함수마다 재발급 로직을 넣는 대신 `apiClient` 한 곳에서 처리해야 중복이 줄고 이후 실연동 화면도 재사용할 수 있다.
- 동시에 여러 요청이 `401`을 받을 수 있으므로 queue 기반 단일 refresh 공유가 필요했다.

#### 결과
- `2026-04-13` 범위의 토큰 만료 UX 핵심 경로 구현이 완료되었다.
- 세션 복구 실패 시 로컬 인증 상태를 정리하는 정책도 함께 확정되었다.

### 보호 라우트, 비로그인 전용 라우트, 인증 화면 실제 연동

#### 문제 상황
- `LoginPage`, `SignupPage`, `MyPage`는 모두 목업 동작이었고 `/mypage`, `/community/write`는 누구나 진입 가능한 상태였다.
- 로그인 후 원래 화면 복귀나 이미 로그인한 사용자의 `/login`, `/signup` 재진입 처리도 없었다.

#### 해결 방법
- `LoginPage`와 `SignupPage`를 실제 `/api/auth/*` 호출로 전환하고, 로딩/오류 메시지와 리다이렉트 state를 추가했다.
- `App.jsx`에 보호 라우트와 비로그인 전용 라우트를 넣어 `/mypage`, `/community/write`, `/login`, `/signup` 흐름을 정리했다.
- `MyPage` 로그아웃은 `/api/auth/logout`을 호출하되, 실패 여부와 무관하게 `finally`에서 로컬 인증 상태를 정리하도록 바꿨다.
- `CommunityDetailPage`에는 비로그인 댓글 작성 CTA를 추가하고 댓글 입력 폼을 인증 상태에 따라 분기했다.

#### 결과
- 인증 화면이 실제 백엔드 계약과 연동되었다.
- 보호 경로 직접 진입, 로그인 후 복귀, 비로그인 전용 경로 차단의 기본 UX가 정립되었다.

### `Secure` cookie 설정 분기와 문서화

#### 문제 상황
- `AuthController`가 `secure(true)`를 상시 사용하고 있어, 로컬 `http://localhost` 환경에서는 refresh/logout 검증이 차단될 가능성이 있었다.

#### 해결 방법
- `auth.refresh-cookie.secure` 설정을 `application-local.yaml`, `application-prod.yaml`, `application-test.yaml`에 추가했다.
- `AuthController`는 이 설정값을 읽어 login/refresh/logout cookie 생성에 공통 적용하도록 정리했다.
- `/api/me`와 함께 당시 인증 문서화 테스트와 REST Docs, AsciiDoc 인덱스를 갱신했다.
- 현재 코드 기준으로 해당 문서화 테스트는 `AuthDocsTest`, `UserContextDocsTest`로 분리되어 있다.

#### 결과
- local/prod/test 환경별 cookie 정책을 설정으로 다룰 수 있게 됐다.
- `2026-04-13`에 요구한 인증 설계와 테스트 문서가 코드와 같이 움직이도록 맞췄다.

---

## 사용 기술

- Spring Boot
- Spring Security
- Redis Refresh Token Rotation
- React
- React Router
- Axios Interceptor
- REST Docs

---

## 검증

- `cd backend && ./gradlew test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

정적 검증은 모두 통과했다.

### 사용자 수동 검증 결과

- 회원가입 -> 로그인 -> 보호 route 접근 -> 원래 경로 복귀 흐름 확인 완료
- `401` 상황의 refresh -> retry -> 실패 대체 처리 흐름 확인 완료
- 로그인 후 `/timer` 기록 저장, 로그아웃, 비로그인 상태 보호 route 직접 접근 차단 동작 확인
- local `http://localhost` 환경에서 `refresh_token` cookie 저장과 `Secure` 설정 분기 동작 확인 완료

위 브라우저 수동 검증은 사용자 확인 결과를 기준으로 반영했다.

---

## 다음 작업

- `2026-04-14` 랭킹 계약 확장과 프런트 실연동 준비
- 마이페이지 상세 프로필/통계 API와 `/api/users/me/profile` 경계 정리
