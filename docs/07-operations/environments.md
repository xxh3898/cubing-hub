---
doc_type: operation
status: active
created: 2026-08-10
updated: 2026-08-11
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

repository Compose에는 MySQL 8.0.46, Redis 7.2.14, API, Web이 정의돼 있다. DB·Redis는 internal application network, API는 별도 outbound, Web은 external edge network를 사용한다. image·secret은 env로 주입한다.

## Tracked legacy configuration

infra/docker/docker-compose.prod.yml은 latest tag, S3 환경변수, host 80·443 port를 전제로 한 2026-04 시점 파일이며 현재 workflow·homeserver script에서 참조되지 않는다. 현재 production Source of Truth로 사용하거나 이 파일로 배포하지 않는다. 설정 파일의 이동·삭제는 별도 정리 작업으로 관리한다.

## Observed runtime fact

현재 실행 중 container, image digest, health, backup 시각은 repository만으로 확인할 수 없다. 실제 상태 확인은 별도 read-only 운영 요청과 승인 경계를 따른다.

## Release smoke

release smoke는 production을 대체하거나 production resource를 재사용하는 개발환경이 아니다. `cubing-hub-smoke` Compose project가 source에서 production Dockerfile을 빌드하고 fresh data services와 loopback Web port를 사용한다. command-level 실행, disposable data removal, browser/device checklist와 Tailscale HTTPS의 별도 승인 경계는 [Smoke Runbook](../../homeserver/docs/release-smoke-runbook.md)이 Source of Truth다.
