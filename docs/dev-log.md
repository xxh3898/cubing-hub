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
| 작업명 | Backlog implement: 타이머 스크램블 이미지 렌더링 |
| 상태 | `TimerPage` 상단 스크램블 패널에 VisualCube 기반 이미지 미리보기를 추가했고, 이미지 로드 실패 시 텍스트 스크램블만 유지하도록 fallback을 넣었다. 프런트 `lint`, `test`, `build`는 통과했다 |
| 범위 | `TimerPage` 스크램블 시각화 UI 추가, 타이머 스타일 보강, 타이머 회귀 테스트 추가, `Feature Backlog` / `Screen Specification` 동기화 |
| 핵심 리스크 | VisualCube 외부 응답이 느리거나 실패하는 운영 브라우저 상황의 체감 UX와 모바일 레이아웃은 아직 수동 검증이 남아 있다 |
| 참조 문서 | [Feature Backlog](./Feature%20Backlog.md), [Project Overview](./Project%20Overview.md), [Screen Specification](./Screen%20Specification.md), [Day 21](./Development%20Log/Day%2021.md) |
| 다음 로그 대상 | 피드백 메일 실제 전송 또는 모바일 UX 관련 다음 backlog 항목 선택 결과 |

## 로그 파일 목록

| 구간 | 로그 | 설명 |
| --- | --- | --- |
| Week 1 | [Day 1](./Development%20Log/Day%2001.md) ~ [Day 7](./Development%20Log/Day%2007.md) | 인프라, Testcontainers, REST Docs, 모니터링, 보안 기반 |
| Core API | [Day 8](./Development%20Log/Day%2008.md) ~ [Day 11](./Development%20Log/Day%2011.md) | 인증, 기록, 랭킹, 게시판 API 기준선 |
| Frontend 연동 기반 | [Day 12](./Development%20Log/Day%2012.md) | `AuthContext`, 타이머, 스크램블/기록 저장 연동 |
| 프런트 목업 기준선 | [Day 13](./Development%20Log/Day%2013.md) | 서비스형 UI 목업과 화면 요구사항 기준선 |
| 최신 로그 | [Day 19](./Development%20Log/Day%2019.md), [Day 20](./Development%20Log/Day%2020.md), [Day 21](./Development%20Log/Day%2021.md) | V1 baseline 확보, Redis 랭킹 V2와 재측정, AWS 1차 배포와 운영 이슈 정리 |

## 주요 설계 결정 추적

- 인증/인가 구조: [Authentication & Authorization Design](./Authentication%20%26%20Authorization%20Design.md), [API Specification](./API%20Specification.md), [Day 12](./Development%20Log/Day%2012.md), [Day 14](./Development%20Log/Day%2014.md), [Day 15](./Development%20Log/Day%2015.md)
- 랭킹 V1 -> V2 전략: [Project Overview](./Project%20Overview.md), [API Specification](./API%20Specification.md), [Day 10](./Development%20Log/Day%2010.md), [Day 19](./Development%20Log/Day%2019.md), [Day 20](./Development%20Log/Day%2020.md), [Internal Schedule](./Internal%20Schedule.internal.md)
- 프런트 mock -> 실연동 전환: [Screen Specification](./Screen%20Specification.md), [Day 13](./Development%20Log/Day%2013.md), [Day 14](./Development%20Log/Day%2014.md), [Day 16](./Development%20Log/Day%2016.md), [Day 17](./Development%20Log/Day%2017.md), [Day 18](./Development%20Log/Day%2018.md)
- 테스트/문서화/CI 기준선: [Day 2](./Development%20Log/Day%2002.md), [Day 3](./Development%20Log/Day%2003.md), [Day 4](./Development%20Log/Day%2004.md), [Day 17](./Development%20Log/Day%2017.md), [Day 18](./Development%20Log/Day%2018.md)

## 최근 정리 문서

- 최근 일자 로그: [Day 21](./Development%20Log/Day%2021.md)
- 현재 작업 요약: [Day 20](./Development%20Log/Day%2020.md), [Day 21](./Development%20Log/Day%2021.md)
- 현재 단계 리뷰: [현재 개발 단계 리뷰](./ai/20260414-현재개발단계리뷰/review-현재개발단계리뷰.md)
- 인증 설계 기준: [Authentication & Authorization Design](./Authentication%20%26%20Authorization%20Design.md)
- API 계약 기준: [API Specification](./API%20Specification.md)
- 현재 내부 일정: [Internal Schedule](./Internal%20Schedule.internal.md)

## 문서 반영 체크

- [x] `docs/dev-log.md`가 허브 문서 역할로 전환됨
- [x] 현재 작업 링크가 일정표, 설계 문서, 일자별 로그와 연결됨
- [x] `docs/Development Log/Day 17.md`, `docs/Development Log/Day 18.md`, `docs/Development Log/Day 19.md` 작성
- [x] Day 17, Day 18, Day 19 진행 상태 기준으로 `최근 정리 문서` 갱신
- [x] 주요 설계 결정 추적 링크 추가 보강 여부 재검토

## 면접용 우선 복습 대상

- JWT Access Token + Redis Refresh Token Rotation을 왜 선택했는지
- `메모리 Access Token + HttpOnly Refresh Cookie`를 왜 선택했는지
- 랭킹을 V1(`records`)과 V2(Redis ZSET)로 나눈 이유
- Testcontainers, REST Docs, GitHub Actions를 한 흐름으로 묶은 이유
- 프런트 mock 기준선 이후 실연동 순서를 왜 인증 저장 전략 정리 -> 랭킹 -> 게시판 -> 댓글 -> 대시보드 -> 피드백으로 잡았는지

## 운영 메모

- 이 문서는 허브다. 상세 로그는 `docs/Development Log/Day *.md`에 남긴다.
- 현재 Day 17, Day 18 안정화 결과는 `docs/Development Log/Day 17.md`, `docs/Development Log/Day 18.md`에 정리했다.
- 상세 작업 메모와 중간 정리 문서는 이 허브에 직접 노출하지 않고, 최종 결정과 상태만 유지한다.
- 상단 계정 chip은 현재 `/api/me` 기반으로 동작한다.
- `refresh_token` 누락 요청은 현재 `400 Bad Request`와 `refresh_token 쿠키가 필요합니다.` 메시지로 정리됐다.
- Rotation 이후 이전 `refresh_token` 재사용은 현재 `401 Unauthorized`와 전체 세션 만료 메시지로 정리됐다.
- generated REST Docs도 로그인 실패, refresh `400/401`, 보호 API `401`, 게시글 `401/400/404/403` 예시를 포함하도록 맞췄다.
- GitHub Actions는 현재 generated REST Docs HTML(`restdocs-site`)과 JaCoCo 리포트를 artifact로 회수할 수 있다.
- GitHub Actions에는 `workflow_dispatch` 기반 `performance-benchmark.yml`을 추가해 수동 baseline 재현과 `summary.json`, `comparison.md` artifact 회수가 가능하다.
- 공통 예외와 보안 예외 응답은 외부 메시지를 유지한 채 내부 로그를 남기도록 정리했다.
- JaCoCo는 현재 Querydsl generated `Q*` class를 제외한 기준으로 다시 읽고, `ScrambleGenerator`, `GlobalExceptionHandler`, `Post` 생성자 분기 테스트를 추가해 `common.util`, `common.exception`, entity 기준선을 보정했다.
- root `.env.example`와 local env 분리 기준을 추가해 local DB password, JWT secret, Grafana 기본 비밀번호 하드코딩을 제거했다.
- React에는 `Vitest`, `Testing Library`, `jsdom`, `axios-mock-adapter`와 공통 setup, smoke 테스트를 추가했다.
- React auth는 access token을 메모리에만 저장하고 앱 초기 `refresh -> /api/me`로 세션을 복구하도록 전환했다.
- React auth 회귀 테스트로 `AuthContext`, `apiClient` refresh queue, 보호/guest-only route 핵심 분기를 고정했다.
- 로그인 직후 새로고침 세션 복구, 복구 실패 세션 정리, 비로그인 보호 route 접근, 권한 부족 `403`까지 수동 검증으로 확인했다.
- 최종 재측정 기준 `MySQL-v1`은 `GET /api/rankings?eventType=WCA_333&page=1&size=25`에서 `avg 7,245.23 ms`, `p95 12,429.58 ms`였다.
- 최종 재측정 기준 `redis-v2`는 같은 시나리오에서 `avg 21.10 ms`, `p95 36.94 ms`, `1,502.77 req/s`를 기록했고 비교 산출물은 `docs/performance/rankings-v1-v2-comparison.*`에 저장했다.
- 현재 랭킹 구조는 `nickname` 미입력 기본 조회 Redis, `nickname` 검색 MySQL fallback hybrid다.
- local 프로필은 startup 재구축을 사용하고, production first deploy는 `update` / `true` 1회 적용 후 `validate` / `false`로 원복했다.
- 실제 AWS 1차 배포에서 frontend env 누락, Docker image amd64 manifest, Nginx SSL 보조 파일 누락을 확인했고 재발 방지 체크리스트를 별도 문서로 정리했다.
- backend/frontend 자동 deploy workflow 파일은 추가됐고, GitHub `Secrets` / `Variables` 연결 후 실제 실행 결과를 확인해야 한다.
