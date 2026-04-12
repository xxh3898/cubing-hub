# Authentication & Authorization Design

## 1. 적용 범위

- 회원가입 / 로그인 / 토큰 재발급 / 로그아웃 API
- 보호 API 접근 제어
- 게시글 수정/삭제의 소유자 검증
- 프런트의 Access Token 보관 및 API 호출 규칙

## 2. 사용자 역할

| 역할 | 설명 |
| --- | --- |
| `ROLE_USER` | 일반 사용자 |
| `ROLE_ADMIN` | 관리자 권한 사용자 |

## 3. 권한 정책

### 공개 경로

- `/api/auth/**`
- `/api/rankings`
- `/api/scramble`
- `/actuator/**`
- `/docs/**`
- `/error`
- `GET /api/posts`
- `GET /api/posts/*`

### 인증 필요 경로

- 위 공개 경로를 제외한 나머지 API
- 예시
  - `POST /api/records`
  - `POST /api/posts`
  - `PUT /api/posts/{postId}`
  - `DELETE /api/posts/{postId}`

### 추가 인가 정책

- 게시글 수정/삭제는 인증만으로 끝나지 않는다.
- 작성자 본인 또는 `ROLE_ADMIN`만 허용한다.

## 4. 인증 흐름

### 1. 회원가입

1. 사용자가 이메일, 비밀번호, 닉네임, 주 종목을 전달한다.
2. 이메일/닉네임 중복을 검사한다.
3. 비밀번호를 암호화해 `users`에 저장한다.
4. 기본 권한은 `ROLE_USER`, 기본 상태는 `ACTIVE`다.

### 2. 로그인

1. `AuthenticationManager`로 이메일/비밀번호를 검증한다.
2. Access Token과 Refresh Token을 생성한다.
3. Refresh Token을 Redis에 저장한다.
4. Access Token은 응답 body로, Refresh Token은 `HttpOnly` cookie로 반환한다.

### 3. 토큰 재발급

1. `refresh_token` cookie를 전달한다.
2. Refresh Token 자체 유효성을 검증한다.
3. 토큰에서 `email`, `jti`를 추출한다.
4. Redis 저장 값과 비교해 일치 여부를 확인한다.
5. 불일치 시 해당 사용자의 모든 Refresh Token을 제거한다.
6. 기존 Refresh Token을 삭제하고 새 Access/Refresh Token을 발급한다.

### 4. 로그아웃

1. Refresh Token이 전달되면 Redis에서 제거한다.
2. Access Token이 전달되면 남은 만료 시간 기준으로 블랙리스트에 등록한다.
3. `refresh_token` cookie를 즉시 만료 처리한다.

## 5. 인가 흐름

### JWT 필터 동작

1. `Authorization` 헤더에서 Bearer 토큰을 추출한다.
2. 토큰 유효성을 검증한다.
3. 블랙리스트 등록 여부를 확인한다.
4. 토큰의 이메일과 권한 정보를 사용해 인증 객체를 구성한다.
5. `SecurityContext`에 인증 정보를 저장한다.

### 서비스 계층 소유권 검증

1. 보호 API 진입 후 현재 사용자 정보를 조회한다.
2. 대상 리소스 작성자와 현재 사용자 ID를 비교한다.
3. `ROLE_ADMIN`이면 통과시킨다.
4. 작성자 본인이 아니면 `403 Forbidden`을 반환한다.

## 6. 토큰 / 세션 / 보안 정책

### 목표 인증 방식

- JWT Access Token 기반 인증
- Redis Refresh Token 생명주기 관리
- Spring Security Stateless 세션 정책
- 역할 기반 인가

### 현재 구현 상태

- 백엔드 인증 API는 구현되어 있다.
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
- 현재 백엔드는 Access Token을 응답 body로, Refresh Token을 `HttpOnly` cookie로 전달한다.
- 프런트는 `AuthContext` + `localStorage`로 Access Token을 보관한다.
- 프런트 `apiClient`는 `withCredentials: true`로 설정되어 있다.
- 로그인/회원가입 화면의 실제 백엔드 연동은 구현 예정이다.

### 토큰 세부 정책

#### Access Token

- 저장/전달
  - 응답 body의 `data.accessToken`
  - 프런트 현재 상태: `localStorage` 저장
- 주요 정보
  - `subject`: 사용자 이메일
  - `role`: 권한 claim
  - `jti`: 토큰 식별자
- 사용 목적
  - API 인증 헤더 `Authorization: Bearer <token>`
- 만료 시간
  - 로컬 설정: `86400000` (1일)
  - 테스트 설정: `10000`
  - 프로덕션 설정: `jwt.expiration` 정의됨

#### Refresh Token

- 저장/전달
  - 응답 cookie `refresh_token`
  - `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth`
- 주요 정보
  - `subject`: 사용자 이메일
  - `jti`: 토큰 식별자
- 저장 위치
  - Redis
  - Key 전략: `refresh:{email}:{jti}`
- 만료 시간
  - 로컬 설정: `604800000` (7일)
  - 테스트 설정: `60000`
  - 프로덕션 설정: `application-prod.yaml` 기준 추가/정리 필요

#### Access Token Blacklist

- 로그아웃된 Access Token은 Redis 블랙리스트에 저장된다.
- Key 전략: `blacklist:{accessToken}`
- TTL: 토큰의 남은 유효 시간

## 7. 핵심 설계 판단

### 설계 선택 1

- 선택한 방식:
  - JWT Access Token + Redis Refresh Token Rotation 조합을 사용한다.
- 선택 이유:
  - API 서버를 stateless하게 유지하면서도 Refresh Token 재사용 감지와 로그아웃 처리가 필요하다.
  - Redis를 사용하면 토큰 생명주기를 명시적으로 관리할 수 있다.
- 검토한 대안:
  - 세션 기반 인증
  - JWT 단독 운용
- 대안을 배제한 이유:
  - 세션 기반은 stateless API 구조와 운영 설명력이 약하다.
  - JWT 단독은 장기 인증과 강제 무효화 제어가 어렵다.
- 트레이드오프:
  - 토큰 관리 로직과 Redis 의존성이 늘어난다.
  - Rotation, blacklist, cookie 정책까지 함께 관리해야 한다.
- 보안상 영향:
  - Refresh Token 재사용 탐지와 로그아웃 토큰 차단이 가능해진다.

### 설계 선택 2

- 선택한 방식:
  - Access Token은 응답 body, Refresh Token은 `HttpOnly` cookie로 분리한다.
- 선택 이유:
  - Access Token은 API 호출 시 직접 헤더에 넣어야 하므로 프런트가 즉시 읽을 수 있어야 한다.
  - Refresh Token은 재발급 전용이므로 브라우저 스크립트 접근을 막는 편이 안전하다.
- 검토한 대안:
  - 두 토큰 모두 `localStorage`
  - 두 토큰 모두 cookie
- 대안을 배제한 이유:
  - 전자는 Refresh Token 노출 면적이 커진다.
  - 후자는 프런트 제어와 API 호출 흐름 설명이 복잡해질 수 있다.
- 트레이드오프:
  - 현재 프런트는 Access Token을 `localStorage`에 저장해 XSS 관점의 노출 면이 남아 있다.
  - 쿠키와 헤더를 함께 다뤄야 하므로 프런트 구현이 조금 복잡해진다.
- 보안상 영향:
  - 최소한 Refresh Token은 JS에서 직접 접근할 수 없다.

### 설계 선택 3

- 선택한 방식:
  - JWT 필터에서 DB 재조회 없이 토큰 정보만으로 인증 객체를 구성한다.
- 선택 이유:
  - 매 요청마다 DB를 다시 조회하면 인증 경로가 불필요하게 무거워진다.
  - role과 subject만으로 보호 API 진입을 빠르게 처리할 수 있다.
- 검토한 대안:
  - 요청마다 사용자 정보를 DB에서 재조회
- 대안을 배제한 이유:
  - stateless 인증의 장점이 줄고, 읽기 부하가 불필요하게 늘어난다.
- 트레이드오프:
  - 사용자 상태 변경이 즉시 반영되지 않는 시나리오를 별도로 고려해야 한다.
  - 토큰 내용과 서버 정책이 어긋나지 않도록 토큰 만료와 블랙리스트가 중요해진다.
- 보안상 영향:
  - 블랙리스트와 짧은 Access Token 만료 정책이 함께 있어야 안전성이 유지된다.

## 8. 예외 처리 정책

| 상황 | HTTP Status | 백엔드 처리 | 프런트 처리 |
| --- | --- | --- | --- |
| 인증 정보 없음 | `401` | `SecurityConfig`의 `authenticationEntryPoint`에서 JSON 응답 | 로그인 화면 유도 |
| 로그인 실패 | `401` | `AuthService`에서 `CustomApiException` 반환 | 에러 메시지 표시 |
| 만료/무효 토큰 | `401` | JWT 검증 실패 또는 블랙리스트 검사 실패 | 재로그인 또는 재발급 유도 |
| 권한 부족 | `403` | `accessDeniedHandler` 또는 서비스 계층 인가 예외 | 권한 없음 메시지 표시 |
| 소유자 조건 불일치 | `403` | 게시글 수정/삭제 거부 | 상세 또는 목록 화면 복귀 |
| 중복 회원가입 | `409` | `DataIntegrityViolationException` 처리 | 입력값 수정 유도 |

## 9. 프런트 처리 규칙

- 보호 라우트 처리:
  - 현재는 완전한 보호 라우트보다 API 호출 시 인증 여부를 판단하는 구조에 가깝다.
  - 최종적으로는 보호 화면(`mypage`, `community/write`)에 명시적 가드가 필요하다.
- 401 처리:
  - 현재는 에러 메시지 기반 처리 단계다.
  - 최종적으로는 refresh 재발급 또는 로그인 이동 분기가 필요하다.
- 403 처리:
  - 작성자/관리자 권한이 없는 경우 작업 버튼 비활성화 또는 오류 메시지 처리가 필요하다.
- 로그인 성공 후 이동:
  - 현재 mock 흐름 기준 홈 이동이다.
  - 실제 연동 시 이전 화면 복귀 여부는 추가 결정이 필요하다.
- 재로그인/재발급 UX:
  - 현재 프런트는 완성되지 않았으므로, 현재 상태와 목표 상태를 분리해 설명한다.

## 10. 인증 / 인가 다이어그램

### 로그인 시퀀스

```mermaid
sequenceDiagram
    actor User as User
    participant Client as Client
    participant Auth as Auth API
    participant Redis as Redis

    User->>Client: 로그인 정보 입력
    Client->>Auth: POST /api/auth/login
    Auth->>Auth: 사용자 인증
    Auth->>Redis: Refresh Token 저장
    Auth-->>Client: Access Token(body) + Refresh Token(cookie)
```

### 인가 분기

```mermaid
flowchart TD
    Req[API Request] --> Header{Authorization Header?}
    Header -- No --> PublicOr401[공개 경로면 통과 / 보호 경로면 401]
    Header -- Yes --> Validate{JWT Valid?}
    Validate -- No --> Unauthorized[401]
    Validate -- Yes --> Blacklist{Blacklisted?}
    Blacklist -- Yes --> Unauthorized
    Blacklist -- No --> Authenticated[SecurityContext 저장]
    Authenticated --> ServiceCheck{소유자 또는 관리자?}
    ServiceCheck -- No --> Forbidden[403]
    ServiceCheck -- Yes --> Success[비즈니스 로직 실행]
```

## 11. 면접 / 포트폴리오 포인트

- 백엔드 인증은 구현됐지만 프런트 연동은 아직 중간 단계라는 점을 솔직하게 설명할 수 있다.
- Refresh Token Rotation, blacklist, stateless filter를 조합한 이유를 구조적으로 설명할 수 있다.
- 현재 프런트가 `localStorage` 기반이라는 한계와 후속 개선 방향을 함께 말할 수 있다.

## 12. 미확정 사항

- 프런트 최종 토큰 저장 전략
- 로그인 성공 후 복귀 경로와 재발급 실패 UX
- 프로덕션 설정의 `jwt.refresh-expiration` 정리 방식
