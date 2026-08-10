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
- UUID v4 validation, optional legacy request와 normalized payload fingerprint를 검증한다.
- idempotent retry가 Record, PB, Redis projection을 한 번만 반영하는지 검증한다.
- WCA_333 capability와 Timer·Scramble·Record·Ranking의 unsupported event 400 parity를 검증한다.
- event-filtered history와 `created_at DESC, id DESC` tie-break pagination의 누락·중복을 검증한다.
- canonical create response가 기존 client와 additive compatibility를 유지하는지 검증한다.
- Ao5/Ao12는 PLUS_TWO effective value, DNF 1개·2개와 integer rounding을 명시한 domain fixture로 frontend 계산 결과를 검증한다.

## Migration Upgrade Gap

현재 `application-test.yaml`은 Flyway를 비활성화하고 Hibernate `create-drop`으로 schema를 만든다. 이 test profile만으로는 이미 적용된 schema에서 새 forward-only migration을 실행하는 upgrade path를 증명할 수 없다.

V2.1 schema 변경은 별도 `RecordFoundationMigrationIntegrationTest` MySQL Testcontainers test로 검증한다. 현재 dependency의 Flyway API와 MySQL Testcontainers를 사용하므로 새 runtime이나 CI service를 추가하지 않는다.

```text
programmatic Flyway target=V2
→ 대표 user·Record·user_pbs legacy fixture insert
→ Flyway latest 적용
→ 같은 datasource로 Spring context + Hibernate validate
→ schema·mapping·constraint invariant 확인
```

Dedicated context initializer가 application bean 생성 전에 위 migration과 fixture를 준비하고, context에서는 Flyway를 끄고 `ddl-auto=validate`를 사용한다. Global `application-test.yaml`을 migration test에 맞춰 바꾸거나 별도 장기 실행 profile을 운영하지 않는다.

검증 범위에는 다음이 포함된다.

- migration 순서·checksum과 latest version
- target column type·nullability와 named index
- legacy Record·PB FK와 raw/effective invariant 보존
- null input_method를 UNKNOWN으로 읽는 new mapping
- 같은 user·clientSubmissionId unique constraint와 다른 user scope
- 여러 null clientSubmissionId를 허용하는 old application compatibility
- V2.1 entity가 migrated schema에서 application context를 시작하는지

Current production data가 없더라도 representative legacy fixture를 넣는다. 이는 현재 row count에 의존하지 않고 old image rollback과 future non-empty upgrade path를 계속 검증하기 위한 golden fixture다. Clean schema 생성 성공을 upgrade 성공으로 대신하지 않는다.

이 전용 test는 V2→V3 upgrade 뒤 application context를 `ddl-auto=validate`로 시작한다. 일반 test profile의 Flyway disabled·Hibernate create-drop 계약은 변경하지 않는다.

## Infrastructure

- Node configuration tests: Nginx, operations docs·Compose, workflow contract
- Bash mock tests: deploy, backup, runtime config transition
- Compose rendering, Dockerfile check, Nginx syntax
- ARM64 image build는 CI의 GitHub-hosted ARM runner에서 수행

## 문서 변경

문서-only 변경은 local link, frontmatter, H1, orphan, stale term, source path, secret pattern과 Git diff를 정적으로 검증한다. application build를 실행하지 않은 경우 이유와 CI 미실행 상태를 명시한다.

## 회귀 선택

API, auth, schema, storage, deployment script를 바꾸면 해당 focused test뿐 아니라 인접 failure·rollback path를 함께 고른다.
