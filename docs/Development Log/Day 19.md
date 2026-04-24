# Development Log - 2026-04-17

프로젝트: Cubing Hub

---

## 오늘 작업

- `frontend/src/index.css`를 import 허브로 축소하고 `frontend/src/styles/*` 구조로 CSS 파일을 분리
- `FeedbackPage`, `CommunityWritePage`, `CommunityDetailPage`에서 실제로 쓰지만 비어 있던 스타일을 보강
- 댓글 삭제 버튼의 `disabled` 상태가 화면에서 드러나도록 스타일을 추가
- `Project Schedule`, `Internal Schedule.internal`, `dev-log.md`, `2026-04-17` 개발 로그 2종을 현재 결과 기준으로 동기화
- 작업 폴더에 `2026-04-17` 안정화 결과 review 문서를 추가
- `frontend` 전체 lint/build/test를 다시 실행

---

## 핵심 정리 상세

### CSS 구조 분리

#### 문제 상황
- `frontend/src/index.css`에 공통 레이아웃, 폼, 타이머, 홈, 랭킹, 커뮤니티, 인증, 마이페이지 스타일이 한 파일에 몰려 있었다.
- `2026-04-17` CSS 정리 범위에서는 시각적 전면 수정 없이 유지보수 경계만 나누는 것이 필요했다.

#### 해결 방법
- `index.css`를 import 허브로만 남기고 `base`, `home`, `timer`, `rankings`, `learning`, `community`, `auth`, `mypage`, `feedback`, `responsive` 파일로 분리했다.
- 기존 selector 이름과 import 순서는 유지해 시각적 우선순위가 바뀌지 않도록 했다.

#### 결과
- 스타일 책임이 화면/공통 단위로 나뉘어 이후 CSS Modules 전환이나 화면 수정의 진입점이 더 명확해졌다.
- 기능 동작을 건드리지 않고 CSS 구조만 정리하는 refactor 단위를 별도로 닫을 수 있게 됐다.

### 피드백/커뮤니티 화면 잔버그 정리

#### 문제 상황
- `FeedbackPage`, `CommunityWritePage`, `CommunityDetailPage`는 JSX에서 쓰는 클래스 중 일부가 실제 CSS에 정의되어 있지 않아 화면 간격과 메타 영역 밀도가 깨질 수 있었다.
- 댓글 삭제 버튼은 `disabled`가 되어도 시각적으로 거의 구분되지 않았다.

#### 해결 방법
- `feedback.css`를 추가하고 피드백 헤더/폼 간격을 보강했다.
- `community.css`에 작성 화면 레이아웃, 상세 메타 행, 댓글 삭제 버튼 `disabled` 상태 스타일을 추가했다.

#### 결과
- 피드백과 커뮤니티 주요 화면의 누락된 레이아웃 클래스가 채워졌고, 댓글 삭제 진행 중 상태가 화면에도 드러나게 됐다.

### 문서와 작업 산출물 마감

#### 작업 내용
- 공개 일정 문서와 내부 일정 문서에서 `2026-04-17` 완료 상태를 반영했다.
- 허브 로그와 `2026-04-17` 원본 로그 2종을 현재 구현/검증 결과와 맞췄다.
- `/Users/chiho/AI/cubing-hub/20260417/01-day-17-v1-stabilization/review-day-17-v1-stabilization.md`에 구현, 검증, 남은 리스크를 정리했다.

#### 결과
- 코드, 일정표, 허브 로그, 날짜 로그, AI 작업 산출물이 같은 기준으로 맞춰졌다.

---

## 사용 기술

- React
- Vite
- CSS
- Vitest
- ESLint

---

## 검증

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm run test -- --run`

자동 검증은 모두 통과했다.
