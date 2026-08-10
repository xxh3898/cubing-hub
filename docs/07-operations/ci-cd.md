---
doc_type: operation
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - .github/workflows/validate.yml
  - .github/workflows/deploy.yml
---
# CI/CD

## Validation

validate workflow는 dev push와 main pull request에서 시작하고 workflow_call도 지원한다. changed path classifier가 필요한 backend, frontend, infrastructure, image job을 선택한다.

- backend: Java 17 test, JaCoCo report, REST Docs, build
- frontend: Node.js 20 install, lint, test, build
- infrastructure: shell·Node mock/config test, Compose·Nginx·Dockerfile 검증
- image: linux/arm64 verification build

## Release와 Deploy

main push는 deploy workflow의 release validation을 시작한다. deployment feature가 enable된 경우 exact SHA API·Web image와 runtime config artifact를 GHCR에 publish하고 제한된 Tailscale OIDC·SSH 경로로 Mac mini deploy를 요청한다.

## 승인 경계

- dev push는 CI 실행
- PR 생성은 remote collaboration
- main merge는 release workflow 시작
- production variable이 enable된 경우 merge가 실제 deploy로 이어질 수 있음

따라서 commit, push, PR, merge, deploy는 별도 승인이다. 이 문서 작업은 local commit까지만 포함한다.

## Source of Truth

job, pinned action, permission, path filter, environment 조건은 [workflow](../../.github/workflows/)와 [classifier](../../scripts/classify-ci-paths.sh)가 기준이다.
