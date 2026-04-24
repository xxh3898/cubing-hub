# Development Log - 2026-04-23 (관리자 / 운영 / 마감)

프로젝트: Cubing Hub

> 이 로그는 `2026-04-23`에 들어간 관리자 기능, 게시글 이미지, 운영 안정화, 마감 문서 작업을 같은 날짜 커밋 기준으로 다시 묶어 정리한 기록이다.

---

## 오늘 작업

- 게시글 create/update에 다중 이미지 첨부를 붙이고, 로그인 사용자 기준 고유 조회수 집계를 `post_views(post_id, user_id)`로 추가했다
- 관리자 피드백 API, 공개 Q&A, 관리자 페이지, 관리자 메모를 구현해 `/admin`, `/qna` 흐름을 정리했다
- 외부 인프라 장애를 `400` 입력 오류가 아니라 `503 Service Unavailable`로 분리하고 validation 문구를 사용자용 메시지로 정리했다
- 운영 환경에서 빠져 있던 `POST_IMAGES_*` 런타임 환경 변수 전달을 `docker-compose.prod.yml`에 추가했다
- multipart 요청의 `Content-Type` 헤더가 파일 업로드를 깨뜨리던 문제를 정리하고, 게시글 상세 조회와 조회수 기록을 best-effort로 분리했다
- 운영 DB 연결에 TLS를 강제하고, Flyway migration을 도입해 운영 schema 적용 경로를 명시적으로 고정했다
- frontend API URL 배포 검증, EC2 backend 배포 디스크 정리 절차, Redis 랭킹 재구축 수동 workflow를 추가해 배포 후속 작업을 보강했다
- 기록 조회 인덱스/검색 쿼리 비용 최적화, MyPage 중복 API 호출 제거, Discord 알림 개인정보 노출 제거, frontend 초기 번들 분할을 반영했다
- 같은 날짜 후속 수정으로 커뮤니티 편집 사전 조회와 조회수 집계를 분리하고, 게시글 이미지 업로드 request body 한도를 Nginx와 Spring 기준으로 다시 맞췄다
- `README.md`, 핵심 설계 문서, 일정/허브 로그, `portfolio.internal.md`를 실제 구현/운영 상태 기준으로 마감 동기화했다
- 이후 마감 단계에서 사용자가 확인한 `모든 CI/CD 정상 동작`, `배포환경 전체 기능 수동 검증 완료` 사실을 운영 상태 근거로 반영했다

---

## 핵심 정리 상세

### 1. 관리자 피드백/Q&A/메모 흐름을 한 번에 열었다

#### 구현
- 관리자 전용 `feedback` 목록/상세/답변/공개 전환 API를 추가했다.
- 공개 가능한 답변은 `/qna`에서 일반 사용자도 볼 수 있게 했다.
- 관리자 메모를 별도 엔티티와 API로 분리해 운영 판단 메모를 피드백 본문과 섞지 않게 했다.
- 프런트에는 `/admin` 화면과 메모 입력/수정 흐름을 연결했다.

#### 이유
- 피드백을 단순 수집으로만 두면 운영 후속 대응을 설명하기 어렵다.
- 답변 공개 여부와 내부 메모는 성격이 달라서 같은 필드에 억지로 넣기보다 책임을 분리하는 편이 적절했다.

#### 결과
- 사용자 피드백 수집, 관리자 응답, 공개 Q&A, 내부 메모까지 서비스 운영 흐름 하나로 설명할 수 있게 됐다.

### 2. 게시글 이미지 첨부와 고유 조회수 정책을 같이 고정했다

#### 구현
- 게시글 create/update에서 다중 이미지 첨부를 지원하고, S3 + DB 메타데이터로 첨부 정보를 관리했다.
- 조회수는 `post_views(post_id, user_id)` 고유 기록을 두고, 로그인 사용자의 첫 조회만 `view_count`에 반영하도록 설계했다.
- 비로그인 사용자는 조회수 집계에서 제외했다.

#### 이유
- 이미지 첨부는 커뮤니티 활용도를 높이는 직접 기능이지만, 운영 환경에서는 저장소 설정과 업로드 계약을 같이 설명할 수 있어야 했다.
- 조회수는 단순 요청 수 누적보다 로그인 사용자 기준 고유 집계로 먼저 정책을 명확히 고정하는 편이 현재 범위에서 현실적이었다.

#### 결과
- 커뮤니티 기능이 텍스트 중심 CRUD를 넘어 이미지 공유와 집계 정책까지 갖춘 상태가 됐다.
- 게시글 상세 API와 DB 설계, 포트폴리오 설명 포인트가 같은 정책을 보게 됐다.

### 3. 외부 인프라 오류는 입력 오류와 분리해 `503`으로 정리했다

#### 문제 상황
- SMTP 메일 발송 실패와 게시글 이미지 저장소 실패도 기존에는 `400` 계열 입력 오류처럼 내려갈 수 있었다.
- validation 메시지에는 영어 필드명과 기본 Bean Validation 문구가 그대로 섞여 나올 수 있었다.

#### 해결 방법
- SMTP/S3 같은 외부 연동 실패는 `503 Service Unavailable`과 일반화된 재시도 문구로 분리했다.
- 게시글/댓글/피드백/관리자 답변/메모 request DTO에 사용자용 validation 메시지를 명시했다.
- `GlobalExceptionHandler`의 validation 응답을 `잘못된 입력값입니다: {사용자 문구}` 형식으로 정리했다.

#### 결과
- 사용자 입력 실수와 인프라 장애를 다른 계약으로 설명할 수 있게 됐다.
- 포트폴리오와 면접에서 “왜 400이 아니라 503인가”를 HTTP 의미 기준으로 방어할 수 있게 됐다.

### 4. 운영 게시글 이미지 경로는 환경 변수 전달, multipart, 공개 읽기 점검을 분리해서 봤다

#### 문제 상황
- prod backend는 `application-prod.yaml`에서 `POST_IMAGES_*`를 읽도록 되어 있었지만, compose가 해당 값을 컨테이너에 넘기지 않아 EC2 `.env` 설정이 runtime에 반영되지 않았다.
- frontend 전역 `application/json` 헤더가 multipart 요청에도 남아 있으면 브라우저가 `multipart/form-data; boundary=...`를 자동 설정하지 못해 `400`이 발생했다.
- 서버 업로드가 성공해도 브라우저에서 S3 이미지 URL이 `403`이면 실제 사용자 화면은 깨질 수 있었다.

#### 해결 방법
- `infra/docker/docker-compose.prod.yml`에 `POST_IMAGES_BUCKET`, `POST_IMAGES_REGION`, `POST_IMAGES_KEY_PREFIX`, `POST_IMAGES_PUBLIC_BASE_URL` 전달을 추가했다.
- request interceptor에서 `FormData` 요청이면 `Content-Type` 헤더를 제거하도록 수정한 구조를 문서와 테스트에 반영했다.
- 운영 점검 기준을 `PutObject 성공`, `API가 image URL 반환`, `브라우저가 public URL로 GET 성공`의 세 단계로 분리했다.

#### 결과
- `업로드 성공 == 화면 표시 성공`이 아니라는 운영 점검 기준을 명확히 남길 수 있게 됐다.
- 운영 게시글 이미지 경로를 런타임 환경 변수, HTTP 헤더, S3 공개 읽기 정책으로 나눠 설명할 수 있게 됐다.

### 5. 게시글 상세는 조회수 기록 실패가 있어도 읽기 가용성을 우선하도록 정리했다

#### 문제 상황
- 로그인 상태 게시글 상세 조회에서 조회수 기록이 실패하면 게시글 본문 읽기 자체가 `500`으로 깨질 수 있었다.
- 같은 시점에 수정 화면 사전 조회가 상세 조회를 재사용하면 조회수 정책까지 흔들릴 여지가 있었다.

#### 해결 방법
- `getPost()` 트랜잭션 경계를 override하고, 조회수 기록은 best-effort로 분리했다.
- `GET /api/posts/{postId}/edit` 사전 조회 endpoint를 별도로 두어 수정 화면 진입은 조회수를 증가시키지 않게 했다.
- 게시글 이미지 업로드 request body 한도는 Nginx, Spring multipart, 비즈니스 validation 기준을 다시 맞췄다.

#### 결과
- 조회수 집계 실패가 상세 페이지 전체 장애로 번지는 경로를 줄였다.
- 읽기용 상세 조회와 수정 사전 조회, 업로드 한도 정책까지 각각 역할을 분리할 수 있게 됐다.

### 6. 운영 런타임 보강도 같은 날짜에 함께 마감했다

#### 구현
- 운영 DB 연결에 TLS를 강제했다.
- Flyway migration을 도입해 운영 schema 적용 경로를 명시적으로 고정했다.
- frontend API URL 배포 검증을 추가해 잘못된 env로 재배포되는 실수를 줄였다.
- EC2 backend 배포 전에 디스크 정리 절차를 넣어 이미지 누적으로 인한 배포 실패를 막도록 했다.
- Redis 랭킹 재구축은 startup 상시 옵션이 아니라 수동 workflow로도 실행할 수 있게 분리했다.

#### 결과
- deploy 이후 “앱은 뜨는데 runtime 전제가 틀린 상태”를 줄이는 가드가 늘어났다.
- 운영 복구와 재배포 절차를 코드/문서/워크플로 수준에서 다시 설명할 수 있게 됐다.

### 7. 당일 후반 성능/품질 후속 수정도 한 번 더 묶어 정리했다

#### 구현
- 기록 조회 인덱스와 검색 쿼리 비용을 최적화했다.
- MyPage 중복 API 호출을 제거했다.
- 피드백 Discord 알림에서 개인정보 노출 가능성을 줄였다.
- frontend 초기 번들을 분할해 첫 로드 부담을 줄였다.

#### 결과
- 기능 추가 직후 운영 품질에 영향을 줄 수 있는 query cost, 중복 호출, 개인정보, 번들 크기 문제를 바로 후속 정리할 수 있었다.

### 8. 마감은 코드 변경이 아니라 문서와 실제 상태의 정합성을 확인하고 정리하는 작업이었다

#### 정리 대상
- `README.md`
- `Project Overview`
- `System Architecture`
- `Deployment & Infrastructure Design`
- `Project Schedule`
- `Internal Schedule.internal`
- `dev-log.md`
- `portfolio.internal.md`

#### 정리 방식
- 현재 동작 기준은 `code + existing tests + workflow yaml`
- 운영 반영/수동 검증 기준은 사용자 확인 사실
- 설명 자산 보강 근거는 `/Users/chiho/AI/cubing-hub` 아래 review/handoff 문서

#### 결과
- 기능 구현 완료, CI/CD 운영 반영, 배포환경 수동 검증 완료, 후속 운영 과제를 문서에서 각각 다른 상태로 구분해 정리했다.

---

## 사용 기술

- Spring Boot
- Spring Security
- MySQL
- Flyway
- Redis
- AWS S3
- Docker Compose
- GitHub Actions
- React
- Vite

---

## 검증

### 기능/계약 검증

- backend 관련 integration/unit test와 REST Docs를 관리자 기능, 게시글 이미지, 조회수, 예외 계약, 사전 조회 경로 기준으로 갱신
- frontend `lint`, `test`, `build` 기준으로 관리자 화면, 게시글 이미지, 계정 복구, 커뮤니티 수정, 번들 분할 이후 회귀를 확인

### 운영/배포 검증

- 배포 설정, workflow, 런타임 환경 변수, body size, DB TLS, Flyway 경로를 운영 기준으로 점검
- 마감 단계에서 사용자가 확인한 backend/frontend CI, deploy workflow, 배포환경 전체 기능 수동 검증 완료 사실을 문서 근거로 반영

### 문서 정합성 점검

- 공식 문서와 내부 문서의 상태 표현, 남은 과제, 운영 반영 범위를 다시 교차 점검

## 남은 리스크

- 인증서 갱신 자동화는 아직 후속 운영 과제로 남아 있다.
- Redis rebuild trigger와 장애 복구 runbook은 더 구체적으로 고도화할 여지가 있다.
- 추가 benchmark(`/api/home`, 더 큰 사용자/기록 데이터셋`) 필요 여부는 이후 판단이 필요하다.
