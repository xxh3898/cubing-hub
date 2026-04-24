# Development Log - 2026-04-23

프로젝트: Cubing Hub

---

## 오늘 작업

- 기록 저장/삭제와 피드백 전송 결과를 blocking alert 대신 toast 알림으로 전환했다
- 회원가입 전에 이메일 인증번호 request/confirm 단계를 추가
- `Redis TTL` 기반 인증번호, 재요청 제한 상태, 인증 완료 상태 저장소 구현
- `SMTP` 기반 인증 메일 발송 경계를 추가하고 환경 변수/배포 설정을 정리
- `POST /api/auth/signup`이 이메일 인증 완료 상태가 있을 때만 계정을 생성하도록 변경
- 프런트 `/signup`을 이메일 인증 2단계 UI로 전환
- auth 단위 테스트, 통합 테스트, REST Docs, 프런트 테스트를 함께 갱신
- 공식 설계 문서와 개발 로그 인덱스를 현재 구현 계약에 맞게 동기화

---

## 핵심 정리 상세

### 1. DB 상태를 늘리지 않고 signup만 잠그는 방향 선택

#### 문제 상황
- 기존 signup은 이메일/닉네임 중복만 확인하고 바로 `users.status=ACTIVE` 계정을 생성했다.
- 이메일 소유 확인이 전혀 없어서 공개 운영 기준으로 가입 장벽이 너무 낮았다.

#### 선택
- `signup 후 PENDING 활성화`가 아니라 `이메일 인증 후 signup`으로 갔다.
- 이유는 현재 로그인 경계와 `UserStatus`를 거의 건드리지 않고도 요구사항을 닫을 수 있기 때문이다.

#### 결과
- DB schema 변경 없이 auth 흐름만으로 이메일 인증을 강제할 수 있게 됐다.
- 로그인/토큰 발급 로직에는 영향이 최소화됐다.

### 2. Redis에 이메일 인증 임시 상태를 두는 구조

#### 구현
- 아래 key를 추가했다.
  - `auth:email-verification:code:{email}`
  - `auth:email-verification:cooldown:{email}`
  - `auth:email-verification:verified:{email}`
- TTL은 다음 기준으로 뒀다.
  - 인증번호 `10분`
  - 재요청 제한 `1분`
  - 인증 완료 상태 `30분`

#### 이유
- 인증번호와 인증 완료 상태는 영속 기준 데이터가 아니라 임시 상태라 Redis TTL과 잘 맞는다.
- 기존 refresh token / blacklist / ranking과 같은 Redis 활용 패턴을 재사용할 수 있다.

#### 결과
- 가입 미완료 상태 정리용 별도 배치나 테이블이 필요 없어졌다.
- signup 성공 시 인증 완료 상태를 바로 소비하도록 맞췄다.

### 3. SMTP 발송 경계와 실패 롤백

#### 구현
- `spring-boot-starter-mail` 의존성을 추가했다.
- SMTP host가 없으면 unavailable sender가 명시적으로 실패하도록 뒀다.
- 인증번호 요청 시 Redis에 인증번호/재요청 제한 상태를 저장한 뒤 메일 발송을 시도하고, 발송 실패 시 Redis 상태를 롤백한다.

#### 이유
- 메일 발송 실패 후 Redis 상태만 남으면 사용자는 메일을 못 받았는데 재요청 제한과 인증번호만 걸린 상태가 된다.
- 반대로 메일만 보내고 Redis 저장이 실패하면 받은 인증번호가 서버에 없는 상태가 된다.

#### 결과
- 완전한 분산 트랜잭션은 아니지만 현재 범위에서 가장 실용적인 정합성을 확보했다.

### 4. 프런트 signup을 서버 규칙과 동일하게 잠금

#### 구현
- 이메일 입력, 인증번호 요청, 인증번호 확인, 나머지 signup 입력 순서로 바꿨다.
- 이메일이 바뀌면 인증 완료 상태와 인증번호 입력값을 즉시 초기화한다.
- 인증 완료 전에는 `가입완료` 버튼이 비활성화된다.

#### 이유
- 서버만 막아두면 UX상 이유를 모르는 실패가 늘어난다.
- 프런트도 같은 규칙을 보여줘야 가입 흐름이 자연스럽다.

#### 결과
- signup 화면이 서버의 `이메일 인증 필요` 규칙과 일치하게 됐다.

### 5. 테스트와 문서를 한 번에 갱신

#### 구현
- backend
  - `AuthServiceTest`
  - `AuthControllerIntegrationTest`
  - `AuthDocsTest`
- frontend
  - `SignupPage.test.jsx`
- 문서
  - API, auth, 화면, 아키텍처, 배포, DB 설계 문서

#### 결과
- 코드, 테스트, REST Docs, 사람이 읽는 설계 문서가 같은 계약을 보게 됐다.

### 6. 액션 결과 피드백은 alert 대신 toast로 정리

#### 선택
- 기록 저장/삭제와 피드백 전송 완료/실패 메시지를 브라우저 기본 alert가 아니라 toast로 노출하도록 바꿨다.

#### 이유
- 이메일 인증, 가입, 기록 저장, 피드백 전송 흐름이 같은 시점에 열리면서 blocking alert는 화면 전환과 입력 흐름을 자주 끊었다.
- auth 화면과 기록/피드백 화면 모두 비동기 상태가 많아서 non-blocking 피드백으로 기준을 맞추는 편이 자연스러웠다.

#### 결과
- 사용자 액션 결과가 페이지 흐름을 끊지 않고도 일관된 방식으로 보이게 됐다.
- 같은 날짜에 붙인 이메일 인증 UX와 기록/피드백 상호작용이 더 자연스럽게 이어졌다.

---

## 사용 기술

- Spring Boot Mail
- Redis
- Spring Security
- JUnit 5
- Spring REST Docs
- React
- Vitest

---

## 검증

- `cd backend && ./gradlew test`
- `cd backend && ./gradlew build`
- `cd frontend && npm run lint`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run build`

## 남은 리스크

- 당시에는 실제 SMTP 자격 증명을 연결한 상태의 실메일 발송을 아직 수동 검증하지 않았다.
  - 후속 확인: `2026-04-24` 최종 품질 검증에서 사용자 수동 확인 기준 실제 SMTP 송수신이 통과했다. 자세한 상태는 [Day 29](./Day%2029.md)를 기준으로 본다.
- abuse 방어는 현재 이메일 단위 재요청 제한만 있고, IP rate limit이나 CAPTCHA는 포함하지 않았다.
- frontend build는 기존과 동일하게 500kB 초과 chunk warning을 출력한다.
