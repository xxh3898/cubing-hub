---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/06-quality/quality-gates.md
  - docs/05-api/README.md
  - docs/04-data/migration-policy.md
---
# Test Strategy

## 원칙

변경 위험에 가장 가까운 focused test부터 실행하고, 공개 계약·data·인증·배포 경계는 integration 또는 configuration test로 보강한다.

## Backend

- unit: domain service, utility, token·scramble·timer-independent rule
- JPA integration: repository query, PB recalculation, Ranking ordering
- MockMvc integration: auth, validation, authorization, exception, endpoint behavior
- Spring REST Docs: test와 연결된 request·response contract
- Testcontainers: MySQL과 Redis가 필요한 integration boundary

## Frontend

- component·page: render, interaction, loading, error, protected route
- apiClient: auth header, shared refresh, retry, multipart behavior
- Timer: 상태 전이, clock 정규화, Input Adapter, provenance, pending solve, idempotent retry consumer flow
- Record metric: PLUS_TWO, DNF, rolling Ao5·Ao12 fixture
- static data: learning case와 algorithm·image mapping
- build·lint: browser target과 bundle compile

## V2.1 Timer / Record Focus

- fractional elapsed input에서도 stopped display, API payload, stored raw time이 같은 canonical integer millisecond인지 검증한다.
- legacy UNKNOWN, KEYBOARD, TOUCH provenance를 구분하고 future hardware 값을 미리 허용했다고 가정하지 않는다.
- 같은 submission identity retry, payload conflict와 concurrent duplicate를 구분한다.
- idempotent retry가 Record, PB, Redis projection을 한 번만 반영하는지 검증한다.
- event-filtered history와 timestamp tie-break pagination의 누락·중복을 검증한다.
- canonical create response가 기존 client와 additive compatibility를 유지하는지 검증한다.
- Ao5/Ao12는 domain rule과 공유 가능한 fixture로 frontend 계산 결과를 검증한다.

## Migration Upgrade Gap

현재 `application-test.yaml`은 Flyway를 비활성화하고 Hibernate `create-drop`으로 schema를 만든다. 이 test profile만으로는 이미 적용된 schema에서 새 forward-only migration을 실행하는 upgrade path를 증명할 수 없다.

V2.1 schema 변경을 구현할 때는 별도 실제 DB migration test가 다음을 검증해야 한다.

```text
기존 schema와 대표 기존 row
→ 신규 forward-only migration 적용
→ 기존 row·PB 관계 보존
→ new application compatibility 확인
```

검증 범위에는 migration 순서·checksum, legacy nullable value, unique/index, old/new application compatibility가 포함된다. clean schema 생성 성공을 upgrade 성공으로 대신하지 않는다.

이번 Documentation / Decision Gate에서는 Testcontainers, Flyway test 설정, application test와 CI를 변경하지 않는다.

## Infrastructure

- Node configuration tests: Nginx, operations docs·Compose, workflow contract
- Bash mock tests: deploy, backup, runtime config transition
- Compose rendering, Dockerfile check, Nginx syntax
- ARM64 image build는 CI의 GitHub-hosted ARM runner에서 수행

## 문서 변경

문서-only 변경은 local link, frontmatter, H1, orphan, stale term, source path, secret pattern과 Git diff를 정적으로 검증한다. application build를 실행하지 않은 경우 이유와 CI 미실행 상태를 명시한다.

## 회귀 선택

API, auth, schema, storage, deployment script를 바꾸면 해당 focused test뿐 아니라 인접 failure·rollback path를 함께 고른다.
