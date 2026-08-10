---
doc_type: data
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/04-data/erd.md
  - docs/04-data/migration-policy.md
  - docs/01-domain/solve-model.md
  - backend/src/main/resources/db/migration/V1__init_schema.sql
  - backend/src/main/resources/db/migration/V2__add_query_support_indexes.sql
  - backend/src/main/resources/db/migration/V3__add_record_foundation_fields.sql
---
# Data Dictionary

이 문서는 현재 schema의 의미를 설명한다. type, enum, nullability, FK, index의 최종 기준은 Flyway migration이다.

## users

| Column | 의미·제약 |
| --- | --- |
| id | bigint PK, auto increment |
| email | 계정 식별 email, unique, not null |
| nickname | 공개 nickname, unique, not null |
| password | encoded password, not null |
| role | ROLE_USER 또는 ROLE_ADMIN |
| status | ACTIVE 또는 DELETED |
| main_event | 선택 가능한 주 종목, nullable |
| created_at, updated_at | datetime(6) |

## records

| Column | 의미·제약 |
| --- | --- |
| user_id | solve 소유 users FK |
| event_type | EventType enum, not null |
| time_ms | penalty 전 positive raw time |
| penalty | NONE, PLUS_TWO, DNF |
| scramble | solve에 사용한 문자열 |
| input_method | varchar(32), nullable, DB default 없음. application `InputMethod` enum provenance이며 legacy null은 response에서 UNKNOWN으로 정규화 |
| client_submission_id | char(36), nullable, DB default 없음. canonical lowercase UUID v4의 user 범위 retry identity |
| client_submission_payload_hash | binary(32), nullable, DB default 없음. 최초 normalized logical payload의 SHA-256 internal value |
| created_at, updated_at | history ordering과 변경 시각 |

V2 index는 user_id, created_at 조합을 사용한다. V3는 user-scoped submission unique index와 event-filtered stable history index를 추가한다.

V3 index는 다음과 같다.

- `uk_record_user_client_submission` on `(user_id, client_submission_id)`
- `idx_record_user_event_created_at_id` on `(user_id, event_type, created_at, id)`

Nullable은 legacy row와 old application insert를 허용하기 위한 expand 단계다. 갱신된 application은 idempotent request에서 submission ID와 hash를 함께 기록한다. MySQL unique index는 null을 여러 건 허용하므로 legacy create와 충돌하지 않는다.

`input_method`는 MySQL ENUM이 아니라 VARCHAR를 사용한다. Application enum이 현재 허용값을 검증하고 future device 지원은 reader-first rollout으로 추가한다. 알 수 없는 값을 UNKNOWN으로 조용히 바꾸거나 future hardware 값을 지금 선등록하지 않는다.

## user_pbs

| Column | 의미·제약 |
| --- | --- |
| user_id, event_type | 사용자·event당 unique |
| record_id | PB 근거 record FK, unique |
| best_time_ms | 근거 record의 effective time |
| created_at, updated_at | projection 생성·갱신 시각 |

event_type, best_time_ms와 record_id index가 ranking 조회를 지원한다.

## posts

title은 varchar(100), content는 text, category는 FREE 또는 NOTICE, view_count는 int다. user_id가 작성자를 가리킨다. V2는 category·created_at·id와 created_at·id index를 추가한다.

## comments

post_id와 user_id FK, content varchar(500), timestamp를 저장한다.

## post_attachments

post_id FK와 object_key, image_url, original_file_name, content_type, file_size_bytes, display_order를 저장한다. binary 자체는 DB에 저장하지 않는다.

## post_views

post_id와 user_id 쌍이 unique다. 로그인 사용자의 중복 view 집계를 방지한다.

## feedbacks

제출 user, 선택적 답변 ADMIN, type, visibility, title, content, reply_email, answer와 답변·공개 시각을 저장한다. Discord notification status, attempt count, last attempt와 last error도 내부 운영 상태로 보존한다.

## admin_memos

question, 선택적 answer, ANSWERED 또는 UNANSWERED 상태, answered_at과 timestamp를 저장한다.

## 공통 규칙

- charset은 utf8mb4다.
- timestamp는 application에서 UTC instant 의미로 처리한다.
- enum 변경은 backward compatibility를 검토한 새 migration으로만 수행한다.
- application entity annotation이 migration을 대신하지 않는다.
- Record의 input provenance와 submission identity·payload hash는 생성 뒤 수정하지 않는다.
