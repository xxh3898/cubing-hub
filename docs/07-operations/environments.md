---
doc_type: operation
status: active
created: 2026-08-10
updated: 2026-08-15
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/deployment-architecture.md
  - homeserver/docs/release-smoke-runbook.md
---
# Environments

| 환경 | 목적 | Data·runtime | 기준 |
| --- | --- | --- | --- |
| test | 자동 test | Testcontainers MySQL, test Redis, create-drop schema | application-test.yaml, CI |
| local development | 기능 개발·benchmark | root Compose helper와 local profile | docker-compose.yml, application-local.yaml |
| CI | validation·artifact build | GitHub-hosted Ubuntu·ARM64 runner | .github/workflows |
| release smoke | main merge 전 browser/device 수동 smoke | 최신 `dev` source, disposable Docker MySQL·Redis·Mailpit volume/network | `homeserver/docker-compose.smoke.yml`, [Smoke Runbook](../../homeserver/docs/release-smoke-runbook.md) |
| production | public service | Mac mini Docker Compose, MySQL·Redis·host images | homeserver config와 active runbook |

## Test

Flyway는 비활성이고 JPA create-drop을 사용한다. 따라서 test 통과만으로 production Flyway migration 적용을 증명하지 않는다.

## Local

local profile은 ddl-auto update와 Flyway disabled를 사용한다. production schema 변경은 local entity 자동 반영이 아니라 새 Flyway migration으로 관리한다.

## Production configuration fact

repository Compose에는 MySQL 8.4.11 LTS, Redis 7.2.14, API, Web이 정의돼 있다. DB·Redis는 internal application network, API는 별도 outbound, Web은 external edge network를 사용한다. image·secret은 env로 주입한다.

일반 application deploy는 실행 중인 data-service image와 candidate runtime config가 다르면 중단한다. MySQL 8.4.11 전환은 [DB와 이미지 백업·복구](../../homeserver/docs/db-backup-restore.md)의 별도 production migration gate를 통과한 뒤 실행한다.

### GitHub production environments

GitHub deployment environment는 application deployment와 runtime-config
baseline의 책임을 분리한다.

| GitHub environment | 역할 | Reconciliation 책임 |
| --- | --- | --- |
| `production` | API/Web application deployment history와 기존 Tailscale·SSH credential scope | Approval 뒤 read-only inspection job이 `deployment: false`로 참조 |
| `production-runtime-config` | Production에 실제 적용·검증한 runtime-config history와 maintenance reconciliation approval | Secret 없이 authorization job이 `deployment: false`로 참조하고, 성공한 recorder가 baseline을 명시 기록 |

Reconciliation은 environment가 없는 intent validation,
`production-runtime-config` reviewer authorization, `production` credential을
사용하는 inspection/record 순서로만 진행한다. 두 environment job 모두
`deployment: false`이므로 workflow environment reference 자체가 application 또는
runtime deployment history를 갱신하지 않는다. Inspection이 성공한 뒤
`record-runtime-config-baseline.sh`만 `production-runtime-config`에 verified
baseline을 생성한다. `production` application deployment history는 유지한다.

## Tracked legacy configuration

infra/docker/docker-compose.prod.yml은 latest tag, S3 환경변수, host 80·443 port를 전제로 한 2026-04 시점 파일이며 현재 workflow·homeserver script에서 참조되지 않는다. 현재 production Source of Truth로 사용하거나 이 파일로 배포하지 않는다. 설정 파일의 이동·삭제는 별도 정리 작업으로 관리한다.

## Observed runtime fact

현재 실행 중 container, image digest, health, backup 시각은 repository만으로 확인할 수 없다. 실제 상태 확인은 별도 read-only 운영 요청과 승인 경계를 따른다.

## Release smoke

release smoke는 production을 대체하거나 production resource를 재사용하는 개발환경이 아니다. `cubing-hub-smoke` Compose project가 source에서 production Dockerfile을 빌드하고 fresh data services와 loopback Web port를 사용한다. command-level 실행, disposable data removal, browser/device checklist와 Tailscale HTTPS의 별도 승인 경계는 [Smoke Runbook](../../homeserver/docs/release-smoke-runbook.md)이 Source of Truth다.
