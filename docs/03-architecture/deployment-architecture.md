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

Data-service 판정은 runtime 파일의 변경 여부가 아니라 마지막 정상 production runtime-config baseline과 candidate revision의 Compose를 render한 effective DB image·volume name 비교를 사용한다. Runtime configuration 강제 동기화는 이 판정을 우회하지 않는다.

## Deployment unit

- API image와 Web image는 같은 40자리 application commit SHA를 사용한다.
- runtime configuration은 exact sha256 digest와 revision label로 검증한다.
- 정상 상태는 application SHA와 runtime configuration digest의 pair로 기록한다.

## Production baseline

GitHub deployment history는 production 상태의 두 축을 분리한다.

- `production`은 API·Web application 배포 이력이다.
- `production-runtime-config`는 production에 실제 적용하고 검증한 runtime-config revision·digest 이력이다.

Release detector는 `production-runtime-config`의 마지막 success revision을 runtime 비교 기준으로 사용한다. Runtime baseline 이력이 아직 한 건도 없는 최초 전환에만 기존 `production` success를 bootstrap 기준으로 사용한다. Runtime baseline deployment가 존재하지만 success가 없으면 legacy 이력으로 fallback하지 않고 release를 중단한다. 두 environment 모두 이력이 없는 신규 설치는 zero revision에서 시작한다.

Application-only release는 runtime baseline을 갱신하지 않는다. 안전한 runtime update는 production deploy와 health 검증이 성공한 뒤에만 candidate runtime revision을 success로 기록한다. Artifact publication만으로 baseline을 전진시키지 않는다.

## Migration

production API container는 Flyway를 비활성화하고 Hibernate validate를 사용한다. deploy script가 candidate API image로 one-shot Flyway migration을 먼저 실행한다. migration 실패 시 기존 application을 유지한다.

## Activation과 검증

candidate pair의 Compose config와 allowlist를 검증한 뒤 service를 갱신한다. API container는 loopback Actuator의 `status=UP`으로 direct readiness를 검증하고, Web container는 local Nginx에서 API까지의 integration route를 별도로 검증한다. Initial startup에서 Web은 API `service_healthy`를 기다린다. Container health 외에 public Web root, SPA deep link, API health와 대표 asset을 포함한 public smoke를 통과해야 완료 상태로 기록한다. Internal container health만으로 external availability를 확정하지 않는다.

## Rollback 한계

application·runtime config 실패는 이전에 검증된 exact pair로 복구한다. Flyway migration은 자동 rollback하지 않으므로 backward-compatible schema와 별도 migration 판단이 필요하다.

## Data-service maintenance

일반 deploy는 active runtime과 candidate runtime의 DB image·volume drift를 허용하지 않고, 실행 중인 DB container의 image ID·mount도 active binding과 대조한다. MySQL engine maintenance는 별도 worker가 다음을 immutable candidate로 묶어 전환한다.

- current와 target runtime config digest
- 동일한 application revision의 API·Web image
- source와 target DB image tag·repository digest·local image ID
- source와 target DB volume
- verified pre-transition backup

Maintenance도 deploy·backup과 같은 operation lock과 canonical `runtime-config/pending`을 사용한다. Operation lock은 command 실행을 직렬화하고, 별도 `mysql-maintenance/quiesce.state`는 command 사이의 application write-stop을 증명한다. Quiesce는 verified source에서 API·Web만 중지하고 DB·Redis를 healthy 상태로 유지한다. Normal deploy/recovery는 evidence가 있는 동안 fail closed하며 final backup은 pending 이전 quiesced state에서 허용한다.

일반 scheduled backup bootstrap은 항상 active `state`·`current` release의 worker를 실행한다. Maintenance final backup은 별도 explicit mode에서 approved target runtime artifact를 exact digest·revision·content hash로 staging하고, 그 artifact의 backup worker SHA를 immutable evidence에 고정한다. 실행 code만 target worker이며 snapshot source는 계속 current application/runtime, MySQL 8.0.46 binding과 post-image directory다. Worker staging과 backup 실행은 각각 공통 operation lock을 획득하는 별도 command이고, 어느 단계도 `state`·`current`·`pending`·`.env`나 container binding을 전진시키지 않는다.

Upgrade candidate는 quiesce evidence ID·timestamp와 quiesce 이후 시작한 final backup을 source runtime·DB identity에 묶는다. Final backup manifest에는 current source provenance와 DB exact binding 외에 approved worker evidence ID·target worker runtime identity가 별도 기록된다. Human confirmation token만으로 `apply`할 수 없다. 성공 후에만 explicit DB binding, verified runtime `state`·`current`, maintenance audit state를 확정하고 pending과 quiesce evidence를 제거한다. DB transition 전 취소는 unchanged source에서만 `resume-source`가 담당하고, pending 이후에는 dedicated recover/rollback이 우선한다. Rollback은 upgraded original volume을 보존하고, backup parity를 검증한 fresh 이전-engine volume으로 binding을 전환한다.

Main release가 data-service maintenance를 요구하면 GitHub Actions는 runtime-config revision과 digest를 기록한 뒤 production environment, Tailscale, SSH 단계 전에 deploy job을 skip한다. Host deploy worker의 drift guard도 독립된 방어선으로 유지한다.

Maintenance 완료는 일반 GitHub production application deployment success가 아니다. Host에서는 기존 application revision과 새 runtime-config revision이 함께 정상 상태를 이룰 수 있다.

Post-maintenance reconciliation은 operator가 기대한 application revision, runtime revision·digest, DB image·volume, MySQL patch를 명시하고 production host를 read-only로 검사한다. Inspector는 verified `state`·`current`·release content, pending 부재, 실제 image·volume, MySQL version과 전체 service health가 모두 일치할 때만 성공한다. 그 뒤에만 `production-runtime-config` environment에 runtime baseline success를 기록한다. Reconciliation 전에는 normal production deploy를 재개하지 않는다.

command-level 절차와 실제 target path는 [deployment runbook gateway](../07-operations/deployment-runbook.md)에서 canonical homeserver runbook으로 연결한다.
