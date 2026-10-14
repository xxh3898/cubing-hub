---
doc_type: operation
status: active
created: 2026-10-14
updated: 2026-10-14
owner: xxh3898
project: cubing-hub
tags: []
related:
  - .ops/project.yaml
  - docs/07-operations/ci-cd.md
  - docs/07-operations/deployment-runbook.md
  - docs/07-operations/backup-restore.md
  - docs/07-operations/observability.md
  - docs/07-operations/disaster-recovery.md
  - homeserver/docs/home-server-runbook.md
  - homeserver/docs/db-backup-restore.md
---

# Golden Path Adoption

[Project profile](../../.ops/project.yaml)은 Standard `1.2.1`, schema와 minimum compatibility `1.2.0-rc.1`, 중앙 revision `851b9066cc42e6a5cc1bc808d0ff9be40e4b8a7c`를 채택한다. `adoptionStatus=MIGRATING`, Tier 3, stateful과 기존 8개 OPEN gap을 유지한다. 이 문서는 adoption과 evidence 연결을 소유하며 중앙 규범이나 command-level runbook을 대체하지 않는다.

기준은 해당 revision의 [Versioning](https://github.com/xxh3898/platform-golden-path/blob/851b9066cc42e6a5cc1bc808d0ff9be40e4b8a7c/00-platform/versioning.md), [Authority Model](https://github.com/xxh3898/platform-golden-path/blob/851b9066cc42e6a5cc1bc808d0ff9be40e4b8a7c/00-platform/authority-model.md), [Production Gates](https://github.com/xxh3898/platform-golden-path/blob/851b9066cc42e6a5cc1bc808d0ff9be40e4b8a7c/04-deployment/production-gates.md)와 [Onboarding](https://github.com/xxh3898/platform-golden-path/blob/851b9066cc42e6a5cc1bc808d0ff9be40e4b8a7c/runbooks/project-onboarding-quick-start.md)이다. Annotated `v1.2.1`의 peeled commit은 위 revision이며, 승인 이력은 [중앙 #96 acceptance](https://github.com/xxh3898/platform-golden-path/issues/96#issuecomment-6159033655)와 [exact main-push CI](https://github.com/xxh3898/platform-golden-path/actions/runs/38488420603)로 연결한다.

## Evidence boundaries

| 근거 | 증명 범위 | 남는 경계 |
| --- | --- | --- |
| S01 profile와 gateway source | 버전·desired lifecycle·reference 선언 | 배포·운영 승인 아님 |
| Exact 중앙 working-tree shape 검사 | YAML/schema와 실행형 invariant | Gate PASS·COMPLIANT 아님 |
| Pinned static report | 승인된 immutable subject commit의 정적 분석 | 미커밋 S01은 `PENDING_SUBJECT_COMMIT` |
| Hosted CI | 해당 head에서 실제 실행한 tool/check | v1.2.1 Hosted validator는 S02 후속, S01 `NOT_RUN` |
| Live metadata | 조회 시점의 설정·identity | 전체 runtime acceptance 아님 |
| Production acceptance | G6~G8과 durable terminal evidence | 현재 legacy baseline의 전체 acceptance `UNKNOWN` |

Profile의 기존 `evidence.checkedAt=2026-09-02`와 각 evidence 문자열은 과거 근거다. S01에서 이를 새 검증으로 갱신하거나 현재 사실로 승격하지 않는다.

[Platform Profile Report](../../.github/workflows/platform-profile.yml)는 여전히 중앙 v1.0.0 revision `c4e27ac149d39b2572fd5649662b3380883c7357`에 고정돼 있다. 그 도구는 신규 version pair를 지원하지 않으므로 중앙 checkout이 성공하면 S01 profile 검증이 실패할 수 있다. Checkout 불가로 validator가 `NOT_RUN`인 job의 성공도 profile PASS가 아니다. Push/PR 검토에서 이 전환 위험과 S02 순서를 확인하고 required check를 우회하지 않는다. S01은 workflow나 credential을 변경하지 않는다.

## Legacy reconstruction evidence

이미 운영 중인 Production을 `legacy_reconstruction`으로 선언한다. 과거 first activation을 재실행하지 않고 기존 current, predecessor, backup과 acceptance 근거를 재구성한다. 아래 항목은 profile의 논리적 evidence gateway이며, 문서와 anchor의 존재만으로 acceptance가 성립하지 않는다.

### Lifecycle state

전체 lifecycle phase와 최초 G8 acceptance는 `UNKNOWN`이다. `FIRST_ACTIVATION_ACCEPTED`나 `STEADY_STATE`를 추론하지 않는다. S07~S10/S15와 O09가 [deployment gateway](deployment-runbook.md), [canonical runbook](../../homeserver/docs/home-server-runbook.md)의 durable state·operation 근거를 연결하고 누락을 평가한다. S01 추적은 [#62](https://github.com/xxh3898/cubing-hub/issues/62)다.

### Durable current

S01 read-only 조회에서 `production-app-root/runtime-config/state`의 application revision·runtime digest와 `runtime-config/current` pointer 및 target 존재를 확인했다. 따라서 expected current는 `present`다. 정확한 identity의 authority는 이 durable state와 immutable release이며, 실행 중 artifact·public smoke·G8 일치는 `UNKNOWN`이다. O09에서 실행 identity와 함께 재검증한다.

### Durable previous

같은 state에 predecessor application revision·runtime digest가 기록돼 있다. 이전 accepted state, artifact 가용성, DB compatibility와 전체 acceptance를 확인하지 않았으므로 expected previous는 `unknown`이다. Predecessor requirement는 `required`로 유지한다. O09에서 [rollback 기준](deployment-runbook.md#중단과-rollback)을 충족하는 exact pair를 검증하며 state 필드 존재만으로 rollback 준비 완료를 선언하지 않는다.

### Data state

현재 DB와 upload의 전체 상태는 `UNKNOWN`이다. Expected data state는 `unknown`으로 선언한다. 외부 사용자 부재, backup 파일 수 또는 과거 신규 설치의 빈 데이터 설명은 현재 `verified_empty`의 근거가 아니다. MySQL과 게시글 이미지는 [같은 backup unit](backup-restore.md#backup-unit)으로 계속 취급한다.

### Backup baseline

Read-only로 로컬 scheduled snapshot의 `SUCCESS`와 manifest identity·success metadata를 확인했다. Payload checksum, semantic integrity와 격리 full restore를 실행하지 않았으므로 S01에서 `BACKUP_VERIFIED`나 `RESTORE_VERIFIED`를 새로 판정하지 않는다. Predeploy default는 `fresh_existing`을 유지하고 freshness·integrity 판정은 운영 직전에 수행한다. Migration/data-sensitive 작업의 기존 `new_required` 계약도 유지한다.

S11/S13 → O06은 로컬 cadence·retention·natural occurrence를, S12 → O07은 같은 exact snapshot의 isolated full restore를 다룬다. 정상 로컬 복구점 3개와 Tier 3 daily 14 / weekly 8 / monthly 6, quarterly isolated restore 요구는 유지한다. 실제 명령은 [backup runbook](../../homeserver/docs/db-backup-restore.md)이 소유한다.

### Monitoring acceptance

Alert delivery, independent failure domain과 bounded observation acceptance는 `UNKNOWN`이다. [Observability](observability.md)는 `review-needed`이며 source 설정을 live 동작으로 해석하지 않는다. S16 → O08의 실제 probe·notification 근거와 S10/O10의 pre/post acceptance가 필요하다.

### Runtime inventory

Current pointer와 selected state identity 확인은 전체 runtime inventory 검증이 아니다. Running API/Web artifact digest, DB·Redis·upload binding과 pending/lock terminal state의 결합은 `UNKNOWN`이다. S07/S09/S15 → O09/O10에서 [canonical runtime contract](../../homeserver/docs/home-server-runbook.md)를 기준으로 재구성한다. Lock file 존재나 pending 부재만으로 operation 완료를 선언하지 않는다.

### Operator security bootstrap

운영 역할은 GitHub 계정 `xxh3898` 한 명이 맡으며 profile의 기존 role 계약을 유지한다. Credential scope·lifetime·cleanup, installed SSH wrapper compatibility, key custody와 복구 acceptance는 `UNKNOWN` 또는 OPEN이다. S08/S09/S14 → O03/O05/O12에서 검증한다. [#60](https://github.com/xxh3898/cubing-hub/issues/60)과 [merged #61](https://github.com/xxh3898/cubing-hub/pull/61)의 Release/Deploy source 분리는 재사용하며 live reviewer enforcement·wrapper 설치·최초 운영 증거와 구분한다.

### Ingress identity

현재 ingress와 대표 public flow acceptance는 `UNKNOWN`이다. [Deployment gateway](deployment-runbook.md#완료-기준)와 [environment 계약](environments.md)을 기준으로 S15/O09/O10에서 identity와 public acceptance를 확인한다. S01은 public smoke나 ingress 변경을 실행하지 않는다.

### Automation actual state

2026-10-14 read-only 조회에서 `MAC_MINI_DEPLOY_ENABLED=true`, 로컬 six-hourly backup LaunchAgent 설치·등록과 last exit 0을 확인했다. Desired default `disabled`와 다르며 비활성화 완료를 뜻하지 않는다. Variable 값은 deploy readiness·approval이나 실제 새 deploy 실행 증거도 아니다. Source의 새 Deploy는 별도 수동 dispatch이며 main의 기존 동작은 [CI/CD](ci-cd.md) 및 실제 workflow로 다시 확인한다. Scheduler metadata는 모든 natural occurrence의 acceptance를 증명하지 않는다. O03/O06/O09에서 actual state와 authority를 재평가하며 S01은 이를 변경하지 않는다.

### Steady state activation

Activation authority와 required first G8·backup·monitoring·inventory·security·ingress acceptance는 `PENDING`이다. `separate_approval_after_first_g8`는 desired 정책이며 기존 automation에 새 승인이 있다고 선언하지 않는다. O09의 reconstruction/G6 평가와 O10의 별도 Deploy/G8 뒤에도 activation 또는 disable은 exact target·이전 actual state·복구 경로를 갖춘 독립 승인 대상이다.

## Adoption gaps and follow-up

S 번호는 source-only 작업, O 번호는 별도 운영 Gate의 계획 식별자다. 아래 후속 작업은 아직 실행 승인이나 완료 evidence가 아니다. 기존 gap의 ID/status/issueRef는 profile에 그대로 보존하고 후속 Issue는 각 범위 승인 뒤 생성한다.

| 기존 gap | 상태 | 후속 계획 |
| --- | --- | --- |
| CUBING-HUB-G2-001 | OPEN | S02/O01 trusted v1.2.1 Hosted validation, 중앙 capability O13 |
| CUBING-HUB-G2-002 | OPEN | S02/S03/O02 required checks·secret scan |
| CUBING-HUB-G3-001 | OPEN | S04/O02 1인 review·branch enforcement |
| CUBING-HUB-G4-001 | OPEN | S08/S09, O03/O04/O05 reviewer·최초 Release·wrapper·deploy 경계 |
| CUBING-HUB-G5-001 | OPEN | S05/S06/O04 immutable artifact·SBOM·retained provenance |
| CUBING-HUB-BAK-001 | OPEN | S11/S13/O06 로컬 backup; O11 외부 backup 구축 DEFERRED |
| CUBING-HUB-DR-001 | OPEN | S12/S14/O07/O12 isolated full restore·fresh-host/credential recovery |
| CUBING-HUB-G8-001 | OPEN | S10/S16/O08/O10 observation·delivery·independent monitoring |

## Offsite deferred risk

외부 백업 장치는 없으며 NAS 도입과 외부 백업 구축 O11은 `DEFERRED`다. 이는 작업 보류이고 요건 면제가 아니다. Offsite·encryption·independent failure-domain·fresh retrieval 요구, Tier 3와 `CUBING-HUB-BAK-001=OPEN`, `exceptions=[]`를 유지한다. Profile의 `encrypted-icloud-drive` target은 기존 desired 계약이며 실제 `OFFSITE_VERIFIED` 증거가 아니다. NAS target 채택은 별도 설계·승인 뒤에 결정한다.

같은 장소의 NAS만으로 site-loss 보호를 충족하지 않는다. Host·local backup·같은 장소 storage가 함께 손실되면 데이터 복구가 불가능할 수 있으며, 외부 backup RPO와 site-loss recovery는 미충족 상태로 남는다. 해결에는 독립 failure domain의 암호화 복사본, 별도 key recovery, freshness·integrity·실제 retrieval과 restore evidence가 필요하다. 보류 때문에 로컬 backup과 격리 restore 후속 작업을 생략하지 않는다. Exception은 중앙의 exact waivable control/scope와 별도 승인이 있어야 하며 임의로 생성하지 않는다.

## Approval boundary

[S01 #62](https://github.com/xxh3898/cubing-hub/issues/62)는 profile와 이 gateway의 source-only 범위다. 버전 채택은 COMPLIANT, Release 또는 Production approval이 아니다. Commit → pinned static report → push → dev PR → Hosted CI/독립 review → merge는 각각 해당 승인 경계를 따른다. Hosted validator 전환 S02, GitHub settings/credential, artifact publication, host 설치·deploy·restart·migration·backup·restore·retention apply와 automation 변경은 별도 범위다.

새 optional capability 다섯 block은 S15의 inventory·승인 전까지 추가하지 않는다. PR #24는 보류 상태로 보존하며 V2.3은 별도 Phase Entry 전까지 시작하지 않는다.
