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
| `500` | 서버 내부 오류 | `GlobalExceptionHandler.handleGenericException` | 재시도 안내 및 운영 로그 확인 |

## 5. 구현 API 목록

| Method | Path | 인증 | 설명 | 상태 |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Public | 회원가입 | 구현됨 |
| `POST` | `/api/auth/login` | Public | 로그인 | 구현됨 |
| `POST` | `/api/auth/refresh` | Public + Cookie | 토큰 재발급 | 구현됨 |
| `POST` | `/api/auth/logout` | 인증 토큰/쿠키 전달 | 로그아웃 | 구현됨 |
| `GET` | `/api/me` | Auth | 로그인 사용자 컨텍스트 조회 | 구현됨 |
| `GET` | `/api/home` | Public + Optional Auth | 홈 대시보드 조회 | 구현됨 |
| `GET` | `/api/users/me/profile` | Auth | 마이페이지 프로필/요약 조회 | 구현됨 |
| `GET` | `/api/users/me/records` | Auth | 마이페이지 전체 기록 페이지 조회 | 구현됨 |
| `POST` | `/api/records` | Auth | 기록 저장 | 구현됨 |
| `PATCH` | `/api/records/{recordId}` | Auth | 기록 penalty 수정 | 구현됨 |
| `DELETE` | `/api/records/{recordId}` | Auth | 기록 삭제 | 구현됨 |
| `GET` | `/api/rankings` | Public | 글로벌 랭킹 조회 | 구현됨 (V1 기준) |
| `GET` | `/api/scramble` | Public | 스크램블 조회 | 구현됨 |
| `POST` | `/api/posts` | Auth | 게시글 생성 | 구현됨 |
| `GET` | `/api/posts` | Public | 게시글 목록 조회 | 구현됨 |
| `GET` | `/api/posts/{postId}` | Public | 게시글 상세 조회 | 구현됨 |
| `PUT` | `/api/posts/{postId}` | Auth | 게시글 수정 | 구현됨 |
| `DELETE` | `/api/posts/{postId}` | Auth | 게시글 삭제 | 구현됨 |
| `GET` | `/api/posts/{postId}/comments` | Public | 댓글 목록 조회 | 구현됨 |
| `POST` | `/api/posts/{postId}/comments` | Auth | 댓글 생성 | 구현됨 |
| `DELETE` | `/api/posts/{postId}/comments/{commentId}` | Auth | 댓글 삭제 | 구현됨 |
| `POST` | `/api/feedbacks` | Auth | 피드백 접수 | 구현됨 |

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

## 8. 기록 API

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

### `PATCH /api/records/{recordId}`

- 설명: 본인 기록의 penalty를 수정하고, 변경 후 `user_pbs`를 다시 계산한다.
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

- 설명: 본인 기록을 삭제하고, 삭제 대상이 PB면 `user_pbs`를 다시 계산한다.
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
| `nickname` | String | 아니오 | 닉네임 포함 검색어 |
| `page` | Number | 아니오 | 1부터 시작하는 페이지 번호, 기본값 `1` |
| `size` | Number | 아니오 | 페이지 크기, 기본값 `25`, 최대 `100` |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `data.items[].rank` | Number | 1부터 시작하는 순위 |
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

- 상태: V1
- `user_pbs`와 원본 `records`를 사용해 사용자당 종목별 PB 1건만 조회한다.
- 정렬 기준은 `best_time_ms asc -> record.created_at asc -> record.id asc`다.
- 닉네임 검색과 서버 페이지네이션을 지원한다.
- 최종 목표는 Redis ZSET 기반 실시간 랭킹 구조다.

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
- 미지원 종목 요청 시 `400 Bad Request`를 반환한다.

## 11. 게시판 API

### `POST /api/posts`

- 설명: 게시글을 생성한다.
- 인증: Access Token 필요
- 추가 인가: `category=NOTICE`는 `ROLE_ADMIN`만 작성 가능
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `category` | String | 예 | `NOTICE`, `FREE` (`NOTICE`는 `ROLE_ADMIN`만 작성 가능) |
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
| `category` | String | 아니오 | 게시판 카테고리 (`NOTICE`, `FREE`) |
| `keyword` | String | 아니오 | 제목/본문 키워드 |
| `author` | String | 아니오 | 작성자 닉네임 |
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
- 추가 인가: `category=NOTICE`는 `ROLE_ADMIN`만 설정 가능
- 멱등성: 멱등

#### Path Parameter

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `postId` | Number | 수정할 게시글 ID |

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `category` | String | 예 | 수정할 카테고리 (`NOTICE`는 `ROLE_ADMIN`만 설정 가능) |
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
| `data.todayScramble.scramble` | String | 생성된 스크램블 문자열 |
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

## 14. 피드백 API

### `POST /api/feedbacks`

- 설명: 버그 제보, 기능 제안 등 사용자 피드백을 저장한다.
- 인증: Access Token 필요
- 멱등성: 비멱등

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `type` | String | 예 | 피드백 종류 (`BUG`, `FEATURE`, `UX`, `OTHER`) |
| `title` | String | 예 | 피드백 제목 |
| `replyEmail` | String | 예 | 회신 받을 이메일 주소 |
| `content` | String | 예 | 피드백 상세 내용 |

#### Response

- 상태 코드: `201 Created`
- `data.id`: 생성된 피드백 ID
- `replyEmail`은 제출 시점의 회신용 이메일 주소를 snapshot으로 저장한다.

#### 실패 응답

- `401 Unauthorized`
  - `Authorization` 헤더가 없거나 유효하지 않으면 응답 메시지는 `인증이 필요합니다.`

## 15. 문서화 메모

- API 문서 생성 기준은 `backend/src/docs/asciidoc/index.adoc`와 REST Docs 통합 테스트다.
- 상세 스니펫은 `AuthDocsTest`, `UserContextDocsTest`, `UserProfileDocsTest`, `RecordDocsTest`, `RankingDocsTest`, `ScrambleDocsTest`, `HomeDocsTest`, `FeedbackDocsTest`, `PostDocsTest`, `CommentDocsTest`에서 생성된다.

## 16. 미확정 사항

- 피드백 메일 전달이 필요한 경우의 전송 실패 처리와 운영 정책
- 랭킹 V2 전환 시 `GET /api/rankings` 응답 형식 유지 여부
