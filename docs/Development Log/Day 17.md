# Development Log - 2026-04-15

프로젝트: Cubing Hub

---

## 오늘 작업

- `README`를 현재 구현/운영 기준으로 다시 쓰고 frontend 검증 workflow를 추가했다
- backend/frontend split CI, 실패 산출물 업로드, `JaCoCo` 기준선을 같은 날 정리했다
- Development Log 파일명 정렬 기준을 정리해 이후 날짜 로그를 두 자리수 형식으로 맞췄다
- `GET /api/posts`에 `category`, `keyword`, `author`, `page`, `size`를 반영하고 페이지 메타데이터 응답을 추가
- `CommunityPage`를 실제 목록 API와 연결하고 카테고리 필터, 검색, 페이지네이션, `loading/empty/error` 상태를 구현
- `/api/me.role` 확장과 함께 `CommunityWritePage`, `CommunityDetailPage`를 실제 작성/상세/삭제 흐름에 연결
- 댓글 도메인 API와 `CommunityDetailPage` 댓글 영역을 5개 페이지네이션 기준으로 실연동
- public `GET /api/home`를 추가하고 guest/auth 홈 조합 응답과 `HomePage` 실연동을 마감
- `POST /api/feedbacks`를 로그인 전용으로 구현하고 `user_id + reply_email` 저장 구조와 `FeedbackPage`를 연동
- REST Docs, 설계 문서, 일정 문서, 허브 로그를 `2026-04-15` 구현 상태와 맞게 동기화
- `cd backend && ./gradlew build`, `cd frontend && npm run test -- --run`, `npm run lint`, `npm run build`로 전체 자동 회귀 검증 실행

---

## 핵심 구현 상세

### 구현 슬라이스 전후로 README, CI, 품질 기준도 먼저 정리했다

#### 작업 내용
- `README.md`를 mock 중심 설명에서 현재 구현/검증/운영 기준선 문서로 다시 정리했다.
- frontend 검증 workflow를 추가하고, 이후 backend/frontend CI를 분리해 실패 산출물 회수 경로까지 정리했다.
- `JaCoCo` 기준선을 보강해 서비스/보안/인증 핵심 경로의 테스트 근거를 강화했다.
- `Day 01`처럼 한 자리수 파일명을 `Day 01.md` 형식으로 정렬하는 기준도 이 시점에 맞췄다.

#### 결과
- 같은 날 진행한 커뮤니티/댓글/홈/피드백 실연동이 문서, CI, 커버리지 기준선과 함께 정리됐다.
- 이후 날짜 로그도 두 자리수 파일명 기준으로 일관되게 관리할 수 있게 됐다.

### 커뮤니티 목록 계약과 화면 실연동

#### 문제 상황
- 게시글 목록 API는 검색/페이지네이션 기준이 프런트 요구사항과 맞지 않았다.
- `CommunityPage`는 목업 데이터와 로컬 상태에 의존하고 있어 실제 목록, 검색, 필터, 페이지 이동 흐름을 검증할 수 없었다.

#### 해결 방법
- `GET /api/posts`에 `category`, `keyword`, `author`, `page`, `size`를 추가하고 페이지 메타데이터를 응답에 포함시켰다.
- QueryDSL 검색 로직에 카테고리/작성자/키워드 조건과 total count 계산을 넣었다.
- `CommunityPage`를 실제 API와 연결하고 카테고리 필터, 제목/본문 검색, 작성자 검색, 페이지 이동, `loading/empty/error` 상태를 구현했다.

#### 결과
- 커뮤니티 목록은 서버 계약 기준으로 검색과 페이지 이동이 가능한 상태가 됐다.
- 목록 API 계약, 프런트 동작, REST Docs HTML이 같은 구조로 맞춰졌다.

### 게시글 상세/작성/삭제와 관리자 기준 정렬

#### 문제 상황
- 커뮤니티 상세/작성 화면은 실제 API와 연결되지 않았고, 관리자/작성자 기준 버튼 노출도 하드코딩된 사용자 전제에 의존하고 있었다.

#### 해결 방법
- `/api/me`에 `role`을 포함시켜 프런트가 관리자 여부를 판단할 수 있게 했다.
- `CommunityWritePage`를 `POST /api/posts`에 연결하고 관리자 로그인 시에만 `NOTICE` 카테고리를 노출했다.
- `CommunityDetailPage`를 `GET /api/posts/{postId}`, `DELETE /api/posts/{postId}`와 연결하고 작성자 본인 또는 관리자에게만 삭제 버튼을 노출했다.
- 서버는 기존 권한 정책을 유지하면서 `NOTICE` 작성/수정은 관리자만 가능하도록 정리했다.

#### 결과
- 커뮤니티 작성, 상세, 삭제 흐름이 실제 인증/권한 정책 기준으로 동작하게 됐다.
- 프런트 하드코딩 사용자 전제와 목업 성공 메시지를 제거했다.

### 댓글 API와 커뮤니티 상세 댓글 실연동

#### 문제 상황
- 댓글 도메인은 문서상 요구사항만 있었고, 실제 백엔드 API와 프런트 연동이 없었다.

#### 해결 방법
- `GET/POST /api/posts/{postId}/comments`, `DELETE /api/posts/{postId}/comments/{commentId}`를 구현했다.
- 댓글 목록은 최신순 5개 페이지네이션으로 고정하고, 삭제 권한은 작성자 본인 또는 관리자 기준으로 맞췄다.
- `CommunityDetailPage` 댓글 영역을 실제 API와 연결하고 목록, 작성, 삭제, 페이지 이동, 비로그인 CTA, 재시도 상태를 넣었다.

#### 결과
- 커뮤니티 상세에서 댓글 읽기/작성/삭제 흐름이 서버 정책과 함께 정리됐다.
- 댓글 관련 REST Docs, API 문서, 화면 문서가 현재 구현 상태와 맞게 갱신됐다.

### 홈 대시보드 API와 guest/auth 홈 분기

#### 문제 상황
- 홈 화면은 목업 데이터에 의존하고 있었고, guest와 로그인 사용자 기준으로 필요한 데이터 조합도 코드에 고정되어 있지 않았다.

#### 해결 방법
- public `GET /api/home`를 추가해 공통 필드 `todayScramble`, `recentPosts`와 인증 사용자 전용 `summary`, `recentRecords`를 한 응답으로 조합했다.
- guest 홈은 `오늘의 스크램블 + 서비스 소개/CTA + 최신 커뮤니티 글 3건`, 로그인 홈은 `오늘의 스크램블 + 요약 카드 + 최근 기록`으로 고정했다.
- `HomePage`를 실제 API와 연결하고 `loading`, `error`, `retry`, `empty` 상태를 반영했다.

#### 결과
- 홈 화면은 guest/auth 상태별로 다른 조합을 같은 endpoint에서 안정적으로 받게 됐다.
- 최신 커뮤니티 글은 홈 응답의 공통 필드로 정리되어 이후 확장 여지도 남겼다.

### 로그인 전용 피드백과 제출 시점 회신 이메일

#### 문제 상황
- 피드백은 초기 계획상 공개 제출도 고려했지만, 회원가입 유도와 회신 경로 보존 측면에서 로그인 전용 정책이 더 적합했다.

#### 해결 방법
- `POST /api/feedbacks`를 로그인 전용으로 구현하고 제출자를 `user_id`로 연결했다.
- 제출 시점 회신 주소를 보존하기 위해 `reply_email` 컬럼과 `replyEmail` 요청 필드를 추가했다.
- `FeedbackPage`는 현재 로그인 사용자 이메일을 기본값으로 채우되 수정 가능하게 구현했다.
- 성공 시 폼을 초기화하고 `replyEmail`은 현재 사용자 이메일로 복원하도록 정리했다.

#### 결과
- 피드백은 인증 사용자 기준으로 누가 제출했는지와 어느 주소로 회신할지 둘 다 보존하게 됐다.
- DB 저장 전략을 유지하면서 메일 인프라 없이도 운영 가능한 MVP 경로가 확보됐다.

### 문서 동기화와 자동/수동 검증 마감

#### 작업 내용
- `API Specification`, `Screen Specification`, `Database Design`, `Authentication & Authorization Design`, `Project Overview`를 `2026-04-15` 최종 구현 상태와 맞췄다.
- `Project Schedule`, `Internal Schedule.internal`, `dev-log.md`와 `2026-04-15` 원본 로그를 갱신했다.
- `backend` 전체 `build`와 `frontend` 전체 `test/lint/build`를 다시 실행했다.
- 브라우저에서 커뮤니티, 댓글, 홈, 피드백, 권한 분기 수동 점검을 끝냈다.

#### 결과
- generated REST Docs HTML과 사람이 읽는 설계 문서가 현재 코드와 같은 기준으로 맞춰졌다.
- 자동 회귀 기준선은 통과했고, 브라우저 수동 흐름도 모두 정상 동작을 확인했다.

---

## 사용 기술

- Spring Boot
- Spring Security
- Spring REST Docs
- JPA / QueryDSL
- React
- React Router
- Vitest
- Testing Library

---

## 검증

- `cd backend && ./gradlew build`
- `cd frontend && npm run test -- --run`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

자동 검증은 모두 통과했다.

### 수동 검증

- 아래 항목을 브라우저에서 수동 확인했다.
  - 커뮤니티 목록/상세/작성/삭제
  - 댓글 작성/삭제와 5개 페이지네이션
  - guest/auth 홈 분기와 CTA
  - 로그인 전용 피드백 제출과 `replyEmail` 기본값/복원
  - 일반 사용자/관리자 권한 노출과 삭제 정책
