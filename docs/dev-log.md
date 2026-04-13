# Dev Log Index

## 목적

- 날짜별 개발 로그의 진입점과 현재 진행 중 작업을 빠르게 확인하는 허브 문서다.
- 상세 개발 기록은 `docs/Development Log/Day *.md`에 남기고, 이 문서는 인덱스와 상태 요약만 유지한다.

## 사용 원칙

- 상세 구현 로그, 트러블슈팅 본문, 회고는 이 문서에 직접 누적하지 않는다.
- 현재 작업 범위, 핵심 리스크, 참조 문서, 복습 우선순위만 짧게 갱신한다.
- 새 날짜별 로그가 생기면 `로그 파일 목록`과 `최근 정리 문서`를 함께 갱신한다.

## 현재 진행 중 작업

| 필드 | 값 |
| --- | --- |
| 작업명 | Day 15 보안 기본기 + Auth 계약/테스트 정리 |
| 상태 | 계획 확정, 문서 반영 완료, 구현 예정 |
| 범위 | secret/basic password 정리, `메모리 Access Token + HttpOnly Refresh Cookie`, auth 예외 계약, 인증 최소 테스트 |
| 핵심 리스크 | 앱 초기 `refresh -> /api/me` 부트스트랩, `refresh_token` cookie의 `SameSite`/`Secure`/CORS `credentials`, refresh 실패 시 세션 종료 UX, same-tab auth 상태 책임 재정리 |
| 참조 문서 | [Internal Schedule](./Internal%20Schedule.internal.md), [Authentication & Authorization Design](./Authentication%20%26%20Authorization%20Design.md), [Project Schedule](./Project%20Schedule.md), [Day 14](./Development%20Log/Day%2014.md) |
| 다음 로그 대상 | Day 15 토큰 저장 전략 전환과 auth 예외/테스트 정리 |

## 로그 파일 목록

| 구간 | 로그 | 설명 |
| --- | --- | --- |
| Week 1 | [Day 1](./Development%20Log/Day%201.md) ~ [Day 7](./Development%20Log/Day%207.md) | 인프라, Testcontainers, REST Docs, 모니터링, 보안 기반 |
| Core API | [Day 8](./Development%20Log/Day%208.md) ~ [Day 11](./Development%20Log/Day%2011.md) | 인증, 기록, 랭킹, 게시판 API 기준선 |
| Frontend 연동 기반 | [Day 12](./Development%20Log/Day%2012.md) | `AuthContext`, 타이머, 스크램블/기록 저장 연동 |
| 프런트 목업 기준선 | [Day 13](./Development%20Log/Day%2013.md) | 서비스형 UI 목업과 화면 요구사항 기준선 |
| 최신 로그 | [Day 14](./Development%20Log/Day%2014.md) | 인증 실연동 구현과 정적 검증 결과 |

## 주요 설계 결정 추적

- 인증/인가 구조: [Authentication & Authorization Design](./Authentication%20%26%20Authorization%20Design.md), [API Specification](./API%20Specification.md), [Day 12](./Development%20Log/Day%2012.md), [Day 14](./Development%20Log/Day%2014.md)
- 랭킹 V1 -> V2 전략: [Project Overview](./Project%20Overview.md), [API Specification](./API%20Specification.md), [Day 10](./Development%20Log/Day%2010.md), [Internal Schedule](./Internal%20Schedule.internal.md)
- 프런트 mock -> 실연동 전환: [Screen Specification](./Screen%20Specification.md), [Day 13](./Development%20Log/Day%2013.md), [Day 14](./Development%20Log/Day%2014.md)
- 테스트/문서화/CI 기준선: [Day 2](./Development%20Log/Day%202.md), [Day 3](./Development%20Log/Day%203.md), [Day 4](./Development%20Log/Day%204.md)

## 최근 정리 문서

- 최근 일자 로그: [Day 14](./Development%20Log/Day%2014.md)
- 현재 작업 요약: [Day 14](./Development%20Log/Day%2014.md)
- 인증 설계 기준: [Authentication & Authorization Design](./Authentication%20%26%20Authorization%20Design.md)
- API 계약 기준: [API Specification](./API%20Specification.md)
- 현재 내부 일정: [Internal Schedule](./Internal%20Schedule.internal.md)

## 문서 반영 체크

- [x] `docs/dev-log.md`가 허브 문서 역할로 전환됨
- [x] 현재 작업 링크가 일정표, 설계 문서, 일자별 로그와 연결됨
- [x] `docs/Development Log/Day 14.md` 작성
- [x] Day 14 완료 후 `최근 정리 문서` 갱신
- [x] 주요 설계 결정 추적 링크 추가 보강 여부 재검토

## 면접용 우선 복습 대상

- JWT Access Token + Redis Refresh Token Rotation을 왜 선택했는지
- `메모리 Access Token + HttpOnly Refresh Cookie`를 왜 선택했는지
- 랭킹을 V1(`records`)과 V2(Redis ZSET)로 나눈 이유
- Testcontainers, REST Docs, GitHub Actions를 한 흐름으로 묶은 이유
- 프런트 mock 기준선 이후 실연동 순서를 왜 인증 저장 전략 정리 -> 랭킹 -> 게시판 -> 댓글 -> 대시보드로 잡았는지

## 운영 메모

- 이 문서는 허브다. 상세 로그는 `docs/Development Log/Day *.md`에 남긴다.
- 현재 Day 14 구현 결과와 수동 검증 결과는 `docs/Development Log/Day 14.md`에 정리했다.
- 상세 작업 메모와 중간 정리 문서는 이 허브에 직접 노출하지 않고, 최종 결정과 상태만 유지한다.
- 상단 계정 chip은 현재 `/api/me` 기반으로 동작한다.
- local `Secure` cookie의 실제 브라우저 동작은 확인 완료했고, 다음 단계에서는 `메모리 Access Token + HttpOnly Refresh Cookie` 구조로 저장 전략을 정리한다.
