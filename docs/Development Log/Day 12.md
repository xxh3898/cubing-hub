# Development Log - 2026-04-03

프로젝트: Cubing Hub

---

## 오늘 작업

- API 응답 정책과 도메인 레이어 구조를 정리하고 관련 테스트를 보강
- 공개 스크램블 조회 API(`GET /api/scramble`) 및 REST Docs 문서화 추가
- React Router, Axios, AuthContext 기반 프런트 공통 연동 구조 구성
- 로그인/회원가입 페이지와 스페이스바 기반 타이머, 기록 저장 흐름 구현

---

## 구현 기능

- **API 응답 및 테스트 정비**: `ApiResponse` 중심의 응답 구조를 정리하고, 보안 응답 JSON, 서비스 단위 테스트, 통합 테스트 실패 경로를 함께 보강했습니다.
- **스크램블 조회 API**: 프런트 타이머에서 사용할 수 있도록 `GET /api/scramble` 엔드포인트를 추가하고, Day 12 범위에서는 `WCA_333`만 지원하도록 제한했습니다.
- **프런트 공통 연동 기반**: `react-router-dom`, `axios`, `AuthContext`, `localStorage` 기반 access token 저장/복원 구조를 추가해 `/auth`, `/timer` 흐름을 구성했습니다.
- **인증 UI 및 타이머 페이지**: 회원가입/로그인 폼을 구현하고, 스크램블 조회, 종목 선택, 타이머 상태 머신, 기록 저장 버튼까지 하나의 타이머 페이지로 연결했습니다.
- **큐브 타이머 UX 반영**: 스페이스바를 길게 눌러 `holding -> ready` 상태로 전환하고, 손을 떼면 시작되며 다시 누르면 기록이 멈추는 흐름을 구현했습니다.

---

## 사용 기술

- Java 17, Spring Boot 3.x
- Spring Security, Spring REST Docs
- JUnit 5, MockMvc, Mockito
- React, Vite
- React Router DOM, Axios

---

## 코드

```javascript
if (status === 'idle') {
  event.preventDefault()
  setStatus('holding')
  clearHoldTimeout()
  holdTimeoutRef.current = window.setTimeout(() => {
    setStatus('ready')
  }, HOLD_DELAY_MS)
  return
}

if (status === 'running') {
  event.preventDefault()
  stopAnimation()
  const nextFinalTime = performance.now() - startTimeRef.current
  setDisplayTime(nextFinalTime)
  setFinalTime(nextFinalTime)
  setStatus('stopped')
}
```

---

## 문제

- **문제**: 기록 저장 API는 `scramble` 값을 필수로 요구하지만, 기존에는 프런트가 호출할 수 있는 스크램블 조회 API가 없었고, 미지원 종목은 placeholder 문자열이 그대로 저장될 위험이 있었음
- **해결**: `GET /api/scramble`를 별도로 추가하고 `WCA_333`만 허용하도록 서버에서 검증했으며, 프런트에서는 미지원 종목 선택 시 타이머 시작과 기록 저장을 차단하도록 처리함

---

## 다음 작업

- 프런트엔드에서 랭킹 조회 API 연동 및 테이블 UI 렌더링
- 게시판 목록/작성 페이지 연동
- 전체 프런트엔드-백엔드 수동 통합 테스트 및 결함 보완
