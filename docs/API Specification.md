# API Specification

## 1. API 기본 규칙

- Base Path: `/api`
- Content Type: `application/json`
- 인증 방식:
  - Access Token: `Authorization: Bearer <token>`
  - Refresh Token: `refresh_token` cookie
  - 구현 상태: React는 access token을 메모리에만 저장하고, 앱 초기 `refresh_token` cookie -> `/api/me` 순서로 세션을 복구한다.
  - 구현 상태: `apiClient`는 보호 API `401`에 대해 `refresh -> retry`를 1회 수행한다.
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
  - 일시적인 외부 연동 장애는 `503 Service Unavailable`
- 공통 응답 구조 사용 이유:
  - 프런트가 성공/실패를 같은 형태로 처리할 수 있게 하고, 메시지와 데이터 유무를 일관되게 다루기 위함이다.

## 3. 공통 응답 구조

백엔드 응답은 `ApiResponse` 구조를 사용한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `status` | Number | HTTP 상태 코드 |
| `message` | String | 응답 메시지 |
| `data` | Object / Array / Null | 응답 데이터 |

## 4. 공통 에러 정책

| HTTP Status | 의미 | 확인 근거 | 프런트 처리 |
| --- | --- | --- | --- |
| `400` | 잘못된 요청, validation 실패, 필수 cookie 누락, 잘못된 refresh token, 미지원 종목 등 | `GlobalExceptionHandler`, `AuthService`, `ScrambleService` | 입력값 수정 또는 재시도 안내 |
| `401` | 로그인 실패, 만료/무효 토큰, 블랙리스트 토큰, refresh token 재사용 감지 | `AuthService`, `JwtAuthenticationFilter`, `SecurityConfig` | 로그인 유도 또는 토큰 재발급/재로그인 |
| `403` | 소유자/관리자 권한 부족 | `PostService.validateOwnershipOrAdmin` | 권한 없음 메시지 노출 |
| `404` | 게시글 등 리소스를 찾을 수 없음 | `PostService.findPostById` | 목록 복귀 또는 안내 메시지 |
| `409` | 중복 데이터 또는 무결성 충돌 | `GlobalExceptionHandler.handleDataIntegrityViolationException` | 중복 입력 수정 유도 |
| `503` | 메일/S3 같은 외부 연동의 일시적 장애 | `AuthService`, `S3PostImageStorageService`, `UnavailablePostImageStorageService` | 잠시 후 재시도 안내 |
| `500` | 서버 내부 오류 | `GlobalExceptionHandler.handleGenericException` | 재시도 안내 및 운영 로그 확인 |

## 5. 구현 API 목록

| Method | Path | 인증 | 설명 | 상태 |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/email-verification/request` | Public | 회원가입용 이메일 인증번호 요청 | 구현됨 |
| `POST` | `/api/auth/email-verification/confirm` | Public | 회원가입용 이메일 인증번호 확인 | 구현됨 |
| `POST` | `/api/auth/password-reset/request` | Public | 비밀번호 재설정 인증번호 요청 | 구현됨 |
| `POST` | `/api/auth/password-reset/confirm` | Public | 비밀번호 재설정 확인 및 비밀번호 변경 | 구현됨 |
| `POST` | `/api/auth/signup` | Public | 회원가입 | 구현됨 |
| `POST` | `/api/auth/login` | Public | 로그인 | 구현됨 |
| `POST` | `/api/auth/refresh` | Public + Cookie | 토큰 재발급 | 구현됨 |
| `POST` | `/api/auth/logout` | 인증 토큰/쿠키 전달 | 로그아웃 | 구현됨 |
| `POST` | `/api/session/clear-refresh-cookie` | Public | 세션 복구용 refresh cookie 정리 | 구현됨 |
| `GET` | `/api/me` | Auth | 로그인 사용자 컨텍스트 조회 | 구현됨 |
| `GET` | `/api/home` | Public + Optional Auth | 홈 대시보드 조회 | 구현됨 |
| `GET` | `/api/users/me/profile` | Auth | 마이페이지 프로필/요약 조회 | 구현됨 |
| `GET` | `/api/users/me/records` | Auth | 마이페이지 전체 기록 페이지 조회 | 구현됨 |
| `PATCH` | `/api/users/me/profile` | Auth | 마이페이지 프로필 수정 | 구현됨 |
| `PATCH` | `/api/users/me/password` | Auth | 로그인 사용자 비밀번호 변경 | 구현됨 |
| `POST` | `/api/records` | Auth | 기록 저장 | 구현됨 |
| `PATCH` | `/api/records/{recordId}` | Auth | 기록 penalty 수정 | 구현됨 |
| `DELETE` | `/api/records/{recordId}` | Auth | 기록 삭제 | 구현됨 |
| `GET` | `/api/rankings` | Public | 글로벌 랭킹 조회 | 구현됨 (V2) |
| `GET` | `/api/scramble` | Public | 스크램블 조회 | 구현됨 |
| `POST` | `/api/posts` | Auth | 게시글 생성 | 구현됨 |
| `GET` | `/api/posts` | Public | 게시글 목록 조회 | 구현됨 |
| `GET` | `/api/posts/{postId}` | Public | 게시글 상세 조회 | 구현됨 |
| `GET` | `/api/posts/{postId}/edit` | Auth | 게시글 수정 화면 사전 조회 | 구현됨 |
| `PUT` | `/api/posts/{postId}` | Auth | 게시글 수정 | 구현됨 |
| `DELETE` | `/api/posts/{postId}` | Auth | 게시글 삭제 | 구현됨 |
| `GET` | `/api/posts/{postId}/comments` | Public | 댓글 목록 조회 | 구현됨 |
| `POST` | `/api/posts/{postId}/comments` | Auth | 댓글 생성 | 구현됨 |
| `DELETE` | `/api/posts/{postId}/comments/{commentId}` | Auth | 댓글 삭제 | 구현됨 |
| `POST` | `/api/feedbacks` | Auth | 피드백 접수 | 구현됨 |
| `GET` | `/api/qna` | Public | 공개 질문/답변 목록 조회 | 구현됨 |
| `GET` | `/api/qna/{feedbackId}` | Public | 공개 질문/답변 상세 조회 | 구현됨 |
| `GET` | `/api/admin/feedbacks` | Admin | 관리자 피드백 목록 조회 | 구현됨 |
| `GET` | `/api/admin/feedbacks/{feedbackId}` | Admin | 관리자 피드백 상세 조회 | 구현됨 |
| `PATCH` | `/api/admin/feedbacks/{feedbackId}/answer` | Admin | 관리자 피드백 답변 저장 | 구현됨 |
| `PATCH` | `/api/admin/feedbacks/{feedbackId}/visibility` | Admin | 관리자 피드백 공개 상태 변경 | 구현됨 |
| `GET` | `/api/admin/memos` | Admin | 관리자 메모 목록 조회 | 구현됨 |
| `POST` | `/api/admin/memos` | Admin | 관리자 메모 생성 | 구현됨 |
| `GET` | `/api/admin/memos/{memoId}` | Admin | 관리자 메모 상세 조회 | 구현됨 |
| `PATCH` | `/api/admin/memos/{memoId}` | Admin | 관리자 메모 수정 | 구현됨 |
| `DELETE` | `/api/admin/memos/{memoId}` | Admin | 관리자 메모 삭제 | 구현됨 |

## 6. 인증 API

### `POST /api/auth/email-verification/request`

- 설명: 회원가입 전에 이메일 인증번호를 발송한다.
- 인증: Public
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | 예 | 인증번호를 받을 이메일, 최대 255자 |

#### 에러 계약

- `400 Bad Request`
  - 이미 가입된 이메일이면 응답 메시지는 `이미 사용 중인 이메일입니다.`
  - 재요청 제한 중이면 응답 메시지는 `인증번호 재요청은 약 1분 뒤에 가능합니다.`
- `503 Service Unavailable`
  - SMTP 발송 실패 또는 설정 누락이면 응답 메시지는 `메일 전송 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.`

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

### `POST /api/auth/email-verification/confirm`

- 설명: 이메일로 받은 6자리 인증번호를 확인하고 회원가입 가능 상태를 만든다.
- 인증: Public
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | 예 | 인증을 완료할 이메일, 최대 255자 |
| `code` | String | 예 | 6자리 인증번호 |

#### 에러 계약

- `400 Bad Request`
  - 인증번호가 없거나 만료됐으면 응답 메시지는 `인증번호가 만료되었거나 요청되지 않았습니다.`
  - 인증번호가 일치하지 않으면 응답 메시지는 `인증번호가 일치하지 않습니다.`

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

### `POST /api/auth/password-reset/request`

- 설명: 비밀번호 재설정 전에 이메일 인증번호를 발송한다.
- 인증: Public
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | 예 | 비밀번호를 재설정할 이메일, 최대 255자 |

#### 동작 메모

- 가입되지 않은 이메일이어도 동일한 성공 응답을 반환한다.
- 계정 존재 여부를 외부에 노출하지 않기 위한 정책이다.

#### 에러 계약

- `400 Bad Request`
  - 재요청 제한 중이면 응답 메시지는 `인증번호 재요청은 약 1분 뒤에 가능합니다.`
- `503 Service Unavailable`
  - SMTP 발송 실패 또는 설정 누락이면 응답 메시지는 `메일 전송 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.`

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

### `POST /api/auth/password-reset/confirm`

- 설명: 이메일로 받은 6자리 인증번호를 확인하고 비밀번호를 재설정한다.
- 인증: Public
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | 예 | 비밀번호를 재설정할 이메일, 최대 255자 |
| `code` | String | 예 | 6자리 인증번호 |
| `newPassword` | String | 예 | 새 비밀번호, 8자 이상 64자 이하, UTF-8 기준 최대 72바이트 |

#### 에러 계약

- `400 Bad Request`
  - 인증번호가 없거나 만료됐으면 응답 메시지는 `인증번호가 만료되었거나 요청되지 않았습니다.`
  - 인증번호가 일치하지 않으면 응답 메시지는 `인증번호가 일치하지 않습니다.`

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

### `POST /api/auth/signup`

- 설명: 이메일 인증이 완료된 상태에서 새 사용자를 생성한다.
- 인증: Public
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | 예 | 이메일 형식 필수, 최대 255자 |
| `password` | String | 예 | 8자 이상 64자 이하, UTF-8 기준 최대 72바이트 |
| `nickname` | String | 예 | 2자 이상 50자 이하 닉네임 |
| `mainEvent` | String | 아니오 | 주 종목 WCA 코드 (`WCA_333` 등) |

#### 사전 조건

- 같은 이메일에 대해 `POST /api/auth/email-verification/request`, `POST /api/auth/email-verification/confirm`이 먼저 성공해야 한다.

#### 에러 계약

- `400 Bad Request`
  - 이메일 인증이 완료되지 않았으면 응답 메시지는 `이메일 인증이 필요합니다.`
  - `mainEvent`가 유효한 WCA 종목 코드가 아니면 응답 메시지는 `잘못된 입력값입니다: 주 종목은 유효한 WCA 종목 코드여야 합니다.`

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
| `email` | String | 예 | 로그인 이메일, 최대 255자 |
| `password` | String | 예 | 비밀번호, 최대 64자 / UTF-8 기준 최대 72바이트 |

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

#### 에러 계약

- `400 Bad Request`
  - `refresh_token` cookie가 없으면 응답 메시지는 `refresh_token 쿠키가 필요합니다.`
  - `refresh_token` 값이 잘못됐거나 만료됐으면 응답 메시지는 `유효하지 않거나 만료된 리프레시 토큰입니다.`
- `401 Unauthorized`
  - Rotation 이후 이전 refresh token 재사용이 감지되면 응답 메시지는 `비정상적인 접근이 감지되어 모든 인증이 만료되었습니다. 다시 로그인해주세요.`
  - 이 경우 서버는 해당 사용자의 Refresh Token을 모두 제거하고 재로그인을 요구한다.

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

- 서버 로그아웃 호출이 실패하더라도 프런트는 클라이언트 인증 상태를 정리해 사용자 세션을 종료해야 한다.

### `POST /api/session/clear-refresh-cookie`

- 설명: `/api/auth` 경로에 남아 있는 `refresh_token` cookie를 강제로 만료시켜 세션 복구를 돕는다.
- 인증: Public
- 멱등성: 약한 멱등

#### 사용 목적

- `refresh_token`이 malformed 상태이거나 브라우저 레벨에서 비정상 요청을 만들면 `/api/auth/login`, `/api/auth/refresh`가 애플리케이션 전에 차단될 수 있다.
- 이 endpoint는 `/api/auth` 밖에 두어, 문제가 된 cookie를 보내지 않고도 기존 `refresh_token`을 만료시킬 수 있게 한다.

#### Response

- 상태 코드: `200 OK`
- `data`: `null`
- `refresh_token` cookie는 `Path=/api/auth`, `maxAge=0`으로 만료 처리된다.

### `GET /api/me`

- 설명: 로그인 사용자의 전역 사용자 컨텍스트를 조회한다.
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
| `data.userId` | Number | 로그인 사용자 ID |
| `data.email` | String | 로그인 사용자 이메일 |
| `data.nickname` | String | 로그인 사용자 닉네임 |
| `data.role` | String | 로그인 사용자 권한 (`ROLE_USER`, `ROLE_ADMIN`) |

#### 비고

- 상세 프로필과 기록 목록은 `/api/users/me/profile`, `/api/users/me/records`로 분리되어 있다.

## 7. 마이페이지 API

### `GET /api/users/me/profile`

- 설명: 로그인 사용자의 프로필과 기록 요약을 조회한다.
- 인증: Access Token 필요
- 멱등성: 멱등

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.userId` | Number | 로그인 사용자 ID |
| `data.nickname` | String | 로그인 사용자 닉네임 |
| `data.mainEvent` | String | 로그인 사용자 주 종목 |
| `data.summary.totalSolveCount` | Number | 전체 기록 수 |
| `data.summary.personalBestTimeMs` | Number / Null | penalty 반영 유효 시간 기준 PB (밀리초) |
| `data.summary.averageTimeMs` | Number / Null | `DNF` 제외 평균 기록 (밀리초) |

### `GET /api/users/me/records`

- 설명: 로그인 사용자의 전체 기록을 페이지 단위로 조회한다.
- 인증: Access Token 필요
- 멱등성: 멱등

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `page` | Number | 아니오 | 1부터 시작하는 페이지 번호, 기본값 `1` |
| `size` | Number | 아니오 | 페이지 크기, 기본값 `10`, 최대 `100` |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.items[].id` | Number | 기록 ID |
| `data.items[].eventType` | String | WCA 종목 코드 |
| `data.items[].timeMs` | Number | 원본 측정 시간(밀리초) |
| `data.items[].effectiveTimeMs` | Number / Null | penalty 반영 유효 시간(밀리초), `DNF`면 `null` |
| `data.items[].penalty` | String | `NONE`, `PLUS_TWO`, `DNF` |
| `data.items[].createdAt` | String | 기록 생성 시각 |
| `data.page` | Number | 현재 페이지 번호 |
| `data.size` | Number | 페이지 크기 |
| `data.totalElements` | Number | 전체 기록 수 |
| `data.totalPages` | Number | 전체 페이지 수 |
| `data.hasNext` | Boolean | 다음 페이지 존재 여부 |
| `data.hasPrevious` | Boolean | 이전 페이지 존재 여부 |

### `PATCH /api/users/me/profile`

- 설명: 로그인 사용자의 닉네임과 주 종목을 수정한다.
- 인증: Access Token 필요
- 멱등성: 약한 멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `nickname` | String | 예 | 2자 이상 50자 이하 닉네임 |
| `mainEvent` | String | 예 | 주 종목 WCA 코드 (`WCA_333` 등) |

#### 에러 계약

- `400 Bad Request`
  - 중복 닉네임이면 응답 메시지는 `이미 사용 중인 닉네임입니다.`
  - `mainEvent`가 유효한 WCA 종목 코드가 아니면 응답 메시지는 `잘못된 입력값입니다: 주 종목은 유효한 WCA 종목 코드여야 합니다.`

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

### `PATCH /api/users/me/password`

- 설명: 로그인 사용자의 비밀번호를 변경하고 기존 refresh token을 무효화한다.
- 인증: Access Token 필요
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `currentPassword` | String | 예 | 현재 비밀번호, 최대 64자 / UTF-8 기준 최대 72바이트 |
| `newPassword` | String | 예 | 새 비밀번호, 8자 이상 64자 이하 / UTF-8 기준 최대 72바이트 |

#### 에러 계약

- `400 Bad Request`
  - 현재 비밀번호가 일치하지 않으면 응답 메시지는 `현재 비밀번호가 일치하지 않습니다.`
  - 새 비밀번호가 현재 비밀번호와 같으면 응답 메시지는 `새 비밀번호는 현재 비밀번호와 달라야 합니다.`

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

## 8. 기록 API

### `POST /api/records`

- 설명: 사용자의 solve 기록을 저장하고, PB가 바뀌면 `user_pbs`와 Redis 랭킹 읽기 모델을 함께 갱신한다.
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

### `PATCH /api/records/{recordId}`

- 설명: 본인 기록의 penalty를 수정하고, 변경 후 `user_pbs`를 다시 계산하며 PB 변경 시 Redis 랭킹 읽기 모델을 동기화한다.
- 인증: Access Token 필요
- 인가: 기록 소유자 본인
- 멱등성: 약한 멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `recordId` | Number | 수정할 기록 ID |

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `penalty` | String | 예 | `NONE`, `PLUS_TWO`, `DNF` |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.id` | Number | 수정된 기록 ID |
| `data.eventType` | String | WCA 종목 코드 |
| `data.timeMs` | Number | 원본 측정 시간(밀리초) |
| `data.effectiveTimeMs` | Number / Null | penalty 반영 유효 시간(밀리초), `DNF`면 `null` |
| `data.penalty` | String | 수정 후 penalty |

### `DELETE /api/records/{recordId}`

- 설명: 본인 기록을 삭제하고, 삭제 대상이 PB면 `user_pbs`를 다시 계산하며 Redis 랭킹 읽기 모델을 갱신하거나 제거한다.
- 인증: Access Token 필요
- 인가: 기록 소유자 본인
- 멱등성: 멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `recordId` | Number | 삭제할 기록 ID |

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

## 9. 랭킹 API

### `GET /api/rankings`

- 설명: 종목별 글로벌 랭킹을 반환한다.
- 인증: Public
- 멱등성: 멱등

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `eventType` | String | 예 | 조회할 WCA 종목 코드 |
| `nickname` | String | 아니오 | 닉네임 포함 검색어, 최대 50자 |
| `page` | Number | 아니오 | 1부터 시작하는 페이지 번호, 기본값 `1` |
| `size` | Number | 아니오 | 페이지 크기, 기본값 `25`, 최대 `100` |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.items[].rank` | Number | 검색 결과에서도 유지되는 전체 랭킹 순위 |
| `data.items[].nickname` | String | 사용자 닉네임 |
| `data.items[].eventType` | String | WCA 종목 코드 |
| `data.items[].timeMs` | Number | PB 기준 기록 시간(밀리초) |
| `data.page` | Number | 현재 페이지 번호 |
| `data.size` | Number | 페이지 크기 |
| `data.totalElements` | Number | 전체 랭킹 수 |
| `data.totalPages` | Number | 전체 페이지 수 |
| `data.hasNext` | Boolean | 다음 페이지 존재 여부 |
| `data.hasPrevious` | Boolean | 이전 페이지 존재 여부 |

#### 상태 메모

- 상태: V2
- `nickname`이 비어 있고 Redis 준비 상태 키가 있으면 Redis ZSET 읽기 모델을 사용한다.
- `nickname` 검색 요청 또는 Redis 미준비 상태는 MySQL `user_pbs` QueryDSL 대체 경로를 사용한다.
- `nickname` 검색 대체 경로는 MySQL 8 window function(`ROW_NUMBER() OVER (...)`)을 전제로 한다.
- 정렬 기준은 `best_time_ms asc -> record.created_at asc -> record.id asc`를 유지한다.
- `nickname` 검색 결과는 필터된 집합 안의 재계산 순위가 아니라 전체 랭킹 기준 순위를 유지한다.
- 응답 형식, 검색 계약, 서버 페이지네이션은 V1과 동일하게 유지한다.
- MySQL `records` / `user_pbs`는 기준 데이터이고 Redis는 읽기 최적화를 위한 보조 읽기 모델이다.

## 10. 스크램블 API

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

#### 상태 메모

- 지원 범위: `WCA_333`
- 이 API는 타이머용 요청마다 새 랜덤 스크램블을 생성한다.
- 홈의 `todayScramble` 일일 고정 정책과는 분리된 경로다.
- 미지원 종목 요청 시 `400 Bad Request`를 반환한다.

## 11. 게시판 API

### `POST /api/posts`

- 설명: 게시글을 생성한다.
- 인증: Access Token 필요
- 추가 인가: `category=NOTICE`는 `ROLE_ADMIN`만 작성 가능
- 요청 형식: `application/json` 또는 `multipart/form-data`
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `category` | String | 예 | `NOTICE`, `FREE` (`NOTICE`는 `ROLE_ADMIN`만 작성 가능) |
| `title` | String | 예 | 게시글 제목, 최대 100자 |
| `content` | String | 예 | 게시글 본문, 최대 2000자 |

#### Multipart Part

| 파트 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `request` | JSON | 예 | 게시글 생성 payload |
| `images` | File Array | 아니오 | 첨부 이미지 배열 (`jpg`, `jpeg`, `png`, `webp`, 최대 5장) |

#### Response

- 상태 코드: `201 Created`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.id` | Number | 생성된 게시글 ID |

#### 실패 응답

- `400 Bad Request`
  - validation 실패 시 응답 메시지는 `잘못된 입력값입니다: ...` 형식을 사용하고, 게시글 작성에서는 `카테고리는 필수입니다.`, `제목은 필수입니다.`, `내용은 필수입니다.` 같은 사용자 문구를 반환한다.
- `503 Service Unavailable`
  - 이미지 업로드 저장소를 사용할 수 없으면 응답 메시지는 `이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.`

### `GET /api/posts`

- 설명: 게시글 목록을 조회한다.
- 인증: Public
- 멱등성: 멱등

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `category` | String | 아니오 | 게시판 카테고리 (`NOTICE`, `FREE`) |
| `keyword` | String | 아니오 | 제목/본문 키워드, 최대 100자 |
| `author` | String | 아니오 | 작성자 닉네임, 최대 50자 |
| `page` | Number | 아니오 | 조회할 페이지 번호, 기본값 `1` |
| `size` | Number | 아니오 | 페이지당 게시글 수, 기본값 `8` |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.items[]` | Array | 게시글 목록 |
| `data.items[].id` | Number | 게시글 ID |
| `data.items[].category` | String | 게시판 카테고리 |
| `data.items[].title` | String | 제목 |
| `data.items[].authorNickname` | String | 작성자 닉네임 |
| `data.items[].viewCount` | Number | 조회수 |
| `data.items[].createdAt` | String | 작성 시각 |
| `data.page` | Number | 현재 페이지 번호 |
| `data.size` | Number | 페이지당 게시글 수 |
| `data.totalElements` | Number | 전체 게시글 수 |
| `data.totalPages` | Number | 전체 페이지 수 |
| `data.hasNext` | Boolean | 다음 페이지 존재 여부 |
| `data.hasPrevious` | Boolean | 이전 페이지 존재 여부 |

### `GET /api/posts/{postId}`

- 설명: 게시글 상세를 조회한다.
- 인증: Public
- 추가 동작: 로그인 사용자의 첫 조회일 때만 `viewCount`가 증가하고, 비로그인 사용자는 조회수에 반영되지 않는다.
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
| `data.attachments[]` | Array | 첨부 이미지 목록 |
| `data.attachments[].id` | Number | 첨부 이미지 ID |
| `data.attachments[].imageUrl` | String | 첨부 이미지 URL |
| `data.attachments[].originalFileName` | String | 원본 파일명 |
| `data.attachments[].displayOrder` | Number | 표시 순서 |
| `data.createdAt` | String | 작성 시각 |
| `data.updatedAt` | String | 수정 시각 |

### `GET /api/posts/{postId}/edit`

- 설명: 게시글 수정 화면에 필요한 상세 정보를 조회한다.
- 인증: Access Token 필요
- 멱등성: 멱등
- 추가 동작: 조회수는 증가하지 않는다. 작성자 본인 또는 관리자만 접근할 수 있다.

#### Path Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `postId` | Number | 예 | 조회할 게시글 ID |

#### 에러 계약

- `401 Unauthorized`
  - 인증이 없거나 유효하지 않으면 응답 메시지는 `인증이 필요합니다.`
- `403 Forbidden`
  - 작성자 본인 또는 관리자가 아니면 응답 메시지는 `게시글 수정/삭제 권한이 없습니다.`
- `404 Not Found`
  - 게시글이 없으면 응답 메시지는 `게시글을 찾을 수 없습니다.`

#### Response

- 상태 코드: `200 OK`
- `data`: 게시글 수정 화면 사전 조회 정보

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.id` | Number | 게시글 ID |
| `data.category` | String | 게시판 카테고리 |
| `data.title` | String | 게시글 제목 |
| `data.content` | String | 게시글 본문 |
| `data.authorNickname` | String | 작성자 닉네임 |
| `data.viewCount` | Number | 현재 조회수 |
| `data.attachments` | Array | 첨부 이미지 목록 |
| `data.attachments[].id` | Number | 첨부 이미지 ID |
| `data.attachments[].imageUrl` | String | 첨부 이미지 URL |
| `data.attachments[].originalFileName` | String | 원본 파일명 |
| `data.attachments[].displayOrder` | Number | 표시 순서 |
| `data.createdAt` | String | 작성 시각 |
| `data.updatedAt` | String | 수정 시각 |

### `PUT /api/posts/{postId}`

- 설명: 게시글을 수정한다.
- 인증: Access Token 필요
- 인가: 작성자 본인 또는 `ROLE_ADMIN`
- 추가 인가: `category=NOTICE`는 `ROLE_ADMIN`만 설정 가능
- 요청 형식: `application/json` 또는 `multipart/form-data`
- 멱등성: 멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `postId` | Number | 수정할 게시글 ID |

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `category` | String | 예 | 수정할 카테고리 (`NOTICE`는 `ROLE_ADMIN`만 설정 가능) |
| `title` | String | 예 | 수정할 제목, 최대 100자 |
| `content` | String | 예 | 수정할 본문, 최대 2000자 |
| `retainedAttachmentIds[]` | Number | 아니오 | 수정 후 유지할 기존 첨부 이미지 ID 목록 |

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

#### 실패 응답

- `400 Bad Request`
  - `retainedAttachmentIds`가 현재 첨부 목록과 맞지 않으면 응답 메시지는 `기존 첨부 이미지 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.`
  - validation 실패 시 응답 메시지는 `잘못된 입력값입니다: ...` 형식을 사용하고, 게시글 수정에서는 `카테고리는 필수입니다.`, `제목은 필수입니다.`, `내용은 필수입니다.` 같은 사용자 문구를 반환한다.
- `503 Service Unavailable`
  - 새 이미지 업로드 중 저장소 문제가 발생하면 응답 메시지는 `이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.`

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

## 12. 댓글 API

### `GET /api/posts/{postId}/comments`

- 설명: 게시글 댓글 목록을 최신순으로 조회한다.
- 인증: Public
- 멱등성: 멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `postId` | Number | 댓글을 조회할 게시글 ID |

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `page` | Number | 아니오 | 조회할 페이지 번호, 기본값 `1` |
| `size` | Number | 아니오 | 페이지당 댓글 수, 기본값 `5` |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.items[]` | Array | 댓글 목록 |
| `data.items[].id` | Number | 댓글 ID |
| `data.items[].authorNickname` | String | 작성자 닉네임 |
| `data.items[].content` | String | 댓글 본문 |
| `data.items[].createdAt` | String | 작성 시각 |
| `data.page` | Number | 현재 페이지 번호 |
| `data.size` | Number | 페이지당 댓글 수 |
| `data.totalElements` | Number | 전체 댓글 수 |
| `data.totalPages` | Number | 전체 페이지 수 |
| `data.hasNext` | Boolean | 다음 페이지 존재 여부 |
| `data.hasPrevious` | Boolean | 이전 페이지 존재 여부 |

### `POST /api/posts/{postId}/comments`

- 설명: 게시글에 댓글을 생성한다.
- 인증: Access Token 필요
- 멱등성: 비멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `postId` | Number | 댓글을 생성할 게시글 ID |

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `content` | String | 예 | 댓글 본문, 최대 500자 |

#### Response

- 상태 코드: `201 Created`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.id` | Number | 생성된 댓글 ID |

#### 실패 응답

- `400 Bad Request`
  - validation 실패 시 응답 메시지는 `잘못된 입력값입니다: ...` 형식을 사용하고, 댓글 작성에서는 `댓글 내용은 필수입니다.` 같은 사용자 문구를 반환한다.

### `DELETE /api/posts/{postId}/comments/{commentId}`

- 설명: 게시글 댓글을 삭제한다.
- 인증: Access Token 필요
- 인가: 댓글 작성자 본인 또는 `ROLE_ADMIN`
- 멱등성: 멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `postId` | Number | 댓글이 속한 게시글 ID |
| `commentId` | Number | 삭제할 댓글 ID |

#### Response

- 상태 코드: `200 OK`
- `data`: `null`

## 13. 홈 대시보드 API

### `GET /api/home`

- 설명: 홈 화면에 필요한 오늘의 스크램블, 최신 게시글, 로그인 사용자 요약/최근 기록을 한 번에 조회한다.
- 인증: Public. Access Token이 있으면 개인화 데이터까지 함께 반환한다.
- 멱등성: 멱등

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.todayScramble.eventType` | String | 오늘의 스크램블 종목 코드 |
| `data.todayScramble.scramble` | String | `Asia/Seoul` 날짜 기준으로 고정된 스크램블 문자열 |
| `data.summary` | Object / Null | 로그인 사용자는 요약 객체, guest는 `null` |
| `data.summary.nickname` | String | 로그인 사용자 닉네임 |
| `data.summary.mainEvent` | String | 로그인 사용자 주 종목 |
| `data.summary.totalSolveCount` | Number | 전체 기록 수 |
| `data.summary.personalBestTimeMs` | Number / Null | 유효 시간 기준 최고 기록 |
| `data.summary.averageTimeMs` | Number / Null | DNF 제외 평균 기록 |
| `data.recentRecords` | Array | 최근 기록 최대 5건. guest는 빈 배열 |
| `data.recentRecords[].id` | Number | 기록 ID |
| `data.recentRecords[].eventType` | String | WCA 종목 코드 |
| `data.recentRecords[].timeMs` | Number | 원본 측정 시간 |
| `data.recentRecords[].effectiveTimeMs` | Number / Null | 페널티 반영 시간 |
| `data.recentRecords[].penalty` | String | 페널티 |
| `data.recentRecords[].scramble` | String | 기록 스크램블 |
| `data.recentRecords[].createdAt` | String | 기록 생성 시각 |
| `data.recentPosts` | Array | 최신 커뮤니티 게시글 최대 3건 |
| `data.recentPosts[].id` | Number | 게시글 ID |
| `data.recentPosts[].category` | String | 게시글 카테고리 |
| `data.recentPosts[].title` | String | 게시글 제목 |
| `data.recentPosts[].authorNickname` | String | 작성자 닉네임 |
| `data.recentPosts[].viewCount` | Number | 게시글 조회수 |
| `data.recentPosts[].createdAt` | String | 게시글 생성 시각 |

#### 상태 메모

- `todayScramble`은 `Asia/Seoul` 날짜 기준으로 같은 날에는 같은 값을 반환한다.
- 다음 날짜로 넘어가면 새 스크램블로 바뀔 수 있다.

## 14. 피드백 API

### `POST /api/feedbacks`

- 설명: 버그 제보, 기능 제안 등 사용자 피드백을 저장하고 Discord 운영 알림 전송을 시도한다.
- 인증: Access Token 필요
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | 예 | 피드백 종류 (`BUG`, `FEATURE`, `UX`, `OTHER`) |
| `title` | String | 예 | 피드백 제목, 최대 100자 |
| `replyEmail` | String | 예 | 회신 받을 이메일 주소, 최대 255자 |
| `content` | String | 예 | 피드백 상세 내용, 최대 2000자 |

#### Response

- 상태 코드: `201 Created`
- `data.id`: 생성된 피드백 ID
- `replyEmail`은 제출 시점의 회신용 이메일 주소로 저장한다.
- Discord 운영 알림 시도 결과는 서버 내부 상태와 관리자 화면에서 추적하고, 일반 사용자 응답에는 노출하지 않는다.
- 응답 메시지는 일반 사용자 기준 `피드백이 접수되었습니다. 감사합니다!`를 사용한다.

#### 실패 응답

- `400 Bad Request`
  - validation 실패 시 응답 메시지는 `잘못된 입력값입니다: ...` 형식을 사용하고, 피드백 작성에서는 `피드백 종류는 필수입니다.`, `제목은 필수입니다.`, `회신 이메일은 필수입니다.`, `올바른 이메일 형식이 아닙니다.`, `내용은 필수입니다.` 같은 사용자 문구를 반환한다.
- `401 Unauthorized`
  - `Authorization` 헤더가 없거나 유효하지 않으면 응답 메시지는 `인증이 필요합니다.`

### `GET /api/qna`

- 설명: 공개된 질문/답변 목록을 조회한다.
- 인증: Public
- 노출 조건: `visibility=PUBLIC` 이고 답변이 있는 피드백만 포함한다.

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `page` | Number | 아니오 | 조회할 페이지 번호, 기본값 `1` |
| `size` | Number | 아니오 | 페이지당 항목 수, 기본값 `8` |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.items[]` | Array | 공개 질문/답변 목록 |
| `data.items[].id` | Number | 피드백 ID |
| `data.items[].type` | String | 피드백 종류 |
| `data.items[].title` | String | 질문 제목 |
| `data.items[].content` | String | 질문 본문 |
| `data.items[].answer` | String | 관리자 답변 |
| `data.items[].questionerLabel` | String | 질문자 표시 라벨 (`사용자`) |
| `data.items[].answererLabel` | String | 답변자 표시 라벨 (`관리자`) |
| `data.items[].createdAt` | String | 질문 작성 시각 |
| `data.items[].answeredAt` | String | 답변 시각 |
| `data.items[].publishedAt` | String | 공개 시각 |

### `GET /api/qna/{feedbackId}`

- 설명: 공개된 질문/답변 상세를 조회한다.
- 인증: Public

#### Path Parameter

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `feedbackId` | Number | 예 | 조회할 공개 질문 ID |

#### Response

- `GET /api/qna`의 단건 상세 구조와 동일하다.

### `GET /api/admin/feedbacks`

- 설명: 관리자 피드백 목록을 조회한다.
- 인증: `ROLE_ADMIN`

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `answered` | Boolean | 아니오 | 답변 여부 필터 |
| `visibility` | String | 아니오 | 공개 여부 필터 (`PRIVATE`, `PUBLIC`) |
| `page` | Number | 아니오 | 조회할 페이지 번호, 기본값 `1` |
| `size` | Number | 아니오 | 페이지당 항목 수, 기본값 `8` |

### `GET /api/admin/feedbacks/{feedbackId}`

- 설명: 관리자 피드백 상세를 조회한다.
- 인증: `ROLE_ADMIN`
- 추가 데이터: `replyEmail`, Discord 운영 알림 상태, 답변/공개 시각을 함께 반환한다.

### `PATCH /api/admin/feedbacks/{feedbackId}/answer`

- 설명: 관리자 답변을 저장한다.
- 인증: `ROLE_ADMIN`

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `answer` | String | 예 | 관리자 답변 내용, 최대 2000자 |

#### 실패 응답

- `400 Bad Request`
  - validation 실패 시 응답 메시지는 `잘못된 입력값입니다: 답변은 필수입니다.`

### `PATCH /api/admin/feedbacks/{feedbackId}/visibility`

- 설명: 피드백 질문/답변 묶음의 공개 상태를 변경한다.
- 인증: `ROLE_ADMIN`
- 제약: 답변이 있는 피드백만 `PUBLIC` 전환할 수 있다.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `visibility` | String | 예 | 변경할 공개 상태 (`PRIVATE`, `PUBLIC`) |

### `GET /api/admin/memos`

- 설명: 관리자 내부 메모 목록을 최신 수정순으로 조회한다.
- 인증: `ROLE_ADMIN`

#### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `page` | Number | 아니오 | 조회할 페이지 번호, 기본값 `1` |
| `size` | Number | 아니오 | 페이지당 항목 수, 기본값 `8` |

### `POST /api/admin/memos`

- 설명: 관리자 내부 메모를 생성한다.
- 인증: `ROLE_ADMIN`

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `question` | String | 예 | 내부 질문, 최대 500자 |
| `answer` | String | 아니오 | 내부 답변, 최대 2000자 |

#### 실패 응답

- `400 Bad Request`
  - validation 실패 시 응답 메시지는 `잘못된 입력값입니다: 질문은 필수입니다.`

### `GET /api/admin/memos/{memoId}`

- 설명: 관리자 메모 상세를 조회한다.
- 인증: `ROLE_ADMIN`

### `PATCH /api/admin/memos/{memoId}`

- 설명: 관리자 메모를 수정한다.
- 인증: `ROLE_ADMIN`
- Request Body: `POST /api/admin/memos`와 동일하다.

#### 실패 응답

- `400 Bad Request`
  - validation 실패 시 응답 메시지는 `잘못된 입력값입니다: 질문은 필수입니다.`

### `DELETE /api/admin/memos/{memoId}`

- 설명: 관리자 메모를 삭제한다.
- 인증: `ROLE_ADMIN`

## 15. 문서화 메모

- API 문서 생성 기준은 `backend/src/docs/asciidoc/index.adoc`와 REST Docs 통합 테스트다.
- 상세 스니펫은 `AuthDocsTest`, `UserContextDocsTest`, `UserProfileDocsTest`, `RecordDocsTest`, `RankingDocsTest`, `ScrambleDocsTest`, `HomeDocsTest`, `FeedbackDocsTest`, `FeedbackManagementDocsTest`, `PostDocsTest`, `AdminMemoDocsTest`, `CommentDocsTest`에서 생성된다.

## 16. 미확정 사항

- Discord 운영 알림 자동 재시도 큐 또는 백오피스 조회 화면을 추가할지 여부
- 운영 환경에서의 Redis 재구축 시점과 트리거 정책
- 랭킹 `nickname` 검색을 Redis secondary index로 확장할지 여부
