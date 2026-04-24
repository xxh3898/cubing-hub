# Development Log - 2026-04-23

프로젝트: Cubing Hub

---

## 오늘 작업

- 모바일 상단 nav를 grid형으로 재배치해 390px 전후 폭에서 잘림과 어색한 줄바뀜을 줄였다
- `rankings`, `community`, `mypage`, 로그인 사용자 `home`의 테이블형 데이터를 모바일 카드형 행으로 전환했다
- `useCubeTimer`에 `touch`/`pen` pointer 입력을 추가해 모바일 터치가 기존 `Space` 상태 머신을 그대로 타도록 맞췄다
- 실행 중 `window blur`가 발생해도 현재 solve와 기록 저장 상태가 초기화되지 않도록 타이머 흐름을 보강했다
- 타이머 안내 문구를 입력 장치 중립 표현으로 정리하고 모바일 터치 surface 속성을 보강했다
- 타이머 touch 회귀 테스트를 추가하고 headless Chrome 모바일 캡처로 주요 공개 화면을 다시 확인했다
- 공식 설계 문서와 개발 로그 인덱스를 현재 구현 상태에 맞게 동기화했다
- 랭킹 닉네임 검색이 검색 결과 집합 안에서 재순위되지 않고 전체 랭킹 기준 실제 순위를 유지하도록 백엔드 조회를 수정했다
- 타이머를 `정지 -> 저장/캐시 -> 성공 시 자동 초기화 + 다음 스크램블` 흐름으로 바꾸고, 비로그인 사용자는 게스트 `localStorage` 기록 캐시를 사용하도록 정리했다
- 로그인/회원가입/랭킹/커뮤니티/피드백 입력에 합의된 길이 제한을 반영하고, 백엔드 DTO/검색 파라미터 validation, 주 종목 입력 검증, 비밀번호 UTF-8 byte-length 검증을 추가했다
- 피드백 화면에서 `feedbackId`는 재시도 내부 상태에만 유지하고 UI에서는 숨기도록 정리했다
- 마이페이지 기록 테이블 폭 계산을 복구하고, 커뮤니티/랭킹 모바일 카드 레이아웃을 같은 날짜 후속 수정으로 다시 다듬었다
- 배포/로컬 HAR을 확인해 긴 검색 입력 실패를 `status 0 + net::ERR_FAILED` 기준으로 재정리하고, backlog와 일정/로그 문서를 최신화했다

---

## 핵심 정리 상세

### 1. 표 markup은 유지하고 모바일만 카드형으로 바꾸는 방향 선택

#### 문제 상황
- 홈 최근 기록, 랭킹, 커뮤니티, 마이페이지 기록 표는 데스크톱에서는 읽기 쉬웠지만 모바일에서는 가로 폭이 부족했다.
- 단순 `overflow-x`에 기대면 사용자가 핵심 값을 한눈에 읽기 어렵고, 페이지마다 수평 스크롤 의존이 남았다.

#### 선택
- 데스크톱 table markup은 유지하고, 모바일에서만 `data-label` 기반 카드형 행으로 재해석하는 CSS를 추가했다.

#### 결과
- 데스크톱 구조와 접근성은 크게 건드리지 않으면서 모바일 가독성을 개선했다.
- 페이지별 별도 모바일 전용 list markup을 추가하지 않아 JSX 변경 범위를 최소화했다.

### 2. 상단 nav와 액션 영역은 wrap이 아니라 명시적 grid/stack으로 정리

#### 문제 상황
- 상단 nav, 랭킹 툴바, 커뮤니티 검색/작성 액션, 마이페이지 헤더, 타이머 액션 버튼은 모바일에서 폭이 모자라면 일부가 잘리거나 밀릴 수 있었다.

#### 선택
- 모바일 폭에서 nav는 2열 grid로, 툴바와 액션은 세로 배치 또는 full-width 버튼으로 재배치했다.
- nav item과 meta container에는 `min-width: 0`을 같이 둬서 flex/grid 최소 너비 때문에 overflow가 생기지 않게 했다.

#### 결과
- 한 줄 고정 레이아웃에서 나오던 잘림 가능성을 줄였다.
- 버튼과 필터가 모바일에서 누르기 쉬운 폭으로 정리됐다.

### 3. 타이머 터치 입력은 keyboard 상태 머신과 같은 전이를 공유

#### 구현
- `useCubeTimer`에 `transitionToHolding`, `transitionToIdle`, `transitionToRunning`, `transitionToStopped`를 분리했다.
- keyboard `Space`와 모바일 `touch`/`pen` pointer가 같은 전이 함수를 사용하도록 연결했다.
- `mouse` pointer는 제외해 데스크톱 클릭으로 의도치 않게 타이머가 동작하지 않도록 했다.

#### 이유
- 모바일용 로직을 별도 상태 머신으로 만들면 키보드 동작과 쉽게 어긋난다.
- 같은 상태 전이를 공유하면 `holding -> ready -> running -> stopped` 규칙을 한 곳에서 유지할 수 있다.

#### 결과
- 모바일에서도 길게 누른 뒤 떼서 시작하고, 실행 중 다시 눌러 정지하는 흐름이 일관되게 동작한다.
- 안내 문구도 `Space` 전용 문장에서 입력 장치 중립 표현으로 바뀌었다.

### 4. running 중 blur가 발생해도 solve를 버리지 않도록 막았다

#### 문제 상황
- 실행 중 창 포커스가 잠깐 벗어나면 타이머 상태와 기록 저장 흐름이 불필요하게 초기화될 수 있었다.
- 모바일 브라우저 전환이나 데스크톱 blur 상황에서 실제 사용자가 방금 측정한 solve를 잃을 여지가 있었다.

#### 해결
- blur를 무조건 초기화 신호로 취급하지 않고, running solve와 저장 대기 상태는 유지하도록 흐름을 보강했다.
- 타이머 상태 머신이 입력 장치와 창 포커스 변화에 서로 다른 책임을 가지도록 정리했다.

#### 결과
- 모바일 터치 지원을 붙인 뒤에도 실행 중 기록이 blur 때문에 날아가는 회귀를 막을 수 있게 됐다.

### 5. 테스트와 시각 검증을 같이 묶어 회귀를 고정

#### 구현
- `useCubeTimer.test.jsx`를 추가해 touch hold/release, 조기 release, running 중 stop, mouse ignore 케이스를 검증했다.
- `npm run lint`, `npm test -- --run`, `npm run build`를 다시 실행했다.
- Vite dev server와 headless Chrome 390px 캡처로 홈, 타이머, 랭킹, 커뮤니티, 학습, 로그인, 회원가입의 공개 화면 레이아웃을 확인했다.

#### 결과
- 상태 머신 회귀와 기본 반응형 레이아웃 회귀를 동시에 확인할 수 있게 됐다.

### 6. 랭킹 검색은 필터된 집합 재순위가 아니라 전체 순위를 유지하도록 수정

#### 문제 상황
- `user1`이 1위, `user2`가 2위일 때 `user2`만 검색하면 결과가 1건이라 `1위`로 보였다.
- 사용자 기대는 검색 결과 안의 상대 순위가 아니라 전체 랭킹 기준 실제 순위 유지였다.

#### 선택
- 서비스 단에서 페이지 offset으로 `rank`를 재계산하지 않고, 저장소 조회 결과가 전체 순위를 함께 반환하도록 바꿨다.
- `nickname` 검색은 MySQL window function을 사용해 필터 전 전체 순위를 계산한 뒤 검색 조건을 적용하도록 정리했다.

#### 결과
- 검색 결과가 1건이어도 해당 사용자의 실제 전체 랭킹 순위가 그대로 노출된다.
- 랭킹 화면과 API 문서의 `rank` 의미가 사용자 기대와 일치하게 됐다.

### 7. 타이머 저장은 정지 시점의 solve 정보 기준 한 번만 처리하도록 흐름을 재정리

#### 문제 상황
- 기존 타이머는 `stopped`, `finalTime`, 현재 `scrambleData` 조합에 저장 effect가 걸려 있어 스크램블 상태 변화에 따라 같은 solve가 다시 저장될 여지가 있었다.
- 비로그인 사용자는 서버 저장이 없어서 자동 초기화 구조와 함께 쓰면 방금 기록이 곧바로 사라졌다.

#### 선택
- 정지 시점의 `{ eventType, timeMs, scramble }` solve 정보를 고정하고, 저장 또는 게스트 캐시는 그 정보만 기준으로 실행하도록 바꿨다.
- 로그인 사용자는 서버 저장 성공 시, 비로그인 사용자는 게스트 캐시 성공 시에만 타이머와 스크램블을 다음 solve 기준으로 자동 초기화하도록 정리했다.
- 저장 실패 시에는 정지된 기록을 유지하고 `저장 재시도`만 노출하도록 분기했다.

#### 결과
- 중복 저장 가능성을 구조적으로 줄였고, 비로그인 사용자도 최근 기록과 `Ao5`, `Ao12`를 이어서 확인할 수 있게 됐다.
- 타이머 UI에서 수동 스크램블 초기화/타이머 초기화 버튼 없이 solve 중심 흐름을 유지하게 됐다.

### 8. 긴 검색 입력 오류는 CORS 수정이 아니라 길이 제한과 validation으로 닫는 방향으로 정리

#### 문제 상황
- 랭킹/커뮤니티 입력에 매우 긴 문자열을 넣으면 브라우저에서 `CORS 오류`, `Network Error`처럼만 보였고 상태코드가 노출되지 않았다.
- `localhost.har`, `www.cubing-hub.com.har` 모두 `status 0`, `net::ERR_FAILED`, 응답 헤더 없음으로 기록돼 실제 HTTP 응답이 오지 않은 상태였다.

#### 선택
- 문제를 CORS 설정이 아니라 과도한 입력 길이와 요청 전송 실패로 보고, 프런트 `maxLength`와 백엔드 검색 파라미터/DTO validation을 함께 넣었다.
- 비밀번호는 `BCrypt` 잘림 이슈를 피하기 위해 UI `8~64자`, 서버 UTF-8 `72 bytes` 제한으로 분리했다.

#### 결과
- 랭킹 닉네임 검색, 커뮤니티 검색, 게시글/피드백 본문, 인증 입력까지 계약이 있는 필드들의 길이 제한이 코드/문서/테스트에 함께 고정됐다.
- 긴 query로 인한 브라우저 레벨 실패를 사용자 입력 단계에서 먼저 줄일 수 있게 됐다.

### 9. 모바일 후속 레이아웃과 입력 계약도 같은 날짜 안에서 다시 정리했다

#### 구현
- `mypage` 기록 테이블 폭 계산을 복구해 모바일과 데스크톱 전환 시 레이아웃이 무너지지 않게 했다.
- 커뮤니티와 랭킹 모바일 카드 레이아웃을 다시 다듬어 아주 좁은 폭에서 카드형 행이 깨지지 않도록 정리했다.
- 프로필 `mainEvent` 입력은 허용 종목만 받도록 validation을 추가했다.

#### 결과
- 반응형 보정이 1차 CSS 전환에서 끝나지 않고, 실제 사용 중 드러난 후속 폭 문제까지 같은 날짜 안에서 정리됐다.
- 기록/랭킹/커뮤니티 UI와 계정 입력 계약이 같이 안정화됐다.

### 10. backlog와 공식 문서를 현재 구현 상태에 맞게 다시 정렬

#### 구현
- `docs/Feature Backlog.md`에 회전기호 설명 페이지, 정보 변경, 비밀번호 재설정, 관리자 Q&A, 게시글 사진첨부 기능을 backlog 후보로 정리했다.
- 모바일 반응형과 모바일용 터치 타이머는 이미 구현된 상태이므로 backlog에서 `done`으로 정리했다.
- `docs/API Specification.md`, `docs/Screen Specification.md`, `docs/dev-log.md`, 일정 문서에 랭킹 검색 제약, 모바일 UI 후속 수정, 배포 후 안정화 맥락을 같이 반영했다.

#### 결과
- backlog, 설계 문서, 진행 문서가 같은 상태를 보도록 다시 맞춰졌다.

---

## 사용 기술

- Spring Boot
- Hibernate Validator
- MySQL 8 window function
- React
- localStorage
- Vite
- Vitest
- Testing Library
- Headless Chrome

---

## 검증

- `cd frontend && npm run lint`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run build`
- `http://127.0.0.1:4173` 기준 390px headless Chrome 캡처 확인
- `cd backend && env JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home ./gradlew test --tests 'com.cubinghub.domain.record.RankingControllerIntegrationTest' --tests 'com.cubinghub.domain.record.RankingDocsTest' --tests 'com.cubinghub.domain.record.service.RecordServiceTest' --tests 'com.cubinghub.domain.post.PostControllerIntegrationTest' --tests 'com.cubinghub.domain.feedback.FeedbackControllerIntegrationTest' --tests 'com.cubinghub.domain.auth.AuthControllerIntegrationTest'`
- `cd backend && env JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home ./gradlew build`
- `cd frontend && /Users/chiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js .`
- `cd frontend && /Users/chiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs --run src/lib/guestTimerStorage.test.js src/pages/TimerPage.test.jsx src/pages/RankingsPage.test.jsx src/pages/CommunityPage.test.jsx src/pages/FeedbackPage.test.jsx src/pages/SignupPage.test.jsx src/pages/LoginPage.test.jsx src/pages/CommunityWritePage.test.jsx src/pages/CommunityDetailPage.test.jsx src/hooks/useCubeTimer.test.jsx`
- `cd frontend && /Users/chiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`

## 남은 리스크

- 로그인 사용자 홈/마이페이지의 실제 데이터가 채워진 상태는 백엔드와 인증 데이터를 붙여서 다시 수동 확인하지 않았다.
- 실제 물리 모바일 기기에서의 터치 감도와 브라우저별 pointer 이벤트 차이는 아직 별도 수동 검증하지 않았다.
- frontend build는 기존과 동일하게 500kB 초과 chunk warning을 출력한다.
- 랭킹 검색의 전체 순위 보존은 MySQL 8 window function 의존이 있으므로 DB dialect나 버전이 달라지면 대체 경로가 깨질 수 있다.
- 게스트 기록 캐시는 `localStorage`에 의존하므로 저장소 사용이 제한된 브라우저에서는 기록 저장이 실패할 수 있다.
- 운영 환경에서 긴 검색 입력이 정확히 어느 계층에서 차단되는지는 로그 상 특정하지 않았다.
