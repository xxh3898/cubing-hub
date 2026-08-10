---
doc_type: architecture
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/07-operations/deployment-runbook.md
  - docs/08-decisions/adr-0005-exact-revision-deployment-unit.md
---
# Deployment Architecture

## Build와 Artifact

dev push와 main pull request는 validation workflow를 실행한다. main push의 release validation이 통과하고 deployment가 enable된 경우 GitHub Actions가 linux/arm64 API·Web image와 runtime configuration artifact를 GHCR에 발행한다.

Mac mini는 image를 build하지 않고 exact artifact를 pull한다.

## Deployment unit

- API image와 Web image는 같은 40자리 application commit SHA를 사용한다.
- runtime configuration은 exact sha256 digest와 revision label로 검증한다.
- 정상 상태는 application SHA와 runtime configuration digest의 pair로 기록한다.

## Migration

production API container는 Flyway를 비활성화하고 Hibernate validate를 사용한다. deploy script가 candidate API image로 one-shot Flyway migration을 먼저 실행한다. migration 실패 시 기존 application을 유지한다.

## Activation과 검증

candidate pair의 Compose config와 allowlist를 검증한 뒤 service를 갱신한다. container health 외에 public Web root, SPA deep link, API health와 대표 asset을 포함한 public smoke를 통과해야 완료 상태로 기록한다.

## Rollback 한계

application·runtime config 실패는 이전에 검증된 exact pair로 복구한다. Flyway migration은 자동 rollback하지 않으므로 backward-compatible schema와 별도 migration 판단이 필요하다.

command-level 절차와 실제 target path는 [deployment runbook gateway](../07-operations/deployment-runbook.md)에서 canonical homeserver runbook으로 연결한다.
