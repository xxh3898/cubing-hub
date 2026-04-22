# Development Log - 2026-04-23

프로젝트: Cubing Hub

---

## 오늘 작업

- 모바일 상단 nav를 grid형으로 재배치해 390px 전후 폭에서 clipping과 어색한 줄바뀜을 줄였다
- `rankings`, `community`, `mypage`, 로그인 사용자 `home`의 테이블형 데이터를 모바일 stacked card row로 전환했다
- `useCubeTimer`에 `touch`/`pen` pointer 입력을 추가해 모바일 터치가 기존 `Space` 상태 머신을 그대로 타도록 맞췄다
- 타이머 안내 문구를 입력 장치 중립 표현으로 정리하고 모바일 터치 surface 속성을 보강했다
- 타이머 touch 회귀 테스트를 추가하고 headless Chrome 모바일 캡처로 주요 공개 화면을 다시 확인했다
- 공식 설계 문서와 개발 로그 인덱스를 현재 구현 상태에 맞게 동기화했다

---

## 핵심 정리 상세

### 1. 표 markup은 유지하고 모바일만 카드형으로 바꾸는 방향 선택

#### 문제 상황
- 홈 최근 기록, 랭킹, 커뮤니티, 마이페이지 기록 표는 데스크톱에서는 읽기 쉬웠지만 모바일에서는 가로 폭이 부족했다.
- 단순 `overflow-x`에 기대면 사용자가 핵심 값을 한눈에 읽기 어렵고, 페이지마다 수평 스크롤 의존이 남았다.

#### 선택
- 데스크톱 table markup은 유지하고, 모바일에서만 `data-label` 기반 stacked card row로 재해석하는 CSS를 추가했다.

#### 결과
- 데스크톱 구조와 접근성은 크게 건드리지 않으면서 모바일 가독성을 개선했다.
- 페이지별 별도 모바일 전용 list markup을 추가하지 않아 JSX 변경 범위를 최소화했다.

### 2. 상단 nav와 액션 영역은 wrap이 아니라 명시적 grid/stack으로 정리

#### 문제 상황
- 상단 nav, 랭킹 툴바, 커뮤니티 검색/작성 액션, 마이페이지 헤더, 타이머 액션 버튼은 모바일에서 폭이 모자라면 일부가 잘리거나 밀릴 수 있었다.

#### 선택
- 모바일 폭에서 nav는 2열 grid로, 툴바와 액션은 세로 stack 또는 full-width 버튼으로 재배치했다.
- nav item과 meta container에는 `min-width: 0`을 같이 둬서 flex/grid 최소 너비 때문에 overflow가 생기지 않게 했다.

#### 결과
- 한 줄 고정 레이아웃에서 나오던 clipping 가능성을 줄였다.
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

### 4. 테스트와 시각 검증을 같이 묶어 회귀를 고정

#### 구현
- `useCubeTimer.test.jsx`를 추가해 touch hold/release, 조기 release, running 중 stop, mouse ignore 케이스를 검증했다.
- `npm run lint`, `npm test -- --run`, `npm run build`를 다시 실행했다.
- Vite dev server와 headless Chrome 390px 캡처로 홈, 타이머, 랭킹, 커뮤니티, 학습, 로그인, 회원가입의 공개 화면 레이아웃을 확인했다.

#### 결과
- 상태 머신 회귀와 기본 반응형 레이아웃 회귀를 동시에 확인할 수 있게 됐다.

---

## 사용 기술

- React
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

## 남은 리스크

- 로그인 사용자 홈/마이페이지의 실제 데이터가 채워진 상태는 백엔드와 인증 데이터를 붙여서 다시 수동 확인하지 않았다.
- 실제 물리 모바일 기기에서의 터치 감도와 브라우저별 pointer 이벤트 차이는 아직 별도 수동 검증하지 않았다.
- frontend build는 기존과 동일하게 500kB 초과 chunk warning을 출력한다.
