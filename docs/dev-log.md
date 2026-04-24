# Dev Log Index

## 목적

- 날짜별 개발 로그의 진입점과 현재 마감 상태를 빠르게 확인하는 허브 문서다.
- 상세 구현 로그는 `docs/Development Log/Day *.md`에 남기고, 이 문서는 인덱스와 현재 상태 요약만 유지한다.

## 사용 원칙

- 상세 구현 메모, 트러블슈팅 본문, 회고 장문은 이 문서에 누적하지 않는다.
- 현재 상태, 참조 문서, 남은 운영 과제, 복습 우선순위만 짧게 갱신한다.
- 새 날짜별 로그가 생기면 `로그 파일 목록`과 `최근 정리 문서`를 함께 갱신한다.

## 현재 상태

| 필드 | 값 |
| --- | --- |
| 작업명 | 최종 테스트 커버리지와 문서/포트폴리오 동기화 |
| 상태 | SMTP/S3 운영 경로 테스트, backend JaCoCo 100%, 공개 Q&A/관리자 화면 테스트, frontend Vitest 커버리지 100%, 실제 SMTP/S3/브라우저 수동 스모크 검증, 공식·내부 문서 동기화 완료 |
| 범위 | `backend` 운영 어댑터/설정/서비스/저장소 분기 테스트, `frontend` 라우트/페이지/유틸 커버리지 테스트, 추적 중인 코드·설정 전수 분석, `README`, `Project Overview`, `Project Schedule`, `Internal Schedule.internal`, `Deployment & Infrastructure Design`, `portfolio.internal.md`, `docs/Development Log/Day 29.md` |
| 핵심 리스크 | 실제 SMTP/S3/브라우저 스모크 검증은 사용자 수동 확인으로 통과했지만, 실서비스 스모크 자동화는 아직 별도 workflow나 테스트로 고정하지 않았다 |
| 참조 문서 | [Project Overview](./Project%20Overview.md), [Project Schedule](./Project%20Schedule.md), [Deployment & Infrastructure Design](./Deployment%20%26%20Infrastructure%20Design.md), [2026-04-24 최종 품질 검증 로그](./Development%20Log/Day%2029.md), [Portfolio](./portfolio.internal.md) |
| 다음 로그 대상 | 다음 의미 있는 기능/운영 변경이나 후속 API 계약 조정이 열릴 때만 별도 로그를 추가한다 |

## 로그 파일 목록

| 구간 | 로그 | 설명 |
| --- | --- | --- |
| Week 1 | [Day 1](./Development%20Log/Day%2001.md) ~ [Day 7](./Development%20Log/Day%2007.md) | 인프라, Testcontainers, REST Docs, 모니터링, 보안 기반 |
| Core API | [Day 8](./Development%20Log/Day%2008.md) ~ [Day 11](./Development%20Log/Day%2011.md) | 인증, 기록, 랭킹, 게시판 API 기준선 |
| Frontend 연동 기반 | [Day 12](./Development%20Log/Day%2012.md) | `AuthContext`, 타이머, 스크램블/기록 저장 연동 |
| 프런트 목업 기준선 | [Day 13](./Development%20Log/Day%2013.md) | 서비스형 UI 목업과 화면 요구사항 기준선 |
| 보조 유지보수 로그 | [2026-04-10 로그](./Development%20Log/Day%2014.md), [2026-04-19 로그](./Development%20Log/Day%2020.md) | 주요 기능 작업일 사이에 들어간 저장소 규칙 정리와 backlog 기준선 추가 |
| 최신 로그 | [2026-04-22 배포 로그](./Development%20Log/Day%2023.md), [2026-04-23 이메일 인증](./Development%20Log/Day%2024.md), [2026-04-23 모바일/타이머](./Development%20Log/Day%2025.md), [2026-04-23 계정 복구/학습](./Development%20Log/Day%2026.md), [2026-04-23 관리자/운영/마감](./Development%20Log/Day%2027.md), [2026-04-24 피드백 계약 정리](./Development%20Log/Day%2028.md), [2026-04-24 최종 품질 검증](./Development%20Log/Day%2029.md) | AWS 배포, 이메일 인증, 모바일/타이머/입력 검증, 계정 복구/관리, 관리자/운영 안정화, 공개 피드백 계약 정리, 최종 커버리지/문서 마감 |

## 주요 설계 결정 추적

- 인증/인가 구조: [Authentication & Authorization Design](./Authentication%20%26%20Authorization%20Design.md), [API Specification](./API%20Specification.md), [2026-04-13 인증 실연동](./Development%20Log/Day%2015.md), [2026-04-14 auth 계약/랭킹](./Development%20Log/Day%2016.md), [2026-04-23 이메일 인증](./Development%20Log/Day%2024.md)
- 랭킹 V1 -> V2 전략: [Project Overview](./Project%20Overview.md), [API Specification](./API%20Specification.md), [2026-04-20 기준선 측정](./Development%20Log/Day%2021.md), [2026-04-21 Redis V2 재측정](./Development%20Log/Day%2022.md), [Internal Schedule](./Internal%20Schedule.internal.md)
- 프런트 mock -> 실연동 전환: [Screen Specification](./Screen%20Specification.md), [2026-04-15 핵심 기능 구현](./Development%20Log/Day%2017.md), [2026-04-17 안정화](./Development%20Log/Day%2018.md), [2026-04-17 CSS/문서 정리](./Development%20Log/Day%2019.md), [2026-04-23 계정 복구/학습](./Development%20Log/Day%2026.md)
- 운영/배포와 마감: [System Architecture](./System%20Architecture.md), [Deployment & Infrastructure Design](./Deployment%20%26%20Infrastructure%20Design.md), [2026-04-22 AWS 1차 배포](./Development%20Log/Day%2023.md), [2026-04-23 관리자/운영/마감](./Development%20Log/Day%2027.md), [Portfolio](./portfolio.internal.md)
- 피드백 public 계약 정리: [API Specification](./API%20Specification.md), [Screen Specification](./Screen%20Specification.md), [Database Design](./Database%20Design.md), [2026-04-24 피드백 계약 로그](./Development%20Log/Day%2028.md)
- 최종 테스트/커버리지 마감: [2026-04-24 최종 품질 검증](./Development%20Log/Day%2029.md), [Project Schedule](./Project%20Schedule.md), [Portfolio](./portfolio.internal.md)

## 최근 정리 문서

- 최근 정리 로그: [2026-04-24 최종 품질 검증 로그](./Development%20Log/Day%2029.md)
- 이전 계약 정리 로그: [2026-04-24 피드백 계약 로그](./Development%20Log/Day%2028.md)
- 이전 마감 로그: [2026-04-23 관리자/운영/마감](./Development%20Log/Day%2027.md)
- 현재 내부 일정: [Internal Schedule](./Internal%20Schedule.internal.md)
- 운영/배포 기준: [Deployment & Infrastructure Design](./Deployment%20%26%20Infrastructure%20Design.md)
- 설명 자산: [Portfolio](./portfolio.internal.md)

## 문서 반영 체크

- [x] 허브 문서를 최종 테스트 커버리지와 문서 마감 기준으로 최신화함
- [x] `2026-04-24` 최종 품질 검증 로그가 추가되고 최신 문서 링크가 교체됨
- [x] backend JaCoCo 100%, frontend Vitest 커버리지 100%, SMTP/S3 운영 어댑터 테스트, 공개 Q&A/관리자 UI 테스트 결과를 설명 자산에 반영함
- [x] CI 강제 범위와 로컬 커버리지 검증 범위를 분리해서 문서화함
- [x] 추적 중인 코드·설정 전체 분석 결과와 사용자 수동 SMTP/S3/브라우저 스모크 검증 통과 상태를 최신 문서에 반영함

## 면접용 우선 복습 대상

- JWT Access Token + Redis Refresh Token Rotation을 왜 선택했는지
- `메모리 Access Token + HttpOnly Refresh Cookie`를 왜 선택했는지
- 랭킹을 V1 기준선과 Redis V2 구조로 나눠 설명하는 이유
- 마이페이지 summary를 aggregate query로 최적화한 benchmark를 왜 별도 근거로 남겼는지
- CI와 배포 workflow를 분리하고 `workflow_run + workflow_dispatch`를 조합한 이유
- 실배포 이슈를 runbook과 workflow에 반영한 이유
- 커버리지 100%를 수치 자체가 아니라 운영 어댑터와 UI 분기 사각지대 제거로 설명하는 이유

## 운영 메모

- 이 문서는 허브다. 상세 로그는 `docs/Development Log/Day *.md`에 남긴다.
- 현재 일반 사용자 피드백 응답은 접수 결과만 반환하고, Discord 운영 알림 상태는 관리자 경로와 DB에서 추적한다.
- 인증서 갱신 자동화, 운영 Redis rebuild trigger, 추가 benchmark 범위는 현재 차단 요인이 아니라 후속 운영 과제다.
- 실제 SMTP/S3 운영 스모크 검증과 최종 브라우저 수동 QA는 사용자 수동 확인으로 통과했으며, 자동화된 실서비스 스모크 검증은 후속 운영 과제로 남긴다.
- 포트폴리오 문서는 AI 작업 산출물 중 반영할 가치가 있는 내용을 골라 현재 구현 상태에 맞게 정리했다.
