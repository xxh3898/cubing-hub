# Feature Backlog

## 목적

- 개발 중 떠오른 후속 기능 후보를 한곳에 모아 관리한다.
- 아직 일정에 올리지 않은 제품/기능 아이디어만 기록한다.

## 운영 원칙

- MVP 범위와 제외 범위의 기준선은 [Project Overview](./Project%20Overview.md)에서 관리한다.
- 실제 일정에 올린 항목은 [Project Schedule](./Project%20Schedule.md) 또는 개발 로그에서 추적한다.
- 이 문서에는 운영/배포 작업보다 사용자에게 직접 가치가 있거나 기능 확장 여지가 있는 항목을 우선 남긴다.
- 상태와 우선순위가 확정되지 않은 항목은 `candidate`, `미정`으로 유지하고 추측해서 올리지 않는다.

## Backlog Summary

| Category               | Count | Note                     |
| ---------------------- | ----- | ------------------------ |
| Timer & Records        | 5     | 기록 분석, 타이머 UX, 데이터 활용 확장 |
| Learning & Guide       | 1     | 큐빙 학습/입문 안내 확장            |
| UI / UX Polish         | 2     | 공통 문구와 페이지네이션 사용성 개선 |
| Feedback & Integration | 1     | 피드백 운영 알림과 확인 흐름 실사용화     |
| Account & Admin        | 3     | 계정 관리와 운영 도구 후속 확장       |
| Community              | 1     | 게시글 작성 경험 확장              |
| Mobile UX              | 2     | 모바일 접근성과 입력 방식 보강        |
| Reference Notes        | 1     | 비교 서비스 기반 기능 후보 탐색       |

## Timer & Records

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 기록 그래프 시각화 | done | 완료 | 기록 추세와 개선 흐름을 한눈에 파악할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md) | 마이페이지에 주 종목 기준 최근 기록 추세 그래프를 반영했다. |
| 타이머 페이지 스크램블에 맞게 이미지 렌더링 | done | 완료 | 현재 스크램블 텍스트를 더 직관적으로 이해할 수 있다. | [Screen Specification](./Screen%20Specification.md) | 타이머 상단 스크램블 패널에 VisualCube 기반 미리보기를 반영했다. |
| 타이머 Ao5, Ao12 구현 | done | 완료 | 단일 기록 외 평균 지표까지 바로 확인할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md) | 타이머에서 선택 종목 기준 최근 12개 기록으로 Ao5, Ao12를 계산해 표시한다. |
| 기록 내보내기 | candidate | 미정 | 개인 기록을 백업하거나 외부 도구와 연동할 수 있다. | [Project Overview](./Project%20Overview.md), [API Specification](./API%20Specification.md) | export format과 다운로드 방식 결정 필요 |
| 오늘의 스크램블 날짜 기준 고정 | done | 완료 | 새로고침마다 바뀌지 않고 하루 동안 같은 스크램블을 기준으로 홈 경험을 유지할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md), [API Specification](./API%20Specification.md) | `GET /api/home`는 `Asia/Seoul` 날짜 기준으로 같은 날 같은 스크램블을 반환하도록 반영했다. |

## UI / UX Polish

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 홈/공통 소개 문구 정리 | done | 완료 | 홈 상단 소개 문구를 더 자연스럽고 제품 중심으로 정리해 첫 인상을 개선할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md) | 상단 helper text를 제품 소개형 문구로 교체했다. |
| 공통 페이지네이션 UX 개선 | done | 완료 | 긴 페이지 번호 나열 대신 `1~10` 단위 그룹과 `<<`, `>>` 이동을 적용해 탐색 가독성을 높일 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md), [API Specification](./API%20Specification.md) | 랭킹, 커뮤니티 목록, 댓글, 마이페이지에 grouped 페이지네이션을 반영했다. |

## Learning & Guide

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 회전기호 설명 페이지 | done | 완료 | 큐빙 표기법이 익숙하지 않은 사용자도 학습/타이머 진입 장벽을 낮출 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md) | 학습 화면 첫 번째 탭에 WCA `3x3x3` 스크램블 기준 `U/D/L/R/F/B`의 기본, prime, double turn VisualCube 가이드를 배치했다. |

## Feedback & Integration

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 피드백 운영 알림 내부 추적 | done | 완료 | 서비스 안에서 보낸 피드백을 운영 채널로 즉시 연결하고, 일반 사용자 화면은 접수 결과만 간단히 확인할 수 있다. | [Project Overview](./Project%20Overview.md), [API Specification](./API%20Specification.md), [Deployment & Infrastructure Design](./Deployment%20&%20Infrastructure%20Design.md), [Screen Specification](./Screen%20Specification.md) | `POST /api/feedbacks`는 접수 결과만 반환하고, Discord 운영 알림 상태는 내부 저장과 관리자 화면에서 추적한다. |

## Account & Admin

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 정보 변경 기능 (`닉네임`, `비밀번호` 등) | done | 완료 | 회원가입 이후에도 계정 정보를 직접 관리할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md), [API Specification](./API%20Specification.md) | 마이페이지 `계정 관리` 모달에서 닉네임/주 종목 수정과 현재 비밀번호 확인 후 비밀번호 변경을 처리할 수 있다. |
| 비밀번호 재설정 기능 | done | 완료 | 비밀번호 분실 시 계정 회복 경로를 제공할 수 있다. | [Project Overview](./Project%20Overview.md), [API Specification](./API%20Specification.md) | 이메일 6자리 인증번호와 Redis TTL을 재사용해 로그인 전 비밀번호 재설정 흐름을 제공한다. |
| 관리자 피드백/Q&A/메모 운영 | done | 완료 | 운영 질문, 답변, 공개 여부, 내부 메모를 한곳에서 관리할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md), [API Specification](./API%20Specification.md) | `/admin`, `/api/admin/feedbacks`, `/api/admin/memos`, `/qna` 흐름을 반영했다. |

## Community

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 게시글 사진첨부 기능 | done | 완료 | 글 작성 시 이미지로 설명과 기록 공유를 더 쉽게 할 수 있다. | [Project Overview](./Project%20Overview.md), [API Specification](./API%20Specification.md), [Screen Specification](./Screen%20Specification.md), [Deployment & Infrastructure Design](./Deployment%20&%20Infrastructure%20Design.md) | 게시글 create/update에서 다중 이미지 첨부, S3 + DB 메타데이터 저장, 운영 환경 변수 전달까지 반영했다. |

## Mobile UX

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 모바일 반응형 구현 | done | 완료 | 모바일 브라우저에서도 주요 흐름을 무리 없이 사용할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md) | 상단 nav와 주요 액션 영역을 모바일 grid/세로 배치 기준으로 재배치하고, 홈/랭킹/커뮤니티/마이페이지 표형 데이터를 카드형 행으로 정리했다. |
| 모바일용 터치 타이머 구현 | done | 완료 | 모바일 환경에서도 실제 타이머 사용 경험을 제공할 수 있다. | [Screen Specification](./Screen%20Specification.md) | `touch`/`pen` pointer 입력이 keyboard `Space`와 같은 상태 머신을 공유하도록 반영해 hold, ready, start, stop 흐름을 모바일에서도 지원한다. |

## Reference Notes

| Reference | Status | Why Review | Next Action |
| --- | --- | --- | --- |
| CSTimer 기능 비교 | note | 빠진 기록/통계/타이머 UX 후보를 찾는 기준선으로 활용할 수 있다. | 필요한 기능만 backlog 항목으로 승격하고, 단순 벤치마크 메모는 여기서 관리한다. |

## 승격 규칙

- backlog 항목이 실제 구현 범위로 확정되면 이 문서에서 `scheduled`로 표시하거나 일정 문서로 옮긴다.
- 구현 완료 후에는 backlog에서 제거하지 말고 상태만 갱신할지, 개발 로그에 위임할지 당시 문맥에 맞춰 결정한다.
- 상위 수준 범위 설명만 필요한 내용은 [Project Overview](./Project%20Overview.md)에 남기고, 상세 후보는 이 문서에 유지한다.
