---
doc_type: product
status: draft
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/vision.md
  - docs/02-requirements/user-flows.md
---
# Product Requirements Document

## 상태

최종 Vision과 우선순위가 미확정이므로 이 문서는 현재 제품 기준선과 PRD 확정에 필요한 질문만 관리한다.

## 현재 제품 기준선

현재 repository에서 확인되는 사용자 기능은 다음과 같다.

- 이메일 인증을 포함한 가입, 로그인, 토큰 갱신, 로그아웃, 비밀번호 재설정
- scramble 생성, timer 측정, solve 저장·penalty 변경·삭제
- 종목별 개인 기록과 전체 ranking 조회
- 홈 요약, 프로필·주 종목·비밀번호 관리
- 회전 기호, 초보자 과정, CFOP 학습 콘텐츠
- 게시글·댓글·이미지 첨부 커뮤니티
- 사용자 feedback, 공개 Q&A, 관리자 답변·공개 여부·내부 memo 관리

상세 동작은 [기능 요구사항](../02-requirements/features/)과 [사용자 흐름](../02-requirements/user-flows.md)이 Source of Truth다.

## 현재 목표

- V1 기능을 안정적으로 유지하고 실제 구현과 문서의 불일치를 줄인다.
- 제품 방향 논의에서 현재 기능과 미래 후보를 혼동하지 않는다.
- endpoint 계약, 데이터, 운영 절차가 각자의 Source of Truth를 갖도록 한다.

## 미래 후보

Daily Challenge, Verified Record, Competition, Organizer는 후보 기능이다. 일정, 우선순위, DB, API, 상세 architecture는 아직 승인되지 않았다.

## PRD 확정에 필요한 결정

- 한 문장 제품 문제 정의
- 우선 사용자군과 제외 사용자군
- 핵심 Core Loop
- 검증할 사용자 성과와 제품 metric
- 다음 단계에 포함할 기능과 명시적 비목표
- 개인정보, 기록 검증, 대회 운영에서 필요한 책임 경계

## 완료 조건

Vision이 확정된 뒤 위 결정을 채우고 기능 단위 acceptance criteria를 [품질 문서](../06-quality/acceptance-criteria.md)와 연결해야 이 문서를 active로 전환한다.
