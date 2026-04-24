# Development Log - 2026-04-24 (최종 품질 검증 / 문서 마감)

프로젝트: Cubing Hub

> 이 로그는 `2026-04-24`에 진행한 최종 테스트 커버리지 보강, 운영 경로 테스트 사각지대 해소, 공식/내부 문서 동기화 작업을 현재 상태 기준으로 정리한 기록이다.

---

## 오늘 작업

- SMTP 이메일 인증 운영 어댑터/설정 테스트를 추가해 정상 메시지 구성과 `fromAddress` 누락 실패 경로를 검증했다.
- S3 게시글 이미지 운영 어댑터/설정 테스트를 추가해 object key 생성, public URL 조합, delete 호출, AWS SDK 예외 변환, 설정 선택 분기를 검증했다.
- backend JaCoCo 100%를 위해 transaction callback, Discord notifier, feedback/admin memo/ranking Redis 분기, DTO/entity/config 방어 경로 테스트를 보강했다.
- 공개 Q&A와 관리자 피드백/메모 라우트/페이지 테스트를 추가해 loading, error, pagination, save, delete, mutation 분기를 자동 검증으로 고정했다.
- frontend 커버리지 100%를 위해 API helper, auth, timer, page helper 분기를 추가 검증하고, 커버리지 생성물 ignore 설정을 정리했다.
- 추적 중인 코드·설정 전체 `348`개 파일, `49,093`라인을 대상으로 선언/endpoint/entity/config/route/API/workflow/오래된 키워드를 전수 분석했다.
- 사용자 수동 확인 기준 실제 SMTP 서버 송수신, 실제 AWS S3 업로드/삭제, 최종 브라우저 QA가 통과했다.
- README, 공개 일정, 내부 일정, dev-log, 배포 문서, 포트폴리오 내부 문서를 최종 품질 검증 기준으로 동기화했다.

---

## 핵심 정리 상세

### 1. 운영 어댑터는 서비스 mock 테스트와 별도로 검증해야 한다

#### 구현
- `SmtpVerificationEmailSender`는 실제 sender wiring과 `fromAddress` 해석, 메일 제목/본문 구성을 직접 검증했다.
- `S3PostImageStorageService`는 `PutObject`, `DeleteObject`, URL 조합, key prefix, 예외 변환을 직접 검증했다.

#### 이유
- 회원가입/비밀번호 재설정 이메일과 게시글 이미지 첨부는 service 레벨 테스트에서 mock으로 대체되기 쉽다.
- mock이 통과해도 운영 어댑터의 환경 변수, object key, MIME/type 처리, 외부 SDK 예외 변환은 깨질 수 있다.

#### 결과
- 운영 환경에서 처음 발견될 수 있던 SMTP/S3 wiring 리스크를 자동 회귀 테스트 범위로 가져왔다.

### 2. backend JaCoCo 100%는 수치보다 남은 분기를 찾는 도구로 썼다

#### 구현
- `PostService`의 `TransactionSynchronization` rollback/afterCommit 분기를 검증했다.
- `DiscordFeedbackNotifier`의 HTTP non-2xx, `IOException`, `InterruptedException`, query string 포함 webhook, JSON 직렬화 실패 경로를 보강했다.
- `FeedbackService`, `AdminMemoService`, `RankingRedisRepository`, `RankingRedisBackfillService`의 조건 분기와 예외 경로를 테스트로 고정했다.

#### 이유
- 최종 배포 전에는 "주요 정상 흐름"보다 외부 의존성, transaction side effect, Redis 대체 경로처럼 장애 시 보이는 경로가 더 중요하다.
- JaCoCo missed branch는 어떤 실패 경로가 테스트 밖에 있는지 찾는 체크리스트로 활용했다.

#### 결과
- backend `./gradlew test jacocoTestReport --no-daemon` 기준 instruction missed 0, branch missed 0을 확인했다.

### 3. 공개 Q&A와 관리자 화면을 수동 검증 의존에서 자동 회귀 테스트로 전환했다

#### 구현
- `QnaPage`, `QnaDetailPage`, `AdminPage`, `AdminFeedbackDetailPage`, `AdminMemoDetailPage` 테스트를 추가했다.
- 라우트 렌더링, loading, empty/error, save/delete, visibility toggle, pagination 분기를 화면 단위로 검증했다.

#### 이유
- 공개 Q&A와 관리자 콘솔은 배포된 라우트지만 이전에는 전용 UI 테스트가 없었다.
- 관리자 기능은 일반 사용자보다 사용 빈도는 낮아도, 운영 대응 중 깨지면 영향이 크다.

#### 결과
- frontend `npx vitest run --coverage` 기준 `32 files`, `407 tests`, statements/branches/functions/lines 100%를 확인했다.

### 4. 문서와 포트폴리오는 CI 강제 범위와 로컬 최종 검증을 구분해 적었다

#### 구현
- README와 설계 문서에는 커버리지 100%와 검증 명령을 짧게 반영했다.
- 내부 일정과 포트폴리오에는 왜 SMTP/S3, 관리자/Q&A, notifier/transaction 분기를 닫았는지 설명 자산으로 정리했다.
- `Deployment & Infrastructure Design`에는 Frontend CI가 커버리지 기준을 강제하지 않는다는 점을 함께 적었다.

#### 이유
- 실제 workflow가 하지 않는 일을 문서에 CI 보장처럼 쓰면 운영 문서가 과장된다.
- 반대로 최종 로컬 검증 결과를 기록하지 않으면 포트폴리오에서 품질 마감 근거가 사라진다.

#### 결과
- 공식 문서는 사실 중심으로, 내부 문서는 판단 근거와 설명 포인트 중심으로 나뉘었다.

### 5. 전체 코드·설정 분석으로 문서 반영 누락을 다시 확인했다

#### 구현
- `backend/src`, `frontend/src`, `.github/workflows`, `infra`, `k6`, 주요 설정 파일을 추적 중인 manifest 기준으로 고정했다.
- controller mapping, service/repository 분기, entity/config property, frontend route/API helper, workflow/runtime env, 오래된 키워드까지 범위를 나눠 전수 검색했다.

#### 이유
- 핵심 파일만 보면 실제 문서와 어긋나는 legacy endpoint, 환경 변수, route, 운영 workflow를 놓칠 수 있다.
- 최종 문서 마감에서는 "어디를 안 봤는지"보다 "어떤 범위를 기준으로 고정했는지"가 중요하다.

#### 결과
- API 계약, DB schema, auth/authz 정책, 화면 route, CI workflow에서 추가 문서 변경이 필요한 새 차이는 발견되지 않았다.
- 문서 반영이 필요한 차이는 사용자 수동 스모크 검증 완료 상태와 전체 코드 분석 근거였다.

---

## 검증

- `cd backend && ./gradlew test jacocoTestReport --no-daemon`
- `cd backend && ./gradlew build -x test --no-daemon`
- `cd frontend && npx vitest run --coverage`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- 추적 중인 source/test/config/workflow/infra/k6 manifest 확인
- `/Users/chiho/AI/cubing-hub` 산출물 keyword cross-check

### 확인 결과

- backend test + JaCoCo 통과
- backend JaCoCo aggregate: `instructions missed=0, covered=8700`, `branches missed=0, covered=457`
- backend build 통과
- frontend 커버리지 통과: `32 files`, `407 tests`, statements/branches/functions/lines 100%
- frontend lint 통과
- frontend build 통과
- 추적 중인 코드·설정 manifest: `348` files, `49,093` lines
- `notification-retry`, `retryFeedbackNotification`은 source/test/config 범위에 남아 있지 않음
- 사용자 수동 확인 기준 실제 SMTP 서버 송수신 통과
- 사용자 수동 확인 기준 실제 AWS S3 업로드/삭제 통과
- 사용자 수동 확인 기준 최종 브라우저 QA 통과

### 후속 자동화 후보

- 실제 SMTP/S3/browser 스모크 검증을 CI 또는 별도 운영 workflow로 자동화하지는 않았다.

---

## 메모

- 커버리지 100%는 "버그가 없다"는 뜻이 아니라, 현재 코드 기준 자동 회귀 테스트가 닿지 않는 운영 분기를 없앴다는 기준선이다.
- `frontend/coverage/`는 검증 생성물이므로 git 추적 대상이 아니고 최종 작업트리에 남기지 않는다.
- `mockCommunityPosts` legacy fixture는 실행 경로에서 사용되지 않는 것으로 확인했지만, 이번 작업은 문서 마감 범위이므로 코드 정리는 후속 후보로 둔다.
