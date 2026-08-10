---
doc_type: data
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/deployment-architecture.md
  - docs/04-data/data-dictionary.md
  - docs/06-quality/test-strategy.md
  - docs/08-decisions/adr-0004-forward-only-flyway-migrations.md
---
# Migration Policy

## Source of Truth

backend/src/main/resources/db/migration의 Flyway SQL이 production schema의 Source of Truth다. 현재 적용 순서는 V1 init schema, V2 query support indexes, V3 Record Foundation fields다.

## 작성 원칙

- 적용된 migration 파일을 수정하지 않는다.
- 변경은 다음 version의 새 migration으로 추가한다.
- migration은 deterministic하고 재실행 전제가 명확해야 한다.
- 큰 table lock, data backfill, enum·column 변경은 예상 시간과 중단 위험을 검토한다.
- application rollback과 schema rollback을 같은 것으로 보지 않는다.

## Compatibility

가능하면 다음 순서의 expand-and-contract를 사용한다.

1. 이전 application과 호환되는 schema 확장
2. 새 application 배포와 data 전환
3. 이전 revision이 더 이상 필요 없음을 확인
4. 후속 migration에서 obsolete 구조 정리

destructive change는 backup, reverse 또는 forward recovery, write freeze, record count 검증 없이 수행하지 않는다.

## Production 실행

production API는 SPRING_FLYWAY_ENABLED=false와 Hibernate validate로 실행한다. deployment script가 candidate API image를 사용해 one-shot migration을 먼저 수행하며 실패하면 application activation을 진행하지 않는다.

## 검증

- migration checksum과 순서
- clean test database 적용
- 이전·새 application compatibility
- index와 query plan 영향
- backup과 restore 또는 forward recovery 절차

## V2.1 Record Foundation migration

현재 user 확인 기준 `records`와 `user_pbs`에는 data가 없다. 이 세션에서는 production query를 실행하지 않았으며, data가 없다는 조건이 migration discipline을 완화하지는 않는다.

Applied V1·V2를 수정하지 않고 `V3__add_record_foundation_fields.sql` forward-only migration 한 개를 추가했다.

Migration 순서는 다음과 같다.

1. `records.input_method VARCHAR(32) NULL`을 DB default 없이 추가한다.
2. `records.client_submission_id CHAR(36) NULL`을 DB default 없이 추가한다.
3. `records.client_submission_payload_hash BINARY(32) NULL`을 DB default 없이 추가한다.
4. `uk_record_user_client_submission (user_id, client_submission_id)` unique index를 추가한다.
5. `idx_record_user_event_created_at_id (user_id, event_type, created_at, id)` index를 추가한다.

Backfill은 수행하지 않는다. Existing 또는 old-application row의 null input_method는 new application에서 UNKNOWN으로 읽고, null submission identity는 legacy non-idempotent create를 뜻한다. Existing `event_type` MySQL ENUM과 EventType code는 이 migration에서 변경하지 않는다.

### Compatibility와 rollback

- Schema expand를 application deploy보다 먼저 적용한다.
- Old application은 새 nullable column을 무시하고 null을 insert할 수 있다.
- New application은 legacy null input_method를 UNKNOWN으로 정규화하고 null submission identity에 idempotency를 소급 적용하지 않는다.
- New application이 쓰는 non-null column은 old application mapping에 없는 additive data이므로 old image가 existing Record를 읽는 데 방해하지 않는다.
- Application rollback 시 column·index를 drop하지 않는다. Old image로 되돌린 뒤 forward fix 또는 new image 재배포로 복구한다.
- Future Input Method 값은 old reader가 모르는 문자열을 만나지 않도록 reader-first rollout 뒤 writer를 활성화한다.

### Upgrade compatibility test

별도 MySQL Testcontainers integration test 한 개가 Flyway API를 사용해 다음 순서를 실행한다.

```text
V1·V2까지 migrate
→ representative user·Record·user_pbs legacy fixture insert
→ latest migration 적용
→ Spring application context를 Flyway disabled + Hibernate validate로 시작
→ schema·mapping·constraint invariant 확인
```

Test는 column type·nullability, index 존재, legacy row와 PB FK 보존, null input_method의 UNKNOWN mapping, 같은 user·submission ID unique 위반, 다른 user의 같은 ID 허용, 여러 null ID 허용을 확인한다. Current production data가 없더라도 representative legacy fixture를 유지해 future rollout과 rollback compatibility를 증명한다.

기존 global test profile의 Flyway disabled·Hibernate create-drop 설정은 그대로 두고, dedicated test에서만 실제 migration path를 구성한다. CI workflow나 별도 DB infrastructure는 추가하지 않는다.

`RecordFoundationMigrationIntegrationTest`가 실제 V2→V3 upgrade와 새 application mapping을 executable contract로 유지한다.
