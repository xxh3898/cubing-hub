# Development Log - 2026-04-23

프로젝트: Cubing Hub

---

## 오늘 작업

- 로그인 화면에서 `비밀번호 재설정` 진입 링크와 안내 상태를 추가했다
- `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`을 구현하고 SMTP/Redis 기반 6자리 인증번호 흐름을 회원가입 인증과 같은 방식으로 재사용했다
- 마이페이지에서 닉네임/주 종목 수정과 현재 비밀번호 확인 후 비밀번호 변경을 `계정 관리` 모달 탭에서 처리하도록 정리하고 `PATCH /api/users/me/profile`, `PATCH /api/users/me/password`를 연동했다
- 비밀번호 변경과 비밀번호 재설정 성공 시 기존 refresh token을 정리하고 재로그인을 유도하도록 맞췄다
- 커뮤니티 상세에서 작성자/관리자만 `수정` 버튼을 보도록 하고, `/community/:id/edit` 라우트에서 `GET /api/posts/{postId}/edit` 사전 조회 + `PUT /api/posts/{postId}` 연동을 붙였다
- 학습 화면 첫 번째 탭에 WCA 3x3x3 스크램블 기준 `U/D/L/R/F/B` 회전기호 VisualCube 가이드를 추가했다
- 회전기호 VisualCube는 `case` 대신 `alg`를 사용하도록 보정해 `U`와 `U'` 같은 90도 회전 카드가 뒤집혀 보이지 않게 맞췄다
- 공식 설계 문서, backlog, 아키텍처/배포/DB/포트폴리오 문서를 현재 구현 상태에 맞게 동기화했다
- frontend 전체 테스트에서 깨지던 `localStorage` 환경 의존성을 공용 test setup 대체 구현으로 보완했다
- 커뮤니티 수정 사전 조회가 조회수를 증가시키지 않도록 edit 전용 사전 조회 API와 관련 테스트/REST Docs를 추가했다
- 마이페이지 프로필 저장 테스트를 상태 동기화 timing에 맞게 안정화했다

---

## 핵심 정리 상세

### 1. 비밀번호 재설정은 회원가입 인증 인프라를 재사용했다

#### 선택
- 별도 토큰 저장소를 새로 만들지 않고, Redis TTL 기반 6자리 인증번호와 재요청 제한 구조를 password reset 전용 key로 분리해 재사용했다.
- 가입되지 않은 이메일은 동일 성공 응답으로 처리해 계정 존재 여부를 노출하지 않도록 했다.

#### 결과
- 회원가입과 동일한 사용자 경험을 유지하면서도 인증 인프라 중복을 줄였다.
- 메일 발송 실패와 재요청 제한, 코드 만료/불일치 같은 예외 메시지를 auth 계층 표준과 맞출 수 있었다.

### 2. 계정 정보 변경은 마이페이지 안에서 처리했다

#### 구현
- `PATCH /api/users/me/profile`로 닉네임/주 종목을 수정하고, 성공 후 `/api/me`를 다시 동기화해 헤더 닉네임까지 즉시 반영했다.
- `PATCH /api/users/me/password`는 현재 비밀번호 일치 여부를 확인하고, 기존 refresh token을 모두 제거한 뒤 로그인 화면으로 돌려보내도록 구성했다.
- 인라인 폼으로 기록 영역을 밀어내지 않도록 `계정 관리` 버튼을 누를 때만 모달을 열고, 안에서 `프로필 수정`과 `비밀번호 변경` 탭을 전환하도록 바꿨다.

#### 이유
- 별도 설정 화면을 늘리지 않으면서도 기록 보기 흐름을 덜 방해하려면, 이미 보호 route와 사용자 컨텍스트가 있는 마이페이지 안에서 계정 관리만 모달로 분리하는 편이 범위 대비 효율적이었다.

### 3. 커뮤니티 수정은 기존 작성 폼을 공용화했다

#### 구현
- `CommunityWritePage`를 create/edit 공용 form으로 확장했다.
- edit mode에서는 `GET /api/posts/{postId}/edit`로 기존 글을 사전 조회하고, 작성자 또는 관리자만 수정 가능하도록 프런트 권한 분기를 추가했다.
- 성공 시 같은 상세 화면으로 복귀하도록 `PUT /api/posts/{postId}`와 보호 route를 연결했다.

#### 같은 날짜 후속 수정
- 초기 구현에서 상세 조회 재사용 여지가 보이자 같은 날짜 안에 수정 사전 조회 전용 API를 분리했다.
- `GET /api/posts/{postId}/edit`는 조회수를 증가시키지 않고, 작성자나 관리자만 접근하도록 테스트와 REST Docs까지 같이 보강했다.

#### 결과
- 게시글 읽기용 상세 조회와 수정 화면 사전 조회의 책임을 분리할 수 있게 됐다.
- 커뮤니티 수정 진입이 조회수 증가에 영향을 주지 않도록 같은 날짜에 수정까지 완료했다.

### 4. 회전기호 가이드는 별도 페이지가 아니라 학습 화면 안에 배치했다

#### 선택
- 새 라우트를 늘리지 않고 학습 화면 첫 번째 탭에 최소 범위 가이드를 추가했다.
- WCA 3x3x3 스크램블에서 실제로 마주치는 `U/D/L/R/F/B`의 기본, prime, double turn만 남기고 wide move, rotation은 제외했다.
- 각 카드는 한 기호당 하나의 VisualCube 이미지만 보여주도록 구성했다.

#### 결과
- 기존 CFOP 카드 흐름을 유지하면서도 학습 화면에 들어오자마자 기본 표기법을 바로 참고할 수 있게 됐다.
- 후속으로 VisualCube `case` 대신 `alg`를 사용하도록 보정해 90도 회전 기호 카드 방향이 실제 표기와 맞게 보이도록 정리했다.

### 5. 테스트 런타임과 프로필 저장 회귀를 같이 안정화했다

#### 문제 상황
- 데스크톱 실행 환경에서 Node 프로세스에 `--localstorage-file` 플래그가 잘못 전달돼 jsdom `localStorage`가 부분적으로 깨졌다.
- `guestTimerStorage` 테스트 3건이 `setItem is not a function`으로 실패했다.
- 마이페이지 프로필 저장 테스트는 사용자 상태 동기화 timing 때문에 간헐적으로 깨질 여지가 있었다.

#### 해결
- `src/test/setup.js`에서 `localStorage` 메서드가 비정상일 때만 메모리 기반 대체 storage를 주입하고, 각 테스트 후 clear하도록 보완했다.
- `MyPage.test.jsx`는 프로필 저장 후 상태 반영 시점을 다시 맞춰 flaky 가능성을 줄였다.

#### 결과
- frontend 전체 테스트를 환경 경고와 분리해 안정적으로 통과시킬 수 있게 됐다.
- 계정 관리 기능을 붙인 직후에도 프로필 저장 회귀를 테스트 레벨에서 같이 고정할 수 있게 됐다.

---

## 사용 기술

- Spring Boot
- Spring Security
- Redis
- SMTP
- React
- React Router DOM
- Vitest
- Testing Library

---

## 검증

- `cd backend && env JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home ./gradlew test --tests 'com.cubinghub.domain.auth.service.AuthServiceTest' --tests 'com.cubinghub.domain.auth.AuthControllerIntegrationTest' --tests 'com.cubinghub.domain.auth.AuthDocsTest' --tests 'com.cubinghub.domain.user.service.UserProfileServiceTest' --tests 'com.cubinghub.domain.user.UserProfileIntegrationTest' --tests 'com.cubinghub.domain.user.UserProfileDocsTest'`
- `cd backend && env JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home ./gradlew build`
- `cd frontend && /opt/homebrew/bin/node /opt/homebrew/lib/node_modules/npm/bin/npm-cli.js test -- --run`
- `cd frontend && /opt/homebrew/bin/node /opt/homebrew/lib/node_modules/npm/bin/npm-cli.js run lint`
- `cd frontend && /opt/homebrew/bin/node /opt/homebrew/lib/node_modules/npm/bin/npm-cli.js run build`

## 남은 리스크

- 비밀번호 재설정 메일 발송과 실제 로그인 재진입은 브라우저/실서버 기준 수동 검증을 아직 하지 않았다.
- frontend build는 기존과 동일하게 500kB 초과 chunk warning을 출력한다.
