# Development Log - 2026-04-24 (피드백 public 계약 / 문서 재동기화)

프로젝트: Cubing Hub

> 이 로그는 `2026-04-24`에 진행한 피드백 public API 계약 단순화와 공식/내부 문서 재동기화 작업을 현재 상태 기준으로 정리한 기록이다.

---

## 오늘 작업

- 일반 사용자용 `POST /api/feedbacks` 응답에서 `notificationStatus`, `notificationAttemptCount`, `notificationRetryAvailable`를 제거했다.
- 일반 사용자용 `POST /api/feedbacks/{feedbackId}/notification-retry` endpoint를 제거했다.
- `frontend/src/api.js`의 미사용 `retryFeedbackNotification()` helper와 관련 테스트 fixture를 정리했다.
- feedback controller/service/unit/integration/docs/security test와 REST Docs를 public 계약 기준으로 다시 맞췄다.
- `Project Overview`, `Screen Specification`, `API Specification`, `Database Design`, `Feature Backlog`, `portfolio.internal.md`를 새 계약 기준으로 동기화했다.
- `dev-log.md`를 최신 상태 기준으로 갱신하고, historical day log는 직접 덮어쓰지 않았다.

---

## 핵심 정리 상세

### 1. 일반 사용자 피드백 계약을 화면 수준으로 단순화했다

#### 구현
- `FeedbackSubmissionResponse`를 `id`만 반환하는 DTO로 축소했다.
- `FeedbackController`에서 public retry endpoint를 제거했다.
- `FeedbackNotificationService`는 생성 후 내부 운영 알림 시도 흐름만 유지하도록 정리했다.

#### 이유
- 화면은 이미 접수 완료 toast만 사용하고 있었는데, API는 내부 운영 상태를 계속 노출하고 있었다.
- 이 상태를 유지하면 public 계약이 UI보다 넓어지고, 이후 운영 구현 변경 때 불필요한 하위 호환성 부담이 남는다.

#### 결과
- 일반 사용자 기준 피드백 흐름은 `접수 -> 완료 메시지`로 단순해졌다.
- public API 표면은 줄이고, 내부 운영 상태는 관리자 경로와 DB에서만 추적하도록 분리할 수 있게 됐다.

### 2. 운영 추적 정보는 admin/internal 경로에만 남겼다

#### 구현
- `Feedback` 엔티티의 notification 상태 컬럼과 관리자 상세/목록 응답의 notification 필드는 유지했다.
- 문서에서도 "public 제거"와 "internal 운영 추적 유지"를 분리해서 서술하도록 수정했다.

#### 이유
- Discord 운영 알림 상태는 여전히 관리자 확인과 운영 후속 대응에는 유효한 정보다.
- 이번 작업 목표는 내부 운영 기능 제거가 아니라 일반 사용자 계약 정리였다.

#### 결과
- public API는 단순화됐고, 관리자 화면과 운영 데이터 추적은 그대로 유지됐다.

### 3. REST Docs와 현재 상태 문서를 같은 기준으로 다시 맞췄다

#### 구현
- `FeedbackDocsTest`에서 removed response fields와 retry 문서를 제거했다.
- `backend/src/docs/asciidoc/index.adoc`의 `feedback/retry` include를 제거해 stale snippet 참조를 정리했다.
- 공식 문서와 내부 문서는 현재 구현 상태 기준으로 갱신했다.

#### 이유
- public endpoint를 제거하면 API 문서, REST Docs source, generated static docs까지 같은 시점에 정리되지 않으면 금방 어긋난다.
- historical `Day 23`, `Day 27` 로그는 당시 사실을 기록한 원본이므로 직접 고치지 않는 편이 저장소 규칙과 맞았다.

#### 결과
- 현재 상태 문서는 public retry 제거 상태를 일관되게 설명한다.
- historical day log는 보존하고, 상태 변화는 새 로그와 허브 문서에서 따라가게 됐다.

---

## 검증

- `cd frontend && npm run lint`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run build`
- `cd backend && ./gradlew test`
- `cd backend && ./gradlew clean build`
- `rg -n "feedback/retry|notification-retry|Unresolved directive" backend/src/main/resources/static/docs/index.html backend/build/docs/asciidoc/index.html backend/src/docs/asciidoc/index.adoc docs`

### 확인 결과

- frontend lint 통과
- frontend test 통과 (`21 files`, `111 tests`)
- frontend build 통과
- backend test 통과
- backend clean build 통과
- REST Docs source의 stale `feedback/retry` include 제거 후 unresolved directive 없이 정적 docs가 다시 생성됐다

### 남은 경고

- frontend test 실행 시 기존 `--localstorage-file` warning이 반복 출력된다.
- backend test/build에서 기존 `MockBean` deprecation warning과 Gradle deprecation warning이 남아 있다.
- asciidoctor 실행 시 JDK IO open access 관련 warning이 남아 있다.

---

## 메모

- 이 변경은 public feedback API 기준으로는 breaking change다.
- 저장소 기준 프런트 사용처는 모두 정리했지만, 저장소 밖 외부 consumer 존재 여부는 코드만으로 확정할 수 없다.
