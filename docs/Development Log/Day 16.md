# Development Log - 2026-04-14

프로젝트: Cubing Hub

---

## 오늘 작업

- 백엔드 테스트 공통 베이스를 `JpaIntegrationTest`, `HttpIntegrationTest`, `RedisIntegrationTest`, `RestDocsIntegrationTest`로 역할 분리
- `AuthDocsTest` 책임 축소와 `AuthControllerIntegrationTest` 추가로 인증 문서화/기능 검증 분리
- `MissingRequestCookieException`를 `400 Bad Request`로 매핑하고 `refresh_token` 누락 계약과 관련 문서 동기화
- Rotation 이후 이전 Refresh Token 재사용 `401` HTTP 계약과 REST Docs 대표 예시 추가, `docs/` 문서 동기화
- root `.env.example`, `application-local.yaml`, `docker-compose.yml` 기준으로 local secret/env 분리와 README/배포 문서 동기화
- React에 `Vitest`, `Testing Library`, `jsdom`, `axios-mock-adapter`, 공통 setup, 스모크 테스트 추가
- GitHub Actions에서 generated REST Docs HTML을 `restdocs-site` artifact로 다운로드 가능하게 정리
- 랭킹 V1 조회 원본을 `records`에서 `user_pbs` 기반 PB 조회로 전환하고 검색/페이지네이션 계약을 추가
- `PATCH` / `DELETE /api/records/{recordId}`, `GET /api/users/me/profile`, `GET /api/users/me/records`를 추가하고 PB 재계산 규칙을 정리
- `RankingsPage`, `TimerPage`, `MyPage`를 실제 API와 연결하고 랭킹/기록 관리 프런트 테스트를 추가
- 랭킹/마이페이지 관련 설계 문서, 일정 문서, 허브 로그를 현재 구현 상태와 맞게 동기화

---

## 핵심 구현 상세

### 테스트 공통 베이스와 통합 테스트 역할 재편

#### 문제 상황
- 기존 `BaseIntegrationTest`와 `RestDocsBaseTest` 구조는 JPA, HTTP, Redis, REST Docs 성격이 섞여 있었다.
- 특히 `@Transactional`이 HTTP/Redis까지 안전하게 격리해 주는 것처럼 보이지만 실제로는 그렇지 않아 테스트 책임과 격리 모델이 불명확했다.

#### 해결 방법
- 테스트 공통 베이스를 `JpaIntegrationTest`, `HttpIntegrationTest`, `RedisIntegrationTest`, `RestDocsIntegrationTest`로 분리했다.
- 보안 테스트는 `SecurityAccessControlIntegrationTest`와 `SecurityCorsIntegrationTest`로 나눴다.
- Post/Record/Ranking 기능 검증은 controller integration test와 repository integration test로 분리하고, REST Docs 테스트는 문서화 책임 중심으로 축소했다.

#### 선택 이유
- 테스트 실패 위치를 더 빠르게 특정하려면 JPA/HTTP/Redis/REST Docs 책임을 분리하는 편이 낫다.
- 느린 문서화 테스트에 기능 검증이 몰려 있으면 회귀가 늦게 드러난다.

#### 판단 근거
- 테스트 리뷰에서 `@Transactional + RANDOM_PORT` 조합의 격리 허점과 REST Docs 테스트의 혼합 책임이 실제 문제로 확인됐다.
- 구조 분리 후 `./gradlew test`, `./gradlew cleanTest test --rerun-tasks`가 모두 통과했다.

#### 트레이드오프
- 공통 베이스 클래스와 통합 테스트 클래스 수가 늘어난다.
- 대신 테스트 의도와 실패 위치는 더 분명해진다.

#### 결과
- 테스트 역할이 `단위 / controller integration / repository integration / docs / infra`로 더 명확해졌다.
- 보안/CORS/Redis/문서화 검증이 각자 맞는 계층으로 이동했다.

#### 문서 반영
- 반영한 문서:
  - `docs/dev-log.md`
  - `docs/Internal Schedule.internal.md`
  - `docs/Project Schedule.md`
- 반영 내용:
  - `2026-04-14` 진행 상태와 테스트 구조 재편 결과 반영

#### 면접 예상 질문
- 왜 테스트 공통 베이스를 역할별로 나눴는가
- 왜 REST Docs 테스트와 기능 검증을 분리했는가

#### 한 줄 요약
- 테스트 공통 베이스 분리로 격리 모델과 실패 위치를 현재 코드 구조에 맞게 다시 정렬했다.

### Auth 문서화 테스트와 기능 검증 분리

#### 문제 상황
- `AuthDocsTest`가 문서 스니펫 생성, HTTP 응답 검증, Redis side effect 검증을 동시에 수행하고 있었다.
- 이 구조에서는 인증 문서화 테스트가 깨졌을 때 API 계약 문제인지 Redis side effect 문제인지 바로 구분하기 어려웠다.

#### 해결 방법
- `AuthDocsTest`에서 Redis/DB side effect assertion을 제거하고 REST Docs + HTTP 응답 계약 검증만 남겼다.
- `AuthControllerIntegrationTest`를 추가해 `signup`, `login`, `refresh`, `logout`의 HTTP 흐름과 Redis 저장/삭제/rotation을 검증하게 했다.
- `AuthServiceTest`와 `RefreshTokenServiceIntegrationTest`에도 누락 분기와 TTL 검증 개선을 반영했다.

#### 선택 이유
- 인증 도메인은 회귀 영향이 크기 때문에 빠른 단위 테스트와 명확한 통합 테스트 경계가 필요하다.
- 문서화 테스트는 문서 산출과 계약 확인에 집중하는 편이 유지비가 낮다.

#### 판단 근거
- 기존 코드에서 `AuthDocsTest`는 고정 email과 Redis 조회를 같이 사용하고 있었다.
- 분리 후 `AuthControllerIntegrationTest`가 `refresh_token` 저장/삭제/rotation을 별도 검증하고, `AuthDocsTest`는 문서 스니펫만 담당하게 됐다.

#### 트레이드오프
- 인증 테스트 클래스 수는 늘어난다.
- 대신 Redis side effect와 문서 스니펫 실패를 서로 다른 테스트에서 확인할 수 있다.

#### 결과
- 인증 문서화 테스트와 기능 검증 테스트의 책임이 분리됐다.
- `refresh_token` 누락, malformed token, logout without cookie 같은 경계 케이스도 별도 통합 테스트로 확인하게 됐다.

#### 문서 반영
- 반영한 문서:
  - `docs/API Specification.md`
  - `docs/Authentication & Authorization Design.md`
- 반영 내용:
  - auth refresh 요청의 cookie 계약과 예외 응답 현재 상태 반영

#### 면접 예상 질문
- 왜 `AuthDocsTest`를 docs-only 테스트로 줄였는가
- `AuthControllerIntegrationTest`를 새로 만든 이유는 무엇인가

#### 한 줄 요약
- 인증 도메인 테스트를 문서화 책임과 실제 기능 검증 책임으로 분리해 회귀 탐지 속도를 높였다.

### `refresh_token` 누락 요청의 500 -> 400 보정

#### 문제 상황
- `/api/auth/refresh`에 `refresh_token` cookie가 없으면 Spring이 `MissingRequestCookieException`를 던졌고, 기존 전역 예외 처리에는 이 핸들러가 없었다.
- 그 결과 generic exception handler로 떨어져 `500 Internal Server Error`가 반환됐다.

#### 해결 방법
- `GlobalExceptionHandler`에 `MissingRequestCookieException` 핸들러를 추가했다.
- 현재 응답은 `400 Bad Request`, 메시지는 `refresh_token 쿠키가 필요합니다.`로 고정했다.
- `AuthControllerIntegrationTest`와 문서에도 같은 계약을 반영했다.

#### 선택 이유
- 컨트롤러 시그니처를 바꾸지 않고 입력 누락만 정확히 `400`으로 매핑하는 가장 작은 수정이다.
- Spring이 이미 검출한 request binding 오류를 컨트롤러에서 다시 `null` 체크할 이유가 없다.

#### 판단 근거
- 실제 테스트 실행에서 missing cookie 요청이 `500`으로 떨어지는 것을 확인했다.
- 핸들러 추가 후 `AuthControllerIntegrationTest`, 전체 `./gradlew test`, `./gradlew cleanTest test --rerun-tasks`가 통과했다.

#### 트레이드오프
- 특정 예외 메시지를 문서와 테스트에 같이 명시했으므로, 메시지를 바꾸면 문서와 테스트도 함께 수정해야 한다.

#### 결과
- auth refresh API의 잘못된 요청이 서버 내부 오류가 아니라 클라이언트 오류로 분류된다.
- 프런트가 처리할 auth 에러 계약이 더 명확해졌다.

#### 문서 반영
- 반영한 문서:
  - `docs/API Specification.md`
  - `docs/Authentication & Authorization Design.md`
  - `docs/dev-log.md`
- 반영 내용:
  - missing `refresh_token` cookie의 `400` 계약과 현재 작업 상태 반영

#### 면접 예상 질문
- 왜 `MissingRequestCookieException`를 별도 핸들링했는가
- 왜 `400`이 맞고 `401`이나 `500`이 아닌가

#### 한 줄 요약
- refresh cookie 누락을 `500`에서 `400`으로 보정해 auth 에러 계약을 실제 API 사용 관점에 맞췄다.

### Rotation 이후 이전 Refresh Token 재사용 `401` 계약 정렬

#### 문제 상황
- `AuthService`에는 refresh token 재사용 감지와 전체 토큰 삭제 로직이 이미 있었지만, HTTP 계약 테스트와 generated REST Docs 대표 예시는 없었다.
- 그 결과 사람이 읽는 스펙 문서와 실제 테스트 기반 문서에서 재사용 감지 `401`이 비어 있었다.

#### 해결 방법
- `AuthControllerIntegrationTest`에 `login -> refresh(rotation) -> 이전 refresh cookie 재사용` 흐름을 추가해 `401 Unauthorized`와 전체 Refresh Token 삭제를 검증했다.
- `AuthDocsTest`와 `index.adoc`에 같은 대표 실패 스니펫을 추가해 generated REST Docs에 노출되도록 했다.
- `docs/API Specification.md`, `docs/Authentication & Authorization Design.md`, `docs/dev-log.md`, `docs/Project Schedule.md`를 현재 계약에 맞게 동기화했다.

#### 선택 이유
- 재사용 감지는 malformed token `400`과 달리 세션 전체 정리와 재로그인을 요구하는 보안 시나리오라서, 프런트 분기와 운영 설명 모두에 대표 문서가 필요했다.
- rotation 이후 이전 token 재사용은 서비스 로직을 가장 직접적으로 재현하는 HTTP 수준 케이스다.

#### 판단 근거
- `AuthService.refresh(...)`는 Redis 저장 값 불일치 시 해당 사용자의 Refresh Token을 모두 삭제하고 `401`을 반환한다.
- login 후 한 번 refresh를 수행하면 이전 token은 JWT 자체는 유효하지만 Redis에는 더 이상 남아 있지 않아, 재사용 감지 분기를 안정적으로 재현할 수 있다.
- 추가 후 `./gradlew test`, `./gradlew asciidoctor`를 다시 통과했다.

#### 트레이드오프
- auth 문서 길이가 조금 늘어났다.
- 대신 refresh 실패가 `400` 입력 오류와 `401` 보안 위협 시나리오로 명확히 나뉘어 프런트와 문서 해석이 쉬워졌다.

#### 결과
- refresh 재사용 감지 `401`이 서비스 테스트만 있는 내부 규칙이 아니라 HTTP 계약과 generated REST Docs까지 닫힌 공개 동작이 됐다.
- auth 실패 응답의 코드, 테스트, REST Docs, 사람이 읽는 스펙 문서가 같은 기준으로 맞춰졌다.

#### 문서 반영
- 반영한 문서:
  - `docs/API Specification.md`
  - `docs/Authentication & Authorization Design.md`
  - `docs/dev-log.md`
  - `docs/Project Schedule.md`
- 반영 내용:
  - refresh 재사용 감지 `401`의 상태 코드, 메시지, 세션 정리 의미와 REST Docs 정렬 상태 반영

#### 면접 예상 질문
- 왜 refresh token 재사용 감지를 `400`이 아니라 `401`로 문서화했는가
- 왜 rotation 이후 이전 token 재사용으로 테스트를 구성했는가

#### 한 줄 요약
- refresh token 재사용 감지 `401`을 HTTP 계약, REST Docs, 스펙 문서까지 같은 의미로 정렬했다.

### local secret/basic password 하드코딩 제거

#### 문제 상황
- `application-local.yaml`에 local DB 비밀번호와 JWT secret이 직접 들어 있었다.
- `docker-compose.yml`에도 MySQL root 비밀번호와 Grafana 기본 비밀번호가 하드코딩돼 있었다.
- 이 값들은 local 개발용이라도 코드와 문서에 그대로 남겨 둘 이유가 없었다.

#### 해결 방법
- root `.env.example`를 추가하고 실제 값은 root `.env`로 분리하는 기준을 만들었다.
- `application-local.yaml`은 root `.env`에서 `LOCAL_DB_PASSWORD`, `LOCAL_JWT_SECRET`를 읽도록 변경했다.
- `docker-compose.yml`은 `LOCAL_DB_PASSWORD`, `LOCAL_GRAFANA_ADMIN_PASSWORD`를 사용하도록 변경했다.
- `README.md`, `Deployment & Infrastructure Design.md`, 일정/허브 문서에도 같은 local env 기준을 반영했다.

#### 선택 이유
- backend local 실행과 `docker compose`가 같은 값 소스를 공유해야 설정 중복이 줄어든다.
- local 편의용 값이라도 추적 파일에 직접 두면 이후 운영/보안 설명과 충돌한다.

#### 판단 근거
- 변경 전 코드와 문서에서 local DB 비밀번호, Grafana 기본 비밀번호, local JWT secret 문자열이 직접 노출되는 상태를 확인했다.
- 변경 후 root `.env.example` 기준으로 필요한 값 이름이 정리됐다.

#### 트레이드오프
- root `.env`가 없으면 local `docker compose`와 backend 실행이 바로 되지 않는다.
- 대신 누락 값이 더 빨리 드러나고, 실제 비밀값과 추적 파일 경계는 명확해진다.

#### 결과
- local DB password, JWT secret, Grafana 기본 비밀번호가 추적 파일에서 제거됐다.
- local 실행 방법과 local secret 위치가 코드, README, 배포 문서 기준으로 일치하게 됐다.

#### 문서 반영
- 반영한 문서:
  - `docs/Project Schedule.md`
  - `docs/Internal Schedule.internal.md`
  - `docs/Deployment & Infrastructure Design.md`
  - `docs/dev-log.md`
- 반영 내용:
  - `2026-04-14` secret/env 정리 완료 상태와 local `.env` 기준 반영

#### 면접 예상 질문
- 왜 local 비밀값도 코드에서 제거했는가
- 왜 root `.env`를 backend와 docker compose 공통 값 소스로 잡았는가

#### 한 줄 요약
- local secret을 root `.env`로 분리해 설정 값 출처와 추적 경계를 분명하게 만들었다.

### React auth 테스트 실행 환경 추가

#### 문제 상황
- `frontend/package.json`에는 테스트 러너가 없어서 React auth 회귀 테스트를 바로 작성할 수 없는 상태였다.
- `2026-04-14`에 `AuthContext`, `apiClient` refresh queue, 보호 route 회귀를 검증하려면 최소 실행 환경부터 먼저 필요했다.

#### 해결 방법
- `frontend/package.json`에 `vitest` 실행 스크립트와 테스트 관련 dev dependency를 추가했다.
- `frontend/vite.config.js`에 `jsdom`, `setupFiles` 기준 테스트 설정을 추가했다.
- `frontend/src/test/setup.js`에 `@testing-library/jest-dom/vitest`, cleanup 공통 setup을 추가했다.
- `frontend/src/test/smoke.test.jsx`로 최소 스모크 테스트를 추가해 환경이 실제로 실행되는지 확인했다.

#### 선택 이유
- 현재 React 앱은 `Vite` 기반이라 `Vitest`가 설정 마찰이 가장 적다.
- `apiClient` interceptor와 refresh queue 검증은 `axios-mock-adapter`가 있으면 테스트 구성이 단순해진다.

#### 판단 근거
- dependency 추가 후 `npm run test -- --run`이 실제로 통과했다.
- README와 허브 문서에도 같은 테스트 실행 경로를 반영했다.

#### 트레이드오프
- 테스트 러너와 jsdom 의존성만큼 React dev dependency가 늘어난다.
- 대신 다음 단계 auth 회귀 테스트는 바로 작성 가능한 상태가 된다.

#### 결과
- React auth 테스트 작성 전제 조건이 준비됐다.
- 현재는 스모크 테스트만 있고, 실제 `AuthContext`, `apiClient`, 라우트 회귀 테스트는 다음 단계 범위로 남아 있다.

#### 문서 반영
- 반영한 문서:
  - `docs/dev-log.md`
- 반영 내용:
  - React auth 테스트 실행 환경 추가 상태와 남은 회귀 테스트 본체 범위 반영

#### 면접 예상 질문
- 왜 React 테스트 러너로 `Vitest`를 골랐는가
- 왜 `axios-mock-adapter`를 같이 추가했는가

#### 한 줄 요약
- React auth 회귀 테스트 작성 전제인 `Vitest + Testing Library + jsdom + axios-mock-adapter` 실행 환경을 먼저 준비했다.

### React auth 회귀 테스트 추가

#### 문제 상황
- 메모리 access token 전환까지 끝난 뒤에도 `AuthContext` 초기 세션 복구, `apiClient` refresh queue, 보호/비로그인 전용 라우트 분기는 자동 회귀로 고정되지 않은 상태였다.
- 저장 전략과 route 판단 순서가 바뀐 직후라, 이후 JaCoCo나 다른 기능 작업 전에 핵심 auth 흐름을 먼저 테스트로 묶어둘 필요가 있었다.

#### 해결 방법
- `frontend/src/context/AuthContext.test.jsx`에 앱 초기 `refresh -> /api/me` 세션 복구 성공/실패 시나리오를 추가했다.
- `frontend/src/lib/apiClient.test.js`에 `axios-mock-adapter` 기반 `401 -> refresh -> retry` 동시 요청 queue와 refresh 실패 시 토큰 정리 시나리오를 추가했다.
- `frontend/src/App.test.jsx`에 보호 라우트 loading 분기, 비로그인 보호 라우트 차단, 로그인 사용자 비로그인 전용 라우트 차단 시나리오를 추가했다.

#### 선택 이유
- `AuthContext`는 React 상태와 `authStorage` 메모리 store를 함께 다루므로 provider 단위 테스트가 가장 직접적이다.
- `apiClient`는 interceptor와 queue가 핵심이라 mock 함수보다 HTTP 단위 mock이 더 읽기 쉽다.
- route 분기는 실제 `App.jsx`를 `MemoryRouter`로 렌더하는 편이 리다이렉트 흐름을 가장 적은 수정으로 검증할 수 있다.

#### 판단 근거
- `cd frontend && npm run test -- --run` 기준으로 `AuthContext`, `apiClient`, `App` 테스트가 모두 통과했다.
- `cd frontend && npm run lint`도 통과해 새 테스트 파일이 기존 lint 규칙과 충돌하지 않았다.

#### 트레이드오프
- React auth 테스트가 늘어나면서 실행 시간이 스모크 테스트만 있던 때보다 길어졌다.
- 대신 저장 전략, refresh queue, route 분기를 다음 작업에서도 바로 회귀 검증할 수 있게 됐다.

#### 결과
- `2026-04-14` 기준 React auth 최소 회귀 테스트 범위가 정리됐다.
- backend auth 계약은 기존 테스트 3종을 다시 실행해 이번 저장 전략 전환에서 추가 수정이 필요 없음을 확인했다.

#### 문서 반영
- 반영한 문서:
  - `docs/Project Overview.md`
  - `docs/API Specification.md`
  - `docs/Screen Specification.md`
  - `docs/Project Schedule.md`
  - `docs/Internal Schedule.internal.md`
  - `docs/dev-log.md`
- 반영 내용:
  - React auth 회귀 테스트 완료 상태와 `2026-04-14` 남은 범위를 JaCoCo만 남도록 정리

#### 면접 예상 질문
- 왜 `apiClient` 테스트에 `axios-mock-adapter`를 사용했는가
- 왜 route 테스트를 component export 추가 대신 `App` 통합 렌더로 검증했는가

#### 한 줄 요약
- 메모리 세션 복구, refresh queue, 보호 라우트 분기를 React 테스트로 고정해 `2026-04-14` auth 회귀 범위를 정리했다.

### JaCoCo 기준선 추가

#### 문제 상황
- backend는 `./gradlew test`와 REST Docs 흐름은 있었지만, 커버리지 리포트를 생성하거나 CI에서 수집하는 기준선이 없었다.
- `2026-04-14` 완료 기준에는 JaCoCo 기준선이 포함돼 있어서 최소 report 생성과 CI 업로드 흐름이 필요했다.

#### 해결 방법
- `backend/build.gradle`에 `jacoco` plugin과 `jacocoTestReport` 설정을 추가했다.
- XML, HTML 리포트를 모두 생성하도록 두고 CSV는 비활성화했다.
- `.github/workflows/ci.yml`의 테스트 step을 `./gradlew test jacocoTestReport --no-daemon`으로 바꾸고, JaCoCo 리포트 artifact 업로드 step을 추가했다.
- `README.md`에 로컬 실행 명령과 HTML 리포트 경로를 반영했다.

#### 선택 이유
- 현재 단계에서는 hard fail threshold보다 “실제로 측정 가능하고 CI에서 회수 가능한가”가 더 중요했다.
- `test` task에 자동 연결하지 않고 별도 `jacocoTestReport` task를 명시해 `bootRun`이나 일반 개발 루틴에 불필요한 부작용을 줄였다.

#### 판단 근거
- `cd backend && ./gradlew test jacocoTestReport`가 통과했고 `backend/build/reports/jacoco/test/html/index.html`과 `jacocoTestReport.xml`이 생성됐다.
- `cd backend && ./gradlew build -x test`도 그대로 통과해 기존 REST Docs 빌드 검증 흐름이 깨지지 않았다.

#### 트레이드오프
- CI artifact가 하나 더 늘어난다.
- 대신 커버리지 기준선 확인과 이후 threshold 도입 논의를 실제 리포트 기반으로 진행할 수 있다.

#### 결과
- `2026-04-14` 기준 JaCoCo report 생성과 CI 회수 흐름이 갖춰졌다.
- 커버리지 threshold 강제는 다음 단계 품질 정책 조정 대상으로 남겼다.

#### 문서 반영
- 반영한 문서:
  - `docs/Project Schedule.md`
  - `docs/Internal Schedule.internal.md`
  - `docs/dev-log.md`
- 반영 내용:
  - `2026-04-14` 완료 처리와 JaCoCo 기준선 도입 상태 반영

#### 면접 예상 질문
- 왜 JaCoCo threshold를 바로 강제하지 않았는가
- 왜 `test` task 자동 후처리 대신 CI와 README에 `jacocoTestReport` 실행을 명시했는가

#### 한 줄 요약
- JaCoCo report 생성과 CI artifact 업로드를 붙여 `2026-04-14` 커버리지 기준선을 실제로 측정 가능한 상태로 만들었다.

### REST Docs HTML artifact 추가

#### 문제 상황
- CI는 `./gradlew build -x test`로 generated REST Docs HTML을 만들고 있었지만, GitHub Actions artifact로는 올리지 않아 브라우저에서 바로 다운로드해 확인할 수 없었다.

#### 해결 방법
- `.github/workflows/ci.yml`에 `REST Docs HTML 업로드` step을 추가했다.
- 업로드 경로는 `backend/build/docs/asciidoc/`로 두고, artifact 이름은 `restdocs-site`로 고정했다.
- 업로드 조건은 `if: success()`로 제한해 문서 생성이 성공한 경우에만 HTML artifact를 남기도록 했다.
- `generated-snippets`는 제외하고, 리뷰에 직접 필요한 HTML만 업로드 대상으로 유지했다.

#### 선택 이유
- reviewers가 로컬 Asciidoctor 실행 없이 CI에서 생성된 최종 HTML을 바로 확인할 수 있어야 했다.
- snippets까지 올리면 artifact가 커지고 실제로 확인해야 할 대상이 분산된다.

#### 판단 근거
- workflow 기준 docs build 경로는 이미 `backend/build/docs/asciidoc/`로 고정돼 있었다.
- `cd backend && ./gradlew build -x test --no-daemon`가 통과하면 해당 경로에 HTML 문서가 생성된다.

#### 트레이드오프
- CI artifact가 하나 더 늘어난다.
- 대신 rendered docs 확인을 위해 로컬에서 다시 build할 필요가 줄어든다.

#### 결과
- GitHub Actions 성공 실행에서는 generated REST Docs HTML을 `restdocs-site` artifact로 직접 다운로드할 수 있게 됐다.
- JaCoCo report와 성격이 다른 “문서 렌더 결과”도 CI 산출물로 같이 회수할 수 있게 됐다.

#### 문서 반영
- 반영한 문서:
  - `docs/Deployment & Infrastructure Design.md`
  - `docs/dev-log.md`
- 반영 내용:
  - 현재 CI가 JaCoCo report와 REST Docs HTML artifact를 함께 회수한다는 상태 반영

#### 한 줄 요약
- CI가 generated REST Docs HTML까지 artifact로 보관해 rendered docs 확인 경로를 추가했다.

### JaCoCo 기준선 보정과 공통 로직 커버리지 보강

#### 문제 상황
- 초기 JaCoCo 리포트는 Querydsl generated `Q*` class까지 함께 집계해 `entity`, `common` 패키지가 실제보다 과소평가돼 보였다.
- 반대로 `ScrambleGenerator`, `GlobalExceptionHandler`처럼 실제로 비어 있던 순수 로직/예외 매핑 테스트는 별도로 보강이 필요했다.

#### 해결 방법
- `backend/build.gradle`의 `jacocoTestReport` 대상에서 generated `Q*` class를 패키지 한정으로 제외했다.
- 전역 `Q*` 제외는 `QuerydslConfig` 같은 실제 production class까지 잘못 빠질 수 있어 `domain/**/entity/Q*.class`, `common/Q*.class` 범위로 제한했다.
- `ScrambleGeneratorTest`, `GlobalExceptionHandlerTest`, `PostTest`를 추가해 순수 로직, 예외 응답 계약, 엔티티 생성자 분기를 보강했다.

#### 선택 이유
- 현재 단계에서는 hard gate보다 “리포트를 믿고 읽을 수 있는가”가 더 중요했다.
- `GlobalExceptionHandler`는 실제 주 인증 실패 경로가 아니더라도 standalone `MockMvc`로 계약을 저비용으로 고정할 수 있었다.
- `ScrambleGenerator`는 exact string 비교 대신 규칙 기반 assertion을 사용해 랜덤 테스트의 flaky risk를 줄였다.

#### 판단 근거
- `cd backend && ./gradlew test jacocoTestReport --no-daemon`가 통과했다.
- JaCoCo HTML 리포트 기준으로 `common.util`, `common.exception`, `domain.post.entity`, `domain.record.entity`, `domain.user.entity`, `common` 패키지는 모두 `100%`로 정리됐다.
- `com.cubinghub.config`는 `89%`로 남아 `QuerydslConfig`가 exclude 오진 없이 계속 집계되는 것도 확인했다.

#### 트레이드오프
- generated class coverage는 더 이상 측정하지 않으므로 숫자가 더 현실적이지만, “생성 코드까지 모두 측정한다”는 의미는 줄어든다.
- hard threshold는 이번에도 보류했기 때문에, 안정화된 기준선이 CI에서 며칠 유지되는지 추가 관찰이 필요하다.

#### 결과
- JaCoCo 리포트가 “generated class 왜곡”보다 “실제 production logic 검증 상태”를 더 직접 반영하게 됐다.
- `ScrambleGenerator`, `GlobalExceptionHandler`, `Post` 생성자 분기는 테스트로 고정됐고, `handleAuthenticationException` 계약도 함께 정리됐다.

#### 문서 반영
- 반영한 문서:
  - `docs/dev-log.md`
- 반영 내용:
  - `2026-04-14` JaCoCo 기준선 해석을 “도입”에서 “기준선 보정 완료”까지 확장

#### 면접 예상 질문
- 왜 JaCoCo에서 generated `Q*` class를 제외했는가
- 왜 hard gate보다 기준선 보정을 먼저 했는가
- 왜 `GlobalExceptionHandler`를 standalone `MockMvc`로 검증했는가

#### 한 줄 요약
- JaCoCo 기준선을 generated class 왜곡 없이 다시 읽을 수 있게 정리하고, 실제 비어 있던 공통 로직/예외 응답 테스트를 보강했다.

### auth 예외 로그 기준 정리

#### 문제 상황
- `2026-04-14` 체크리스트에는 `외부 응답 메시지와 내부 로그 메시지 분리`가 남아 있었지만, 실제 공통 예외 레이어와 보안 예외 응답은 JSON 응답만 만들고 운영 로그 기준이 거의 없었다.
- `401`, `403`, `404`, 비즈니스 규칙 위반 자체는 이미 코드와 테스트 근거가 있었지만, 내부 추적성이 부족해 체크리스트를 엄밀하게 닫기 어려웠다.

#### 해결 방법
- `GlobalExceptionHandler`에 logger를 추가하고 `CustomApiException`, `IllegalArgumentException`, `IllegalStateException`, validation 실패, cookie 누락, 인증 예외, generic 예외 처리에 내부 로그를 넣었다.
- `SecurityConfig`의 `authenticationEntryPoint`, `accessDeniedHandler`에도 method/path/status 기준 로그를 추가했다.
- 외부 응답 메시지는 기존 계약을 유지하고, 토큰 원문이나 요청 헤더 전체 같은 민감값은 로그에 남기지 않도록 제한했다.

#### 선택 이유
- 예상 가능한 예외는 `warn` 수준 요약 로그가 적절하고, 처리되지 않은 예외만 stack trace 포함 `error`로 남기는 편이 운영성과 노이즈 균형이 맞다.
- `2026-04-14` 목표는 응답 계약을 다시 흔드는 것이 아니라, 현재 계약을 유지한 채 추적성을 보강하는 데 있었다.

#### 판단 근거
- `cd backend && ./gradlew test`가 그대로 통과해 기존 응답 계약이 깨지지 않았다.
- 보호 API `401`, 로그인 실패 `401`, refresh `400/401`, 게시글 `403/404`는 기존 테스트와 문서화 근거를 그대로 유지했다.

#### 트레이드오프
- 예상 가능한 예외에도 warn 로그가 추가되어 로그량은 약간 늘어난다.
- 대신 운영 중 문제 발생 시 어떤 요청에서 어떤 계층 예외가 났는지 최소 단서가 남는다.

#### 결과
- `2026-04-14` 자동 검증 체크리스트 기준에서 `예외 체계 정리`, `외부 응답 메시지와 내부 로그 메시지 분리`, `React가 처리할 auth 에러 계약 확정`을 완료할 수 있는 상태가 됐다.
- 수동 검증 항목만 별도로 남겼다.

#### 문서 반영
- 반영한 문서:
  - `docs/Internal Schedule.internal.md`
  - `docs/dev-log.md`
- 반영 내용:
  - `2026-04-14` 비수동 항목 완료와 수동 검증 별도 대기 상태 반영

#### 면접 예상 질문
- 왜 예상 가능한 예외는 warn, 처리되지 않은 예외만 error로 남겼는가
- 왜 요청 헤더 전체 대신 method/path만 로그에 남겼는가

#### 한 줄 요약
- 외부 응답 계약은 유지하고 내부 예외 로그만 보강해 `2026-04-14` 자동 검증 체크리스트를 마감 가능한 상태로 만들었다.

### 수동 검증 완료

#### 검증 범위
- 로그인 직후 `/mypage` 새로고침 세션 복구
- `refresh_token` 누락 또는 잘못된 값 기준 복구 실패 세션 정리
- 비로그인 보호 route 접근 차단
- 권한 부족 `403` 응답 처리

#### 확인 방법
- 브라우저 DevTools `Network`, `Application > Cookies` 기준으로 로그인, refresh, `/api/me`, 보호 route 이동 흐름을 확인했다.
- 권한 부족 `403`은 사용자 A가 만든 게시글을 사용자 B가 수정하는 `curl` 시나리오로 재현했다.

#### 판단 근거
- 로그인 후 새로고침 시 `refresh -> /api/me` 순서로 세션이 복구되고 `/mypage`에 유지되는 것을 확인했다.
- `refresh_token` 누락과 잘못된 refresh token에서는 세션 복구가 실패하고 로그인 화면으로 정리되는 것을 확인했다.
- 비로그인 상태에서 `/mypage` 직접 접근 시 로그인 화면으로 이동하는 것을 확인했다.
- 다른 사용자의 게시글 수정 시 `403`과 `게시글 수정/삭제 권한이 없습니다.` 메시지를 확인했다.

#### 결과
- `2026-04-14` 체크리스트의 수동 검증 항목까지 모두 완료했다.
- 수동 기준으로도 auth 저장 전략 전환, refresh 실패 정리, 보호 route 차단, 권한 부족 응답 처리 흐름이 문제 없이 동작했다.

#### 문서 반영
- 반영한 문서:
  - `docs/Internal Schedule.internal.md`
  - `docs/Project Schedule.md`
  - `docs/dev-log.md`
- 반영 내용:
  - `2026-04-14` 수동 검증 완료와 전체 마감 상태 반영

#### 한 줄 요약
- 브라우저와 `curl` 기준 수동 검증까지 마쳐 `2026-04-14` auth 마감 조건을 실제 동작 기준으로도 확인했다.

---

## 사용 기술

- Spring Boot
- Spring Security
- Spring REST Docs
- JUnit 5
- MockMvc
- Testcontainers
- Redis

---

## 대표 코드

```java
@ExceptionHandler(MissingRequestCookieException.class)
public ResponseEntity<ApiResponse<Void>> handleMissingRequestCookieException(MissingRequestCookieException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(HttpStatus.BAD_REQUEST, ex.getCookieName() + " 쿠키가 필요합니다."));
}
```

설명:
- `refresh_token` 누락 요청을 generic `500`이 아니라 명시적 `400` 계약으로 고정한 핵심 코드다.

---

## 트러블슈팅 / 문제

- 문제:
  - `./gradlew test`와 `./gradlew cleanTest test --rerun-tasks`를 병렬로 돌렸을 때 XML 테스트 결과 파일 쓰기 충돌이 발생했다.
- 원인:
  - 두 Gradle 프로세스가 같은 `backend/build/test-results/test` 경로에 동시에 결과 파일을 쓰면서 충돌했다.
- 해결:
  - 테스트 검증을 순차 실행으로 다시 수행했다.
- 남은 리스크:
  - 동일 워킹트리에서 테스트 태스크를 병렬 실행하면 같은 유형의 충돌이 다시 날 수 있다.

---

## 랭킹 V1 정합성 마감

### `records` 기준 solve leaderboard -> `user_pbs` 기준 PB leaderboard 전환

- 문제:
  - 문서 최상위 의도는 사용자 대표 기록(PB) 랭킹인데, 실제 `GET /api/rankings`는 `records` 상위 solve 목록이라 같은 사용자가 여러 번 노출될 수 있었다.
- 해결:
  - V1 랭킹 조회를 `user_pbs` 기준으로 바꾸고, `nickname`, `page`, `size`를 받는 서버 페이지네이션 계약으로 정리했다.
  - 정렬 기준은 `best_time_ms asc -> record.created_at asc -> record.id asc`로 고정했다.
- 결과:
  - 랭킹 페이지에 같은 사용자가 같은 종목에서 중복 노출되지 않게 됐다.
  - `PLUS_TWO`를 반영한 PB 시간이 랭킹 정렬에도 그대로 반영된다.

### 기록 penalty 수정/삭제와 PB 재계산 흐름 추가

- 문제:
  - `Penalty.PLUS_TWO`와 `DNF`는 enum과 저장 필드만 있고, 사용자가 저장 후 수정하거나 삭제할 수 있는 API와 UI가 없었다.
- 해결:
  - `PATCH /api/records/{recordId}`와 `DELETE /api/records/{recordId}`를 추가했다.
  - penalty 변경이나 기록 삭제 후 현재 PB를 다시 계산하도록 `RecordService` 흐름을 정리했다.
  - `GET /api/users/me/profile`, `GET /api/users/me/records`를 추가해 마이페이지 프로필/요약과 전체 기록 조회를 분리했다.
- 결과:
  - `TimerPage`, `MyPage`에서 `PLUS_TWO`, `DNF`, 삭제를 수행하면 `user_pbs`, 랭킹, 마이페이지 요약이 같은 기준으로 갱신된다.

### 랭킹/기록 관리 프런트 실연동과 테스트 보강

- 문제:
  - `RankingsPage`는 mock 기반이었고, `MyPage`도 로그아웃 껍데기만 연결된 상태라 랭킹 정합성 변화가 실제 화면까지 이어지지 않았다.
- 해결:
  - `RankingsPage`를 `GET /api/rankings` 기반으로 연결하고 `loading`, `empty`, `error`, 재시도, 서버 페이지 이동을 반영했다.
  - `TimerPage`, `MyPage`에서 기록 penalty 수정/삭제와 마이페이지 서버 페이지네이션을 연결했다.
  - `RankingsPage.test.jsx`, `TimerPage.test.jsx`, `MyPage.test.jsx`를 추가/보강했다.
- 결과:
- `2026-04-14` 기준 랭킹 V1 정합성은 백엔드 계약, 프런트 화면, 테스트까지 같은 기준으로 맞춰졌다.
  - 브라우저 수동 검증 전 기준선까지 정리했다.

### 브라우저 수동 검증 마감

- 확인:
  - `RankingsPage`에서 종목 변경, 닉네임 검색, 빈 결과, 페이지 이동이 정상 동작했다.
  - `RankingsPage` 에러 상태에서 백엔드 복구 후 `다시 시도` 클릭으로 정상 목록 복구를 확인했다.
  - `TimerPage`, `MyPage`에서 `PLUS_TWO`, `DNF`, 삭제 후 화면 갱신과 PB/랭킹 반영이 정상 동작했다.
  - 브라우저 네트워크 탭에서 `GET /api/rankings`, `PATCH /api/records/{recordId}`, `DELETE /api/records/{recordId}`, `GET /api/users/me/profile`, `GET /api/users/me/records` 흐름이 기대한 순서로 나가는 것을 확인했다.
- 결과:
  - `2026-04-14` 랭킹 V1 정합성 슬라이스는 브라우저 수동 검증까지 완료했다.
  - 남은 것은 `2026-04-15` 커뮤니티/댓글/홈 대시보드 실연동이다.

---

## 다음 작업

- `2026-04-15` 커뮤니티, 댓글, 홈 대시보드 실연동
