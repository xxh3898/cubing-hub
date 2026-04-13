# API Specification

## 1. API 기본 규칙

- Base Path: `/api`
- Content Type: `application/json`
- 인증 방식:
  - Access Token: `Authorization: Bearer <token>`
  - Refresh Token: `refresh_token` cookie
  - 프런트 사용 규칙: Access Token은 메모리에만 두고, 앱 초기 진입/새로고침 시 `refresh_token` cookie로 재발급받아 사용한다.
- 공통 응답 포맷: `ApiResponse`
- 공개 API와 보호 API의 경계는 `SecurityFilterChain` 기준으로 관리한다.

## 2. API 설계 원칙

- RESTful 자원 기준:
  - 인증, 기록, 랭킹, 게시글처럼 도메인별 자원을 명확히 나눈다.
- 읽기/쓰기 분리 기준:
  - 조회는 `GET`, 생성은 `POST`, 수정은 `PUT`, 삭제는 `DELETE`를 사용한다.
- 멱등성 기준:
  - `GET`, `PUT`, `DELETE`는 같은 요청 반복 시 의미가 크게 달라지지 않도록 설계한다.
  - `POST`는 생성 또는 토큰 발급처럼 부작용이 있는 요청으로 사용한다.
- 상태 코드 사용 기준:
  - 생성 성공은 `201 Created`
  - 정상 조회/수정/삭제는 `200 OK`
  - 유효하지 않은 입력은 `400 Bad Request`
  - 인증 실패는 `401 Unauthorized`
  - 권한 부족은 `403 Forbidden`
  - 리소스 없음은 `404 Not Found`
  - 중복/무결성 충돌은 `409 Conflict`
- 공통 응답 구조 사용 이유:
  - 프런트가 성공/실패를 같은 형태로 처리할 수 있게 하고, 메시지와 데이터 유무를 일관되게 다루기 위함이다.

## 3. 공통 응답 구조

현재 백엔드 응답은 `ApiResponse` 구조를 사용한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `status` | Number | HTTP 상태 코드 |
| `message` | String | 응답 메시지 |
| `data` | Object / Array / Null | 응답 데이터 |

## 4. 공통 에러 정책

| HTTP Status | 의미 | 현재 확인 근거 | 프런트 처리 |
| --- | --- | --- | --- |
| `400` | 잘못된 요청, validation 실패, 미지원 종목 등 | `GlobalExceptionHandler`, `ScrambleService` | 입력값 수정 또는 재시도 안내 |
| `401` | 로그인 실패, 만료/무효 토큰, 블랙리스트 토큰 | `AuthService`, `JwtAuthenticationFilter`, `SecurityConfig` | 로그인 유도 또는 토큰 재발급/재로그인 |
| `403` | 소유자/관리자 권한 부족 | `PostService.validateOwnershipOrAdmin` | 권한 없음 메시지 노출 |
| `404` | 게시글 등 리소스를 찾을 수 없음 | `PostService.findPostById` | 목록 복귀 또는 안내 메시지 |
| `409` | 중복 데이터 또는 무결성 충돌 | `GlobalExceptionHandler.handleDataIntegrityViolationException` | 중복 입력 수정 유도 |
| `500` | 서버 내부 오류 | `GlobalExceptionHandler.handleGenericException` | 재시도 안내 및 운영 로그 확인 |

## 5. 현재 구현 API 목록

| Method | Path | 인증 | 설명 | 상태 |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Public | 회원가입 | 구현됨 |
| `POST` | `/api/auth/login` | Public | 로그인 | 구현됨 |
| `POST` | `/api/auth/refresh` | Public + Cookie | 토큰 재발급 | 구현됨 |
| `POST` | `/api/auth/logout` | 인증 토큰/쿠키 전달 | 로그아웃 | 구현됨 |
| `GET` | `/api/me` | Auth | 현재 로그인 사용자 컨텍스트 조회 | 구현됨 |
| `POST` | `/api/records` | Auth | 기록 저장 | 구현됨 |
| `GET` | `/api/rankings` | Public | 글로벌 랭킹 조회 | 구현됨 (V1 기준) |
| `GET` | `/api/scramble` | Public | 스크램블 조회 | 구현됨 |
| `POST` | `/api/posts` | Auth | 게시글 생성 | 구현됨 |
| `GET` | `/api/posts` | Public | 게시글 목록 조회 | 구현됨 |
| `GET` | `/api/posts/{postId}` | Public | 게시글 상세 조회 | 구현됨 |
| `PUT` | `/api/posts/{postId}` | Auth | 게시글 수정 | 구현됨 |
| `DELETE` | `/api/posts/{postId}` | Auth | 게시글 삭제 | 구현됨 |

## 6. 인증 API

### `POST /api/auth/signup`

- 설명: 새 사용자를 생성한다.
- 인증: Public
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | 예 | 이메일 형식 필수 |
| `password` | String | 예 | 8자 이상 비밀번호 |
| `nickname` | String | 예 | 2자 이상 50자 이하 닉네임 |
| `mainEvent` | String | 아니오 | 주 종목 |

#### Response

- 상태 코드: `201 Created`
- `data`: `null`

### `POST /api/auth/login`

- 설명: 로그인 후 Access Token과 Refresh Token을 발급한다.
- 인증: Public
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | 예 | 로그인 이메일 |
| `password` | String | 예 | 비밀번호 |

#### Response Body

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.accessToken` | String | Access Token |
| `data.tokenType` | String | 고정값 `Bearer` |

#### Response Cookie

| 이름 | 설명 |
| --- | --- |
| `refresh_token` | Refresh Token, `HttpOnly`, `SameSite=Strict`, `Path=/api/auth`, `Secure`는 환경 설정으로 분기 |

### `POST /api/auth/refresh`

- 설명: Refresh Token Rotation 방식으로 토큰을 재발급한다.
- 인증: `refresh_token` 쿠키 필요
- 멱등성: 비멱등

#### Request Cookie

| 이름 | 설명 |
| --- | --- |
| `refresh_token` | 기존 Refresh Token |

#### Response Body

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.accessToken` | String | 새 Access Token |
| `data.tokenType` | String | 고정값 `Bearer` |

#### Response Cookie

| 이름 | 설명 |
| --- | --- |
| `refresh_token` | 새 Refresh Token, `Secure`는 환경 설정으로 분기 |

### `POST /api/auth/logout`

- 설명: 로그아웃을 수행하고 Refresh Token을 제거하며 Access Token을 블랙리스트에 등록한다.
- 인증: `Authorization` 헤더와 `refresh_token` 쿠키 전달 기준
- 멱등성: 약한 멱등

#### Request

| 항목 | 설명 |
| --- | --- |
| `Authorization: Bearer <accessToken>` | 블랙리스트 등록 대상 Access Token |
| `refresh_token` Cookie | 삭제 대상 Refresh Token |

#### Response

- 상태 코드: `200 OK`
- `data`: `null`
- `refresh_token` 쿠키는 `maxAge=0`으로 만료 처리된다.

#### 로그아웃 처리 비고

- 서버 로그아웃 호출이 실패하더라도 프런트는 메모리 인증 상태를 정리해 사용자 세션을 종료해야 한다.

### `GET /api/me`

- 설명: 현재 로그인 사용자의 전역 사용자 컨텍스트를 조회한다.
- 상태: 구현됨
- 인증: Access Token 필요
- 멱등성: 멱등

#### 설계 목적

- 헤더와 전역 auth-aware UI에서 공통으로 사용할 최소 사용자 정보를 제공한다.
- 마이페이지 상세 조회와는 분리된 경량 컨텍스트 API로 둔다.

#### Request

- `Authorization: Bearer <accessToken>`
- `userId` 같은 식별자를 query parameter나 path parameter로 받지 않는다.

#### Response Body

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.userId` | Number | 현재 로그인 사용자 ID |
| `data.email` | String | 현재 로그인 사용자 이메일 |
| `data.nickname` | String | 현재 로그인 사용자 닉네임 |

#### 비고

- 상세 프로필, 통계, 기록은 후속 `/api/users/me/profile` 또는 별도 마이페이지 API로 분리할 수 있다.

### 설계 판단

- 이 구조를 선택한 이유:
  - Access Token은 API 호출 시 즉시 사용해야 하므로 body로 전달하고, 프런트 메모리에서만 유지한다.
  - Refresh Token은 HttpOnly cookie로 분리해 브라우저 스크립트 노출을 줄였다.
  - 로그아웃 시 Refresh Token 삭제와 Access Token blacklist 등록을 함께 수행해 재사용 위험을 줄인다.
- 검토한 대안:
  - 세션 기반 인증
  - Access Token `localStorage` + Refresh Token `HttpOnly` cookie
  - Access/Refresh Token 모두 body 또는 `localStorage` 저장
- 대안을 배제한 이유:
  - 세션 기반은 stateless API와 다중 환경 확장 설명이 약하다.
  - Access Token을 영속 JS 저장소에 두면 XSS 노출면이 커진다.
  - Refresh Token을 JS 접근 가능한 저장소에 두면 노출 면적이 커진다.
- 트레이드오프:
  - 메모리 기반 Access Token 구조에서는 앱 초기 진입/새로고침 때 refresh 기반 부트스트랩이 필요하다.
  - 토큰 생명주기 관리가 단순 세션보다 복잡하다.
  - 로그인 응답에 사용자 프로필을 과도하게 싣지 않는 대신, 헤더/전역 컨텍스트를 위한 `/api/me` 같은 보조 조회 API가 필요해진다.
  - local/prod 환경 차이 때문에 `refresh_token` cookie의 `Secure` 속성을 설정으로 분기 관리해야 한다.
  - `withCredentials`, `SameSite`, 필요 시 `CSRF` 정책을 함께 설계해야 한다.
- 연관 저장소:
  - Redis(`refresh:{email}:{jti}`, `blacklist:{accessToken}`)

## 7. 기록 API

### `POST /api/records`

- 설명: 사용자의 solve 기록을 저장하고, `DNF`가 아니면 `user_pbs`를 갱신한다.
- 인증: Access Token 필요
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `eventType` | String | 예 | WCA 종목 코드 (`WCA_333` 등) |
| `timeMs` | Number | 예 | 측정 시간(밀리초) |
| `penalty` | String | 예 | `NONE`, `PLUS_TWO`, `DNF` |
| `scramble` | String | 예 | 측정에 사용된 스크램블 문자열 |

#### Response

- 상태 코드: `201 Created`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.id` | Number | 생성된 기록 ID |

### 설계 판단

- 이 구조를 선택한 이유:
  - 타이머 결과는 매 요청마다 새 solve를 저장하는 이벤트 성격이라 `POST`가 맞다.
  - 기록 저장과 PB 갱신을 같은 트랜잭션 흐름에 넣어 원본 로그와 대표 기록을 함께 관리한다.
- 검토한 대안:
  - PB만 저장하는 구조
  - 기록 저장과 PB 갱신을 별도 API로 분리
- 대안을 배제한 이유:
  - PB만 남기면 분석과 이력 추적이 불가능하다.
  - API를 분리하면 호출 순서와 일관성 관리가 복잡해진다.
- 트레이드오프:
  - 저장 시점의 쓰기 작업이 늘어난다.
  - 랭킹 V2까지 연결되면 후속 캐시 동기화도 필요하다.
- 연관 DB:
  - `records`, `user_pbs`

## 8. 랭킹 API

### `GET /api/rankings`

- 설명: 종목별 글로벌 랭킹을 반환한다.
- 인증: Public
- 멱등성: 멱등

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `eventType` | String | 예 | 조회할 WCA 종목 코드 |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data[].rank` | Number | 1부터 시작하는 순위 |
| `data[].nickname` | String | 사용자 닉네임 |
| `data[].eventType` | String | WCA 종목 코드 |
| `data[].timeMs` | Number | 기록 시간(밀리초) |

#### 현재 상태 메모

- 현재 구현은 V1 기준이다.
- `records` 테이블에서 `DNF`를 제외하고 종목별 상위 100건을 빠른 순으로 조회한다.
- 최종 목표는 Redis ZSET 기반 실시간 랭킹 구조다.

### 설계 판단

- 이 구조를 선택한 이유:
  - 초기 구현에서는 `records` 기반 조회가 가장 단순한 기준선이다.
  - 개선 전 구조를 남겨 두어 향후 Redis ZSET 전환 이유를 수치화하기 쉽다.
- 검토한 대안:
  - 처음부터 Redis ZSET만 사용하는 구조
  - `user_pbs`만 바로 조회하는 구조
- 대안을 배제한 이유:
  - 전자는 현재 한계를 설명할 비교 기준이 없다.
  - 후자는 Redis V2 목표와의 차이를 설명하기 어렵다.
- 트레이드오프:
  - 현재 API는 사용자 대표 기록이 아니라 원본 `records` 정렬 결과를 사용한다.
  - 대규모 읽기 부하에서는 RDB 정렬/스캔 부담이 커질 수 있다.
- 후속 계획:
  - 개발 완료 후 `k6` 전/후 비교 문서와 연결한다.

## 9. 스크램블 API

### `GET /api/scramble`

- 설명: 종목별 스크램블을 생성한다.
- 인증: Public
- 멱등성: 비멱등

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `eventType` | String | 예 | WCA 종목 코드 |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.eventType` | String | WCA 종목 코드 |
| `data.scramble` | String | 생성된 스크램블 문자열 |

#### 현재 상태 메모

- 현재는 `WCA_333`만 지원한다.
- 미지원 종목 요청 시 `400 Bad Request`를 반환한다.

### 설계 판단

- 이 구조를 선택한 이유:
  - 타이머 UX에서 스크램블 조회는 기록 저장 전 필수 단계다.
  - 우선 `WCA_333`만 안정적으로 지원해 핵심 슬라이스를 닫는 것이 범위 통제에 유리하다.
- 검토한 대안:
  - 여러 WCA 종목을 동시에 지원
- 대안을 배제한 이유:
  - 스크램블 생성 규칙과 UI 예외 처리가 함께 늘어나 MVP 범위가 커진다.
- 트레이드오프:
  - 현재는 다른 종목 선택 시 사용자 경험이 제한된다.

## 10. 게시판 API

### `POST /api/posts`

- 설명: 게시글을 생성한다.
- 인증: Access Token 필요
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `category` | String | 예 | `NOTICE`, `FREE` |
| `title` | String | 예 | 게시글 제목 |
| `content` | String | 예 | 게시글 본문 |

#### Response

- 상태 코드: `201 Created`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.id` | Number | 생성된 게시글 ID |

### `GET /api/posts`

- 설명: 게시글 목록을 조회한다.
- 인증: Public
- 멱등성: 멱등

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | String | 아니오 | 제목/본문 키워드 |
| `author` | String | 아니오 | 작성자 닉네임 |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data[].id` | Number | 게시글 ID |
| `data[].category` | String | 게시판 카테고리 |
| `data[].title` | String | 제목 |
| `data[].authorNickname` | String | 작성자 닉네임 |
| `data[].viewCount` | Number | 조회수 |
| `data[].createdAt` | String | 작성 시각 |

### `GET /api/posts/{postId}`

- 설명: 게시글 상세를 조회한다.
- 인증: Public
- 추가 동작: 상세 조회 시 `viewCount`가 증가한다.
- 멱등성: 비엄격 멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `postId` | Number | 조회할 게시글 ID |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.id` | Number | 게시글 ID |
| `data.category` | String | 게시판 카테고리 |
| `data.title` | String | 제목 |
| `data.content` | String | 본문 |
| `data.authorNickname` | String | 작성자 닉네임 |
| `data.viewCount` | Number | 조회수 |
| `data.createdAt` | String | 작성 시각 |
| `data.updatedAt` | String | 수정 시각 |

### `PUT /api/posts/{postId}`

- 설명: 게시글을 수정한다.
- 인증: Access Token 필요
- 인가: 작성자 본인 또는 `ROLE_ADMIN`
- 멱등성: 멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `postId` | Number | 수정할 게시글 ID |

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `category` | String | 예 | 수정할 카테고리 |
| `title` | String | 예 | 수정할 제목 |
| `content` | String | 예 | 수정할 본문 |

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

### `DELETE /api/posts/{postId}`

- 설명: 게시글을 삭제한다.
- 인증: Access Token 필요
- 인가: 작성자 본인 또는 `ROLE_ADMIN`
- 멱등성: 멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `postId` | Number | 삭제할 게시글 ID |

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

### 설계 판단

- 이 구조를 선택한 이유:
  - 목록/상세/작성/수정/삭제를 리소스 중심으로 나누고, 권한 검사는 서비스 계층에서 추가로 수행한다.
  - 검색은 QueryDSL로 `keyword`, `author` 조건을 선택적으로 조합한다.
- 검토한 대안:
  - 검색 전용 별도 엔드포인트
  - SQL 문자열 기반 동적 쿼리
- 대안을 배제한 이유:
  - 검색 조건 수가 늘어날수록 별도 엔드포인트는 관리 비용이 커진다.
  - QueryDSL이 타입 안전성과 유지보수 측면에서 유리하다.
- 트레이드오프:
  - `GET /api/posts/{postId}`는 조회수 증가 부작용이 있어 엄격한 의미의 멱등 조회와는 다르다.
  - 게시글 API는 구현됐지만 댓글 API가 아직 없어 커뮤니티 전체 흐름은 미완성이다.
- 연관 DB:
  - `posts`, `users`

## 11. 구현 예정 API

- 댓글 API
  - 댓글 작성, 삭제, 목록 조회
  - `TODO`
- 피드백 전달 API
  - 관리자 메일 전달 및 필요 시 저장
  - `TODO`
- 마이페이지/대시보드 API
  - 프로필, 통계, 최근 기록, 전체 기록 조회/수정
  - `TODO`

## 12. 문서화 메모

- 현재 API 문서 생성 기준은 `backend/src/docs/asciidoc/index.adoc`와 REST Docs 통합 테스트다.
- 상세 스니펫은 `AuthIntegrationTest`, `RecordIntegrationTest`, `ScrambleIntegrationTest`, `PostIntegrationTest`에서 생성된다.

## 13. 미확정 사항

- 댓글, 피드백, 마이페이지 API의 최종 응답 스키마
- 랭킹 V2 전환 시 `GET /api/rankings` 응답 형식 유지 여부
