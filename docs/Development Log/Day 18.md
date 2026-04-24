# Development Log - 2026-04-17

프로젝트: Cubing Hub

> 일정상 `2026-04-16` 안정화 작업을 commit 반영일 기준으로 `2026-04-17` 로그에 다시 맞춰 기록했다.

---

## 오늘 작업

- 커뮤니티, 댓글, 마이페이지 흐름에서 `토큰은 유효하지만 사용자 정보가 없는 경우`를 `401 Unauthorized`와 일관된 메시지로 정리
- `MyPage` 프로필/기록 조회 실패 시 재시도 버튼을 추가해 복구 경로를 화면에 노출
- `CommunityWritePage` 제목 `100자`, `CommunityDetailPage` 댓글 `500자` 제한을 서버 validation과 맞춤
- `/api/home` 선택적 인증 경계에서 사용자 누락 시 비로그인 홈으로 대체 처리하도록 정리
- `FeedbackPage` 제출 중 폼 잠금과 입력 변경 시 메시지 초기화로 상태 처리 정리
- `2026-04-16` 안정화 범위 대상 backend/frontend 자동 회귀 검증을 다시 실행

---

## 핵심 안정화 상세

### 커뮤니티/댓글/마이페이지 인증 경계 정리

#### 문제 상황
- 삭제되었거나 조회되지 않는 사용자가 유효한 Access Token을 가진 상태에서 커뮤니티, 댓글, 기록 관리 API를 호출하면 일부 경로가 `400 Bad Request` 또는 비일관 메시지로 끝났다.
- 프런트에서는 `MyPage` 로드 실패 후 사용자가 직접 재시도할 수 있는 경로가 부족했다.

#### 해결 방법
- `PostService`, `CommentService`, `RecordService`에서 사용자 조회 실패를 `401 Unauthorized`와 `사용자를 찾을 수 없습니다.` 메시지로 일관화했다.
- `MyPage`에 프로필/기록 로드 실패 시 각각 다시 시도할 수 있는 버튼을 추가했다.
- 게시글 제목과 댓글 입력 길이를 서버 validation 한계와 같은 값으로 맞췄다.

#### 결과
- 인증 토큰은 있지만 사용자 컨텍스트가 사라진 경우의 응답이 공통 예외 계약과 일치하도록 정리됐다.
- 마이페이지 로드 실패 시 세션 복구 또는 재호출할 수 있는 경로가 명확해졌다.

### 홈 선택적 인증 대체 처리와 피드백 상태 처리 정리

#### 문제 상황
- `/api/home`는 optional auth endpoint지만, 인증 토큰이 남아 있고 해당 사용자를 찾지 못하는 경우 guest home으로 내려가지 못하고 실패할 수 있었다.
- `FeedbackPage`는 제출 중에도 필드가 활성화되어 있었고, 에러 메시지가 남은 상태에서 입력을 바꾸면 예전 메시지가 그대로 남았다.

#### 해결 방법
- `HomeService`에서 사용자 조회 중 `401` 성격의 예외는 비로그인 홈 응답으로 대체 처리하고, 다른 예외만 다시 던지도록 분기했다.
- `FeedbackPage`는 제출 중 전체 필드를 잠그고, 사용자가 입력을 수정하면 이전 success/error 메시지를 즉시 지우도록 정리했다.

#### 결과
- optional auth로 설계된 홈 API가 만료/누락 사용자 상황에서도 guest 기준으로 안정적으로 응답하게 됐다.
- 피드백 폼에서 제출 중 중복 조작과 오래된 메시지 노출을 방지하도록 정리했다.

---

## 사용 기술

- Spring Boot
- Spring Security
- React
- Vitest
- Testing Library

---

## 검증

### 백엔드

- `cd backend && ./gradlew test --tests com.cubinghub.domain.post.service.PostServiceTest --tests com.cubinghub.domain.post.service.CommentServiceTest --tests com.cubinghub.domain.record.service.RecordServiceTest --tests com.cubinghub.domain.post.PostControllerIntegrationTest --tests com.cubinghub.domain.post.CommentControllerIntegrationTest --tests com.cubinghub.domain.record.RecordControllerIntegrationTest`
- `cd backend && ./gradlew test --tests com.cubinghub.domain.home.service.HomeServiceTest --tests com.cubinghub.domain.home.HomeControllerIntegrationTest --tests com.cubinghub.domain.feedback.FeedbackControllerIntegrationTest --tests com.cubinghub.domain.feedback.service.FeedbackServiceTest`

### 프런트

- `cd frontend && npm run test -- --run src/pages/MyPage.test.jsx src/pages/CommunityWritePage.test.jsx src/pages/CommunityDetailPage.test.jsx`
- `cd frontend && npm run test -- --run src/pages/HomePage.test.jsx src/pages/FeedbackPage.test.jsx`
- `cd frontend && npm run lint`

자동 검증은 모두 통과했다.
