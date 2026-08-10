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
  - backend/src/main/resources/db/migration/V1__init_schema.sql
  - backend/src/main/resources/db/migration/V2__add_query_support_indexes.sql
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
| created_at, updated_at | PB tie-break와 변경 시각 |

V2 index는 user_id, created_at 조합을 사용한다.

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
