---
doc_type: operation
status: active
created: 2026-08-10
updated: 2026-08-12
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/07-operations/environments.md
  - homeserver/docs/release-smoke-runbook.md
  - AGENTS.md
---
# Local Development

## Runtime 기준

- backend: Java 25, Gradle 9.6.1 wrapper
- frontend: Node.js 20, npm
- data helper: root docker-compose.yml의 MySQL 8.4.11, Redis 7.2, Prometheus, Grafana
- backend local profile: application-local.yaml
- frontend dev server: Vite

version과 task는 repository configuration이 Source of Truth다.

## Mac mini 제약

Mac mini host에는 Java나 Node.js를 새로 설치하거나 version을 바꾸지 않는다. 현재 repository에는 backend·frontend 전체 검증용 개발 container wrapper가 없으므로 이 host에서는 CI 결과를 전체 검증 기준으로 사용한다.

root docker-compose.yml은 기존 local helper이며 fixed container name과 host port를 사용한다. 실행 전 다른 project·production resource와 겹치지 않는지 확인하고, 운영 .env·network·volume을 참조하지 않는다.

## Release smoke와 구분

V2.1 release smoke는 local development helper가 아니라 최신 `dev` release candidate를 production Dockerfile 경로로 실행하는 별도 Compose project다. smoke stack은 production Compose·`.env`·network·volume을 참조하지 않으며, command와 manual browser/device 절차는 [Smoke Runbook](../../homeserver/docs/release-smoke-runbook.md)을 따른다.

## Secret

local password와 JWT·SMTP·Discord 값은 Git에서 제외된 local 환경에 둔다. .env 원문을 문서, log, test fixture에 복제하지 않는다.

## 일반 흐름

1. exact Git root, branch, status를 확인한다.
2. 필요한 runtime과 local data target을 확인한다.
3. 가장 작은 service·test부터 실행한다.
4. 작업 뒤 diff와 실행 중인 개발 resource를 확인한다.
5. 유지 요청이 없으면 개발 stack을 일반 down으로 종료하되 volume 삭제를 기본으로 하지 않는다.

정확한 CI 명령은 [Quality Gates](../06-quality/quality-gates.md)를 따른다.
