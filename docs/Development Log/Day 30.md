# Development Log - 2026-04-27 (시간 응답 계약 정리)

프로젝트: Cubing Hub

> 이 로그는 API 시간 응답을 UTC instant 계약으로 고정하고, 화면 표시를 `Asia/Seoul` 기준으로 통일한 작업을 정리한 기록이다.

---

## 오늘 작업

- 백엔드 공통 감사 필드와 피드백, 관리자 메모, 랭킹 Redis tie-break 시간 값을 `Instant` 기준으로 정리했다.
- `Clock.systemUTC()` bean과 `hibernate.jdbc.time_zone=UTC` 설정을 추가해 저장/조회 기준을 서버 로컬 timezone에 의존하지 않게 했다.
- 관리자 답변/공개 처리와 Discord 피드백 알림 시각은 주입된 `Clock`으로 생성하도록 바꿔 테스트 가능한 구조로 정리했다.
- 프런트의 홈, 커뮤니티, 마이페이지, 공개 Q&A, 관리자 화면 시간 표시를 공통 `Asia/Seoul` 포맷터로 모았다.
- 기존 운영 DB 값은 별도 보정하지 않는 결정을 유지했다.
- API, DB, 화면, 배포 문서를 UTC instant 저장/응답 계약과 KST 표시 계약 기준으로 동기화했다.

---

## 핵심 판단

### 1. 저장과 API는 UTC instant, 화면은 KST로 분리했다

- API 응답의 `createdAt`, `updatedAt`, `answeredAt`, `publishedAt` 같은 시각 필드는 UTC ISO-8601 instant 문자열로 반환한다.
- 프런트는 API 값을 그대로 문자열 조합하지 않고 `Intl.DateTimeFormat`의 `Asia/Seoul` timezone 지정으로 표시한다.
- 이렇게 나누면 운영 서버 timezone, 브라우저 timezone, DB 세션 timezone이 달라도 공개 계약은 하나로 유지된다.

### 2. 기존 운영 데이터는 보정하지 않았다

- 이번 작업은 새 저장/응답 계약을 고정하는 작업이고, 과거 행의 실제 의미를 추정해 일괄 보정하지 않는다.
- 기존 값이 UTC 의미였다면 새 응답과 KST 표시에서 자연스럽게 보정된다.
- 기존 값이 KST 의미로 저장된 행은 과거 표시와 다르게 보일 수 있지만, 데이터별 의미를 확정하지 않고 SQL 보정을 넣는 쪽이 더 위험하다고 판단했다.

### 3. 화면 helper는 legacy/mock 값을 KST 의미로만 해석한다

- 새 API 응답은 timezone이 있는 `Z` 문자열을 기준으로 한다.
- 기존 mock이나 fixture처럼 timezone이 없는 문자열은 KST 의미로 해석해 테스트와 화면 fixture가 실행 환경 timezone에 흔들리지 않게 했다.
- 이 처리는 API 계약 완화가 아니라, 오래된 mock 데이터와 legacy 값의 표시 안정성을 위한 호환 경로다.

---

## 검증

- `cd backend && ./gradlew compileJava --no-daemon`
- `cd backend && ./gradlew compileTestJava --no-daemon`
- `cd backend && ./gradlew test --no-daemon`
- `cd backend && ./gradlew build --no-daemon`
- `cd frontend && npm run lint`
- `cd frontend && npm run test -- --run`
- `cd frontend && npm run build`

### 확인 결과

- backend main/test 컴파일을 통과했다.
- backend 전체 테스트를 통과했다.
- backend build를 통과했고, REST Docs `asciidoctor`와 `bootJar` 생성까지 확인했다.
- frontend lint를 통과했다.
- frontend 전체 Vitest를 통과했다. 결과는 `33 files`, `410 tests` 통과다. Vitest 실행 중 `--localstorage-file` 경고가 출력됐지만 테스트 실패로 이어지지는 않았다.
- frontend production build를 통과했다.

### 남은 검증

- 운영 DB 기존 데이터의 실제 의미 확인과 브라우저 수동 스모크 검증은 이번 자동 검증 범위에 포함하지 않았다.

---

## 남은 리스크

- 운영 DB 기존 행의 시간 의미를 별도로 판별하지 않았기 때문에 일부 과거 데이터는 화면 표시가 기대와 다를 수 있다.
- API 클라이언트 외부 소비자가 timezone 없는 문자열을 전제로 파싱하고 있었다면, UTC `Z` 문자열에 맞춘 조정이 필요할 수 있다.

---

## 후속 후보

- 운영 DB 샘플을 사람이 확인해 과거 행의 실제 의미가 모두 같은지 확인할 수 있다.
- 외부 소비자가 생기면 시간 응답 계약 예시를 REST Docs 스니펫에도 더 명시적으로 노출할 수 있다.
