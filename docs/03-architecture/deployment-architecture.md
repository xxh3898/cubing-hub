---
doc_type: architecture
status: active
created: 2026-08-10
updated: 2026-08-14
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

Runtime configuration publication과 production deploy는 다음 release mode를 구분한다.

- Application-only release는 현재 verified runtime configuration을 유지하고 정상 deploy를 진행한다.
- DB binding이 그대로인 runtime configuration update는 immutable artifact를 발행하고 정상 deploy로 동기화한다.
- DB image 또는 MySQL volume binding이 바뀌는 release는 immutable artifact를 발행하지만 production deploy job을 시작하지 않는다. Dedicated data-service maintenance가 필요하다.

Data-service 판정은 runtime 파일의 변경 여부가 아니라 마지막 정상 production deployment와 candidate revision의 Compose를 render한 effective DB image·volume name 비교를 사용한다. Runtime configuration 강제 동기화는 이 판정을 우회하지 않는다.

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

## Data-service maintenance

일반 deploy는 active runtime과 candidate runtime의 DB image·volume drift를 허용하지 않고, 실행 중인 DB container의 image ID·mount도 active binding과 대조한다. MySQL engine maintenance는 별도 worker가 다음을 immutable candidate로 묶어 전환한다.

- current와 target runtime config digest
- 동일한 application revision의 API·Web image
- source와 target DB image tag·repository digest·local image ID
- source와 target DB volume
- verified pre-transition backup

Maintenance도 deploy·backup과 같은 operation lock과 canonical `runtime-config/pending`을 사용한다. 성공 후에만 explicit DB binding, verified runtime `state`·`current`, maintenance audit state를 확정한다. Rollback은 upgraded original volume을 보존하고, backup parity를 검증한 fresh 이전-engine volume으로 binding을 전환한다.

Main release가 data-service maintenance를 요구하면 GitHub Actions는 runtime-config revision과 digest를 기록한 뒤 production environment, Tailscale, SSH 단계 전에 deploy job을 skip한다. Host deploy worker의 drift guard도 독립된 방어선으로 유지한다.

Maintenance 완료는 일반 GitHub production deployment success가 아니다. Release detector의 기준인 마지막 정상 production deployment SHA는 그대로 남을 수 있으므로, 다음 normal deploy 전에 host의 적용 runtime과 GitHub deployment baseline을 맞추는 explicit post-maintenance 절차가 필요하다. 이 reconciliation이 끝나기 전 release는 maintenance-required로 계속 차단될 수 있다.

command-level 절차와 실제 target path는 [deployment runbook gateway](../07-operations/deployment-runbook.md)에서 canonical homeserver runbook으로 연결한다.
