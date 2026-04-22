# Feature Backlog

## 목적

- 개발 중 떠오른 후속 기능 후보를 한곳에 모아 관리한다.
- 아직 일정에 올리지 않은 제품/기능 아이디어만 기록한다.

## 운영 원칙

- MVP 범위와 제외 범위의 기준선은 [Project Overview](./Project%20Overview.md)에서 관리한다.
- 실제 일정에 올린 항목은 [Project Schedule](./Project%20Schedule.md) 또는 개발 로그에서 추적한다.
- 이 문서에는 운영/배포 작업보다 사용자 가치와 기능 확장성이 있는 항목을 우선 남긴다.
- 상태와 우선순위가 확정되지 않은 항목은 `candidate`, `미정`으로 유지하고 추측해서 올리지 않는다.

## Backlog Summary

| Category               | Count | Note                     |
| ---------------------- | ----- | ------------------------ |
| Timer & Records        | 5     | 기록 분석, 타이머 UX, 데이터 활용 확장 |
| UI / UX Polish         | 2     | 공통 문구와 페이지네이션 사용성 개선 |
| Feedback & Integration | 1     | 피드백 전달 흐름 실사용화           |
| Mobile UX              | 2     | 모바일 접근성과 입력 방식 보강        |
| Reference Notes        | 1     | 비교 서비스 기반 기능 후보 탐색       |

## Timer & Records

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 기록 그래프 시각화 | candidate | 미정 | 기록 추세와 개선 흐름을 한눈에 파악할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md) | 마이페이지 또는 기록 대시보드 확장 후보 |
| 타이머 페이지 스크램블에 맞게 이미지 렌더링 | done | 완료 | 현재 스크램블 텍스트를 더 직관적으로 이해할 수 있다. | [Screen Specification](./Screen%20Specification.md) | 타이머 상단 스크램블 패널에 VisualCube 기반 미리보기를 반영했다. |
| 타이머 Ao5, Ao12 구현 | candidate | 미정 | 단일 기록 외 평균 지표까지 바로 확인할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md) | 기록 통계 규칙과 UI 노출 방식 정리 필요 |
| 기록 내보내기 | candidate | 미정 | 개인 기록을 백업하거나 외부 도구와 연동할 수 있다. | [Project Overview](./Project%20Overview.md), [API Specification](./API%20Specification.md) | export format과 다운로드 방식 결정 필요 |
| 오늘의 스크램블 날짜 기준 고정 | done | 완료 | 새로고침마다 바뀌지 않고 하루 동안 같은 스크램블을 기준으로 홈 경험을 유지할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md), [API Specification](./API%20Specification.md) | `GET /api/home`는 `Asia/Seoul` 날짜 기준으로 같은 날 같은 스크램블을 반환하도록 반영했다. |

## UI / UX Polish

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 홈/공통 소개 문구 정리 | done | 완료 | 홈 상단 소개 문구를 더 자연스럽고 제품 중심으로 정리해 첫 인상을 개선할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md) | 상단 helper text를 제품 소개형 문구로 교체했다. |
| 공통 페이지네이션 UX 개선 | done | 완료 | 긴 페이지 번호 나열 대신 `1~10` 단위 그룹과 `<<`, `>>` 이동을 적용해 탐색 가독성을 높일 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md), [API Specification](./API%20Specification.md) | 랭킹, 커뮤니티 목록, 댓글, 마이페이지에 grouped 페이지네이션을 반영했다. |

## Feedback & Integration

| Feature             | Status    | Priority | User Value                          | Related Docs                                                                                                                                                                    | Notes                                         |
| ------------------- | --------- | -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 피드백을 지정한 이메일로 실제 전송 | candidate | 미정       | 서비스 안에서 보낸 피드백을 실제 운영 채널로 연결할 수 있다. | [Project Overview](./Project%20Overview.md), [API Specification](./API%20Specification.md), [Deployment & Infrastructure Design](./Deployment%20&%20Infrastructure%20Design.md) | 수신 주소와 메일 전송 설정은 코드 하드코딩이 아니라 환경설정으로 관리해야 한다. |

## Mobile UX

| Feature | Status | Priority | User Value | Related Docs | Notes |
| --- | --- | --- | --- | --- | --- |
| 모바일 반응형 구현 | candidate | 미정 | 모바일 브라우저에서도 주요 흐름을 무리 없이 사용할 수 있다. | [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md) | 공통 레이아웃과 주요 페이지 전체 점검 필요 |
| 모바일용 터치 타이머 구현 | candidate | 미정 | 모바일 환경에서도 실제 타이머 사용 경험을 제공할 수 있다. | [Screen Specification](./Screen%20Specification.md) | hold, ready, start, stop 제스처 기준 별도 설계 필요 |

## Reference Notes

| Reference | Status | Why Review | Next Action |
| --- | --- | --- | --- |
| CSTimer 기능 비교 | note | 빠진 기록/통계/타이머 UX 후보를 찾는 기준선으로 활용할 수 있다. | 필요한 기능만 backlog 항목으로 승격하고, 단순 벤치마크 메모는 여기서 관리한다. |

## 승격 규칙

- backlog 항목이 실제 구현 범위로 확정되면 이 문서에서 `scheduled`로 표시하거나 일정 문서로 옮긴다.
- 구현 완료 후에는 backlog에서 제거하지 말고 상태만 갱신할지, 개발 로그에 위임할지 당시 문맥에 맞춰 결정한다.
- 상위 수준 범위 설명만 필요한 내용은 [Project Overview](./Project%20Overview.md)에 남기고, 상세 후보는 이 문서에 유지한다.
