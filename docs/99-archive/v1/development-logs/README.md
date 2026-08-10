---
doc_type: archive
status: deprecated
created: 2026-04-13
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/README.md
---

> V1 시점의 역사 자료입니다. 현재 Source of Truth가 아니며, 현재 기준은 [문서 체계 안내](../../../README.md)에서 확인합니다.

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
| 작업명 | CFOP 공식 데이터 중복 보정 |
| 상태 | 학습 화면의 `F2L`, `OLL` 정적 데이터에서 중복으로 보이던 5묶음의 대표 공식을 보정하고, CFOP 케이스 수·공식·VisualCube URL 중복 방지 테스트를 추가했다. `npx vitest run --coverage` 기준 frontend coverage 100%를 유지했다 |
| 범위 | `frontend/src/constants/mockLearning.js`, `frontend/src/constants/mockLearning.test.js`, `frontend/src/pages/MyPage.test.jsx`, `frontend/src/pages/RankingsPage.test.jsx`, `docs/Development Log/Day 32.md` |
| 핵심 리스크 | CFOP 대표 공식은 출처마다 다를 수 있다. 이번 작업은 SpeedCubeDB 케이스 번호와 대표 알고리즘을 기준으로 TODO에 남아 있던 5묶음만 보정했다 |
| 참조 문서 | [Project Overview](../legacy-docs/project-overview.md), [Screen Specification](../legacy-docs/screen-specification.md), [2026-04-28 CFOP 공식 데이터 로그](./day-32.md) |
| 다음 로그 대상 | CFOP 119개 전체를 별도 출처 기준으로 재감사하거나, 자체 다이어그램/케이스 설명을 보강할 때 새 로그를 추가한다 |

## 로그 파일 목록

| 구간 | 로그 | 설명 |
| --- | --- | --- |
| Week 1 | [Day 1](./day-01.md) ~ [Day 7](./day-07.md) | 인프라, Testcontainers, REST Docs, 모니터링, 보안 기반 |
| Core API | [Day 8](./day-08.md) ~ [Day 11](./day-11.md) | 인증, 기록, 랭킹, 게시판 API 기준선 |
| Frontend 연동 기반 | [Day 12](./day-12.md) | `AuthContext`, 타이머, 스크램블/기록 저장 연동 |
| 프런트 목업 기준선 | [Day 13](./day-13.md) | 서비스형 UI 목업과 화면 요구사항 기준선 |
| 보조 유지보수 로그 | [2026-04-10 로그](./day-14.md), [2026-04-19 로그](./day-20.md) | 주요 기능 작업일 사이에 들어간 저장소 규칙 정리와 backlog 기준선 추가 |
| 최신 로그 | [2026-04-22 배포 로그](./day-23.md), [2026-04-23 이메일 인증](./day-24.md), [2026-04-23 모바일/타이머](./day-25.md), [2026-04-23 계정 복구/학습](./day-26.md), [2026-04-23 관리자/운영/마감](./day-27.md), [2026-04-24 피드백 계약 정리](./day-28.md), [2026-04-24 최종 품질 검증](./day-29.md), [2026-04-27 시간 계약 정리](./day-30.md), [2026-04-27 초보자 학습 탭](./day-31.md), [2026-04-28 CFOP 공식 데이터](./day-32.md) | AWS 배포, 이메일 인증, 모바일/타이머/입력 검증, 계정 복구/관리, 관리자/운영 안정화, 공개 피드백 계약 정리, 최종 커버리지/문서 마감, UTC instant 시간 계약 정리, 초보자 학습 탭 추가, CFOP 중복 공식 보정 |

## 주요 설계 결정 추적

- 인증/인가 구조: [Authentication & Authorization Design](../legacy-docs/authentication-and-authorization-design.md), [API Specification](../legacy-docs/api-specification.md), [2026-04-13 인증 실연동](./day-15.md), [2026-04-14 auth 계약/랭킹](./day-16.md), [2026-04-23 이메일 인증](./day-24.md)
- 랭킹 V1 -> V2 전략: [Project Overview](../legacy-docs/project-overview.md), [API Specification](../legacy-docs/api-specification.md), [2026-04-20 기준선 측정](./day-21.md), [2026-04-21 Redis V2 재측정](./day-22.md), Internal Schedule.internal.md (repository 외부 당시 자료)
- 프런트 mock -> 실연동 전환: [Screen Specification](../legacy-docs/screen-specification.md), [2026-04-15 핵심 기능 구현](./day-17.md), [2026-04-17 안정화](./day-18.md), [2026-04-17 CSS/문서 정리](./day-19.md), [2026-04-23 계정 복구/학습](./day-26.md), [2026-04-27 초보자 학습 탭](./day-31.md)
- 운영/배포와 마감: [System Architecture](../legacy-docs/system-architecture.md), [Deployment & Infrastructure Design](../legacy-docs/deployment-and-infrastructure-design.md), [2026-04-22 AWS 1차 배포](./day-23.md), [2026-04-23 관리자/운영/마감](./day-27.md), portfolio.internal.md (repository 외부 당시 자료)
- 피드백 public 계약 정리: [API Specification](../legacy-docs/api-specification.md), [Screen Specification](../legacy-docs/screen-specification.md), [Database Design](../legacy-docs/database-design.md), [2026-04-24 피드백 계약 로그](./day-28.md)
- 시간 응답 계약: [API Specification](../legacy-docs/api-specification.md), [Database Design](../legacy-docs/database-design.md), [Screen Specification](../legacy-docs/screen-specification.md), [2026-04-27 시간 계약 로그](./day-30.md)
- 최종 테스트/커버리지 마감: [2026-04-24 최종 품질 검증](./day-29.md), [Project Schedule](../schedules/project-schedule.md), portfolio.internal.md (repository 외부 당시 자료)

## 최근 정리 문서

- 최근 정리 로그: [2026-04-28 CFOP 공식 데이터 로그](./day-32.md)
- 이전 학습 로그: [2026-04-27 초보자 학습 탭 로그](./day-31.md)
- 이전 시간 계약 로그: [2026-04-27 시간 계약 로그](./day-30.md)
- 이전 품질 검증 로그: [2026-04-24 최종 품질 검증 로그](./day-29.md)
- 이전 계약 정리 로그: [2026-04-24 피드백 계약 로그](./day-28.md)
- 이전 마감 로그: [2026-04-23 관리자/운영/마감](./day-27.md)
- 현재 내부 일정: Internal Schedule.internal.md (repository 외부 당시 자료)
- 운영/배포 기준: [Deployment & Infrastructure Design](../legacy-docs/deployment-and-infrastructure-design.md)
- 설명 자산: portfolio.internal.md (repository 외부 당시 자료)

## 문서 반영 체크

- [x] 허브 문서를 CFOP 공식 데이터 중복 보정과 최신 frontend coverage 100% 기준으로 최신화함
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
