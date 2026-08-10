---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - .github/workflows/validate.yml
  - AGENTS.md
---
# Quality Gates

## CI trigger

- dev push
- main 대상 pull request
- 다른 workflow의 workflow_call

changed path classifier가 backend, frontend, infrastructure, API image, Web image 검증 범위를 결정한다.

현재 `feat/* → dev` pull request 자체는 Validate를 시작하지 않는다. V2.1은 backend, Flyway, frontend가 연결된 변경이므로 merge 뒤 dev push에서 처음 검증하는 것보다, 별도 승인된 workflow 변경으로 `pull_request` target에 dev를 추가해 feature PR head를 merge 전에 검증하는 방향을 권장한다. 이 문서 작업에서는 workflow를 변경하지 않는다.

## Backend gate

CI는 Java 17에서 다음을 실행한다.

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

정확한 workflow step과 path 분류는 [validate.yml](../../.github/workflows/validate.yml)과 classifier script가 Source of Truth다.
