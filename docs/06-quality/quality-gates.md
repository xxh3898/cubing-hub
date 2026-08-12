---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-12
owner: xxh3898
project: cubing-hub
tags: []
related:
  - .github/workflows/validate.yml
  - AGENTS.md
  - homeserver/docs/release-smoke-runbook.md
---
# Quality Gates

## CI trigger

- dev push
- dev 대상 pull request
- main 대상 pull request
- 다른 workflow의 workflow_call

changed path classifier가 backend, frontend, infrastructure, API image, Web image 검증 범위를 결정한다.

이 trigger 계약으로 `feat/* → dev`와 `dev → main` pull request는 모두 merge 전에 Validate를 실행한다. Dev push validation도 integration branch의 merge 결과를 계속 검증한다.

## Backend gate

CI는 Java 25에서 다음을 실행한다.

    SPRING_PROFILES_ACTIVE=test ./gradlew test jacocoTestReport build --no-daemon

test, REST Docs generation, JaCoCo report, bootJar build가 연결된다. 현재 build 설정에는 수치형 coverage verification task가 없으므로 과거 100% 기록을 지속 보장되는 gate로 표현하지 않는다.

## Frontend gate

CI는 Node.js 20에서 npm ci, lint, Vitest run, Vite build를 순서대로 실행한다.

## Infrastructure gate

shell syntax, runtime config detection, deploy·backup mock tests, Node configuration tests, production Compose render, runtime config image, Nginx config, frontend Dockerfile을 검증한다.

## Image gate

관련 path가 바뀌면 GitHub-hosted ARM64 runner에서 API·Web verification image를 build한다.

## Release gate

main push는 release validation을 시작한다. production deploy enable 상태에서는 GHCR publish와 Mac mini deploy로 이어질 수 있으므로 merge와 deploy는 별도 승인 대상이다.

V2.1처럼 browser/device runtime path가 중요한 release는 automated Validate 이후 isolated release smoke를 수행한다. smoke는 최신 `dev` source를 production Dockerfile로 build하고 disposable MySQL·Redis에 Flyway를 적용하지만 production resource에 연결하지 않는다. exact 실행과 수동 checklist는 [Smoke Runbook](../../homeserver/docs/release-smoke-runbook.md)을 따른다.

정확한 workflow step과 path 분류는 [validate.yml](../../.github/workflows/validate.yml)과 classifier script가 Source of Truth다.
