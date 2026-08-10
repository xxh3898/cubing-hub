---
doc_type: adr
status: accepted
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/deployment-architecture.md
  - docs/07-operations/deployment-runbook.md
---
# ADR-0005 Exact revision과 runtime configuration pair로 배포

## Context

API와 Web version 불일치, mutable image tag, runtime configuration drift는 배포·rollback의 재현성을 떨어뜨린다. Mac mini에서 source build를 수행하지 않고 검증된 artifact만 실행할 경계가 필요하다.

## Decision

API와 Web은 동일한 40자리 commit SHA image를 사용한다. runtime configuration은 exact sha256 digest와 revision label로 검증하며, 정상 배포 상태를 application SHA와 configuration digest의 pair로 기록한다.

## Alternatives

- latest tag로 배포
- API와 Web을 서로 다른 revision으로 독립 배포
- Mac mini에서 source를 pull해 build
- runtime configuration을 mutable host file로 직접 편집

## Consequences

- release와 rollback target을 재현할 수 있다.
- GHCR artifact와 state·current pointer 무결성 검증이 필요하다.
- runtime configuration 변경도 별도 artifact lifecycle을 가진다.
- migration은 pair rollback에 포함되지 않으므로 별도 호환성 정책이 필요하다.
- main merge가 production deploy로 이어질 수 있어 별도 승인과 환경 상태 확인이 필요하다.
