---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/06-quality/quality-gates.md
  - docs/05-api/README.md
---
# Test Strategy

## 원칙

변경 위험에 가장 가까운 focused test부터 실행하고, 공개 계약·데이터·인증·배포 경계는 integration 또는 configuration test로 보강한다.

## Backend

- unit: domain service, utility, token·scramble·timer-independent rule
- JPA integration: repository query, PB recalculation, ranking ordering
- MockMvc integration: auth, validation, authorization, exception, endpoint behavior
- Spring REST Docs: test와 연결된 request·response contract
- Testcontainers: MySQL과 Redis가 필요한 integration boundary

## Frontend

- component·page: render, interaction, loading, error, protected route
- apiClient: auth header, shared refresh, retry, multipart behavior
- static data: learning case와 algorithm·image mapping
- build·lint: browser target과 bundle compile

## Infrastructure

- Node configuration tests: Nginx, operations docs·Compose, workflow contract
- Bash mock tests: deploy, backup, runtime config transition
- Compose rendering, Dockerfile check, Nginx syntax
- ARM64 image build는 CI의 GitHub-hosted ARM runner에서 수행

## 문서 변경

문서-only 변경은 local link, frontmatter, stale term, source path와 git diff를 정적으로 검증한다. application build를 실행하지 않은 경우 이유와 CI 미실행 상태를 명시한다.

## 회귀 선택

API, auth, schema, storage, deployment script를 바꾸면 해당 focused test만이 아니라 인접 failure·rollback path를 함께 고른다.
