---
doc_type: operation
status: active
created: 2026-08-10
updated: 2026-08-12
owner: xxh3898
project: cubing-hub
tags: []
related:
  - .github/workflows/validate.yml
  - .github/workflows/release.yml
  - .github/workflows/deploy.yml
  - homeserver/scripts/workflow-config.test.mjs
---
# CI/CD

## Validation

Validate workflow는 다음 event에서 시작한다.

- dev push
- dev 대상 pull request
- main 대상 pull request
- 다른 workflow의 workflow_call

changed path classifier가 필요한 backend, frontend, infrastructure, image job을 선택한다.

Branch flow는 다음 pre-merge validation을 사용한다.

```text
feat/* → dev PR
→ Validate before merge

dev → main PR
→ Validate before merge
```

- backend: Java 25 test, JaCoCo report, REST Docs, build
- frontend: Node.js 20 install, lint, test, build
- infrastructure: shell·Node mock/config test, Compose·Nginx·Dockerfile 검증
- image: linux/arm64 verification build

## Release와 Deploy

`main` push는 `release.yml`을 시작한다. Release validation 뒤 같은 exact SHA의 API·Web image와, 필요한 경우 runtime config image를 GHCR에 한 번만 발행하고 digest·runtime baseline·data-service maintenance 판정을 immutable release manifest로 보존한다. 같은 revision의 workflow rerun은 SHA tag를 다시 쓰지 못하도록 publish 전에 fail closed한다. 실패한 Release는 새 main commit과 별도 Release Gate로 다시 시도한다. 이 workflow에는 `production` environment, Tailscale, SSH, host mutation과 runtime baseline mutation이 없으며 artifact 발행 후 종료한다.

Production deploy는 `deploy.yml`의 별도 수동 dispatch다. Operator는 exact released `main` SHA와 성공한 Release run ID를 함께 제시해야 한다. Deploy preflight는 live `main` ancestry, Release workflow event·head·result, 같은 run의 manifest, current runtime baseline과 maintenance 판정을 다시 검증한다. 검증 뒤 `production` environment job만 Tailscale OIDC와 제한 SSH credential에 접근하며, Release가 만든 artifact를 다시 build하지 않는다.

Release manifest가 data-service maintenance 필요 상태이면 일반 deploy는 fail closed한다. Runtime baseline은 Production deploy와 acceptance가 성공하고 runtime config가 갱신된 경우에만 기록한다.

## 승인 경계

- dev push는 CI 실행
- dev 또는 main 대상 PR은 pre-merge Validate 실행
- PR 생성은 remote collaboration이며 merge 권한을 포함하지 않음
- main merge는 Release artifact workflow 시작
- main merge와 Release artifact 발행은 Production deploy 권한을 포함하지 않음
- Production deploy는 별도 exact release dispatch와 preflight를 요구함
- `production` Environment reviewer의 live enforcement는 source만으로 PASS로 간주하지 않음

따라서 commit, push, PR, merge, Release와 deploy는 별도 승인이다.

## Source of Truth

job, pinned action, permission, path filter, environment 조건은 [workflow](../../.github/workflows/)와 [classifier](../../scripts/classify-ci-paths.sh)가 기준이다.
