---
doc_type: index
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - README.md
---

# Cubing Hub Documentation

현재 구현·운영 기준과 미래 제품 논의를 분리하는 문서 진입점이다. 내용을 여기서 반복하지 않고 각 영역의 Source of Truth로 연결한다. 짧은 프로젝트 소개는 [root README](../README.md)에서 확인한다.

## Source of Truth

| 대상 | 기준 |
| --- | --- |
| 제품 방향·미확정 가설 | [00-product](00-product/) |
| solve·ranking·scramble 규칙 | [01-domain](01-domain/) |
| 사용자 동작과 기능 요구사항 | [02-requirements](02-requirements/) |
| 구현 구조 | [03-architecture](03-architecture/) |
| schema·data 의미 | [04-data](04-data/)와 Flyway migration |
| endpoint request·response | backend REST Docs test와 [Asciidoc index](../backend/src/docs/asciidoc/index.adoc) |
| API 공통 정책 | [05-api](05-api/) |
| test·acceptance·performance evidence | [06-quality](06-quality/) |
| 개발·배포·backup·incident 경계 | [07-operations](07-operations/)와 homeserver active runbook |
| 기술 결정 이유 | [08-decisions](08-decisions/) |
| V1 역사 | [99-archive](99-archive/v1/) |

코드·migration·workflow와 문서가 충돌하면 해당 영역의 실행 가능한 source와 test를 우선하고 문서를 같은 변경에서 갱신한다.

## Navigation

### 00 Product

- [Vision](00-product/vision.md) · [PRD](00-product/prd.md) · [Roadmap](00-product/roadmap.md)
- [Metrics](00-product/metrics.md) · [Business Model](00-product/business-model.md)
- [Market Validation](00-product/market-validation.md)
- Research: [csTimer](00-product/research/cstimer.md), [CubeDesk](00-product/research/cubedesk.md), [CubingTime](00-product/research/cubingtime.md), [Cubeast](00-product/research/cubeast.md), [Cubing Contests + RecordRanks](00-product/research/cubing-contests-recordranks.md), [WCA + WCA Live](00-product/research/wca-wca-live.md)

### 01 Domain

- [Glossary](01-domain/glossary.md) · [Solve Model](01-domain/solve-model.md)
- [Record Verification](01-domain/record-verification.md)
- [Ranking Rules](01-domain/ranking-rules.md) · [Scramble Rules](01-domain/scramble-rules.md)
- [Competition Rules](01-domain/competition-rules.md)

### 02 Requirements

- [User Flows](02-requirements/user-flows.md)
- [Non-functional Requirements](02-requirements/non-functional-requirements.md)
- Current: [Authentication](02-requirements/features/authentication.md), [Timer](02-requirements/features/timer.md), [Profile](02-requirements/features/profile.md), [Ranking](02-requirements/features/ranking.md), [Learning](02-requirements/features/learning.md), [Community](02-requirements/features/community.md), [Feedback and Administration](02-requirements/features/feedback-and-administration.md)
- Candidates: [Daily Challenge](02-requirements/features/daily-challenge.md), [Verified Record](02-requirements/features/verified-record.md), [Competition](02-requirements/features/competition.md), [Organizer](02-requirements/features/organizer.md)

### 03 Architecture

- [System Context](03-architecture/system-context.md) · [Application](03-architecture/application-architecture.md)
- [Backend](03-architecture/backend-architecture.md) · [Frontend](03-architecture/frontend-architecture.md)
- [Auth and Security](03-architecture/auth-security.md)
- [Ranking](03-architecture/ranking-architecture.md) · [Storage](03-architecture/storage-architecture.md)
- [Deployment](03-architecture/deployment-architecture.md)

### 04 Data

- [ERD](04-data/erd.md) · [Data Dictionary](04-data/data-dictionary.md)
- [Redis Model](04-data/redis-model.md)
- [Migration Policy](04-data/migration-policy.md) · [Retention Policy](04-data/retention-policy.md)

### 05 API

- [API entrypoint](05-api/README.md)
- [Conventions](05-api/conventions.md)
- [Compatibility Policy](05-api/compatibility-policy.md)

### 06 Quality

- [Test Strategy](06-quality/test-strategy.md)
- [Acceptance Criteria](06-quality/acceptance-criteria.md)
- [Quality Gates](06-quality/quality-gates.md)
- [Security Testing](06-quality/security-testing.md)
- [Performance Evidence](06-quality/performance/README.md)

### 07 Operations

- [Local Development](07-operations/local-development.md) · [Environments](07-operations/environments.md)
- [CI/CD](07-operations/ci-cd.md)
- [Deployment Runbook Gateway](07-operations/deployment-runbook.md)
- [Backup and Restore Gateway](07-operations/backup-restore.md)
- [Observability](07-operations/observability.md)
- [Incident Response](07-operations/incident-response.md)
- [Disaster Recovery](07-operations/disaster-recovery.md)

### 08 Decisions and Archive

- [ADR index](08-decisions/README.md)
- [V1 archive and migration ledger](99-archive/v1/README.md)

## YAML Frontmatter

`docs/**/*.md`에서 문서 시스템에 속해 사람이 작성·관리하는 Markdown은 아래 필드를 사용한다.

    ---
    doc_type: architecture
    status: active
    created: 2026-08-10
    updated: 2026-08-10
    owner: xxh3898
    project: cubing-hub
    tags: []
    related: []
    ---

### doc_type

product, research, domain, requirement, architecture, data, api, quality, operation, adr, archive를 사용한다. 문서 graph 진입점에는 index를 추가로 허용한다.

### 일반 status

- draft: 미확정 내용 또는 Open Questions가 있음
- active: 현재 개발·운영 기준으로 사용 가능
- review-needed: 과거 근거가 있으나 현재 코드·운영 재검증이 필요
- deprecated: 현재 Source of Truth가 아님

ADR은 proposed, accepted, rejected, superseded만 사용한다.

### 날짜와 추가 필드

- created: 최초 생성일을 유지한다. 기존 파일 이동 시 Git 최초 추가일을 보존한다.
- updated: 의미 있는 내용·경로·metadata 변경 시 갱신한다.
- research: researched_at을 추가하고 조사 snapshot 날짜를 적는다.
- related: repository root 기준 경로를 사용하며 같은 사실을 복제하는 대신 연결한다.

### 예외

- repository root `README.md`는 GitHub repository landing page이므로 frontmatter를 사용하지 않는다.
- backend/src/docs/asciidoc의 generated REST Docs source와 build output은 frontmatter를 사용하지 않고 API contract 생성 흐름을 따른다.
- JSON, HTML, PNG, GIF 같은 raw·generated artifact는 frontmatter 대상이 아니다.
- benchmarks 아래 generator가 만든 Markdown report는 raw evidence이므로 예외로 둔다. 사람이 작성한 benchmark summary와 legacy runbook은 metadata를 가진다.

## 내용 상태 표기

- 확인된 사실: code, test, configuration, official source로 검증
- 결정: accepted ADR 또는 사용자 승인으로 확정
- 추론·가설: 근거에서 해석한 내용이며 검증 필요
- TODO·Open Questions: 미정이며 일정이나 설계를 확정하지 않음

현재 구현과 미래 후보를 한 문단에서 섞지 않는다. V1 archive의 주장을 현재 사실로 재사용할 때는 반드시 current source와 다시 대조한다.

## 문서 변경 Checklist

- 한 사실의 Source of Truth가 하나인지
- public API body를 Markdown에 복제하지 않았는지
- current와 future, 사실과 가설이 구분됐는지
- local link와 related path가 유효한지
- metadata status와 updated가 내용에 맞는지
- application·schema·workflow 변경이면 대응 문서·test도 갱신했는지
