---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/06-quality/quality-gates.md
  - docs/07-operations/disaster-recovery.md
---
# Non-functional Requirements

## 정확성과 정합성

- MySQL은 계정, solve, PB, community, feedback의 Source of Truth다.
- Redis ranking은 재생성 가능한 Read Model이며 준비되지 않으면 MySQL fallback이 가능해야 한다.
- post image metadata와 host binary는 backup·restore 시 같은 단위로 검증한다.
- UTC instant 저장과 API 시간 표현 계약을 유지한다.

## 보안

- 비밀번호는 평문으로 저장하거나 log에 남기지 않는다.
- access token은 browser memory, refresh token은 HttpOnly cookie를 기본 경계로 한다.
- 소유자와 ADMIN 권한을 server에서 검증한다.
- secret 값은 repository와 generated docs에 포함하지 않는다.
- upload type, size, count와 path를 검증한다.

## 성능

- ranking 기본 조회는 준비된 Redis Read Model을 사용할 수 있다.
- nickname 검색과 Redis 미준비 상태는 정확한 MySQL 경로를 유지한다.
- 성능 판단은 날짜·환경·dataset이 명시된 benchmark로만 한다.

## 가용성과 복구

- API와 Web은 동일한 commit SHA revision으로 배포한다.
- runtime configuration은 검증된 digest와 함께 적용·rollback한다.
- MySQL과 image snapshot은 검증 가능한 manifest를 갖는다.
- schema migration은 image rollback과 별개이며 자동 역변환을 가정하지 않는다.

## 접근성과 호환성

- keyboard와 touch timer의 핵심 상태 전이가 일치해야 한다.
- 보호 route와 error·loading 상태를 사용자에게 구분해 보여 준다.
- responsive layout에서 핵심 동작이 사라지지 않아야 한다.

## 검증

완료 조건과 CI gate는 [quality 문서](../06-quality/)에서 관리한다.
