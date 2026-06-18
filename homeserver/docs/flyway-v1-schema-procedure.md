# Flyway V1 Schema 생성 절차

## 원칙

`V1__init_schema.sql`은 추측으로 작성하지 않는다. 새 DB로 시작하더라도 운영 재현성을 위해 엔티티, 생성 DDL, `docs/Database Design.md`를 대조한 뒤 작성한다.

## 절차

1. throwaway MySQL을 실행한다.
2. 임시 프로필 또는 임시 설정으로 `ddl-auto=create`를 사용해 schema를 생성한다.
3. 생성된 DDL을 추출한다.
4. 엔티티와 `docs/Database Design.md`를 대조한다.
5. `backend/src/main/resources/db/migration/V1__init_schema.sql`을 작성한다.
6. 새 MySQL volume에서 Flyway `V1`, `V2` 적용을 확인한다.
7. `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`로 app 기동 검증을 통과시킨다.

## 작성 결과

- `/tmp/cubinghub-schema.sql`에서 추출한 DDL을 기준으로 `backend/src/main/resources/db/migration/V1__init_schema.sql`을 추가했다.
- FK 생성 순서 문제를 피하기 위해 `users`, `records`, `posts` 같은 부모 테이블을 먼저 생성하도록 정렬했다.
- 기존 `V2__add_query_support_indexes.sql`와 충돌하지 않도록 `V1`에는 `idx_record_user_id`, `idx_post_category`를 남기고, `V2`가 추가할 `idx_record_user_created_at`, `idx_post_category_created_at_id`, `idx_post_created_at_id`는 넣지 않았다.
- 로컬 검증 DB에서 `flyway_schema_history`를 조회해 `V1__init_schema.sql`, `V2__add_query_support_indexes.sql`이 모두 `success=1`로 적용된 것을 확인했다.
- `SHOW INDEX FROM records`, `SHOW INDEX FROM posts` 결과로 `V2` 적용 후 `records.idx_record_user_created_at`, `posts.idx_post_category_created_at_id`, `posts.idx_post_created_at_id`가 존재하고, `idx_record_user_id`, `idx_post_category`가 제거된 것을 확인했다.
- JPA `validate` 기준 앱 기동 검증은 별도 실행 결과를 확인해야 한다.

## 주의 사항

- 운영 DB에서 DDL을 실행하지 않는다.
- `ddl-auto=update`를 운영 절차로 사용하지 않는다.
- 기존 `V2__add_query_support_indexes.sql`와 index 생성이 중복되지 않게 작성한다.
- 검증 완료 전에는 AWS 중단이나 DNS cutover를 진행하지 않는다.

## 완료 기준

- Flyway `V1`, `V2`가 빈 DB에 순서대로 적용된다.
- JPA `validate`가 통과한다.
- backend 테스트와 홈서버 compose health check가 통과한다.
