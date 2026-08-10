---
doc_type: data
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/04-data/data-dictionary.md
  - backend/src/main/resources/db/migration/V1__init_schema.sql
---
# ERD

Flyway V1과 V2 기준으로 현재 MySQL schema에는 9개 table이 있다.

```mermaid
erDiagram
    USERS ||--o{ RECORDS : owns
    USERS ||--o{ USER_PBS : has
    RECORDS ||--o| USER_PBS : proves
    USERS ||--o{ POSTS : writes
    POSTS ||--o{ COMMENTS : has
    USERS ||--o{ COMMENTS : writes
    POSTS ||--o{ POST_ATTACHMENTS : has
    POSTS ||--o{ POST_VIEWS : receives
    USERS ||--o{ POST_VIEWS : creates
    USERS ||--o{ FEEDBACKS : submits
    USERS ||--o{ FEEDBACKS : answers

    USERS {
      bigint id PK
      varchar email UK
      varchar nickname UK
      varchar password
      enum role
      enum status
      varchar main_event
    }
    RECORDS {
      bigint id PK
      bigint user_id FK
      enum event_type
      int time_ms
      enum penalty
      text scramble
    }
    USER_PBS {
      bigint id PK
      bigint user_id FK
      bigint record_id FK_UK
      enum event_type
      int best_time_ms
    }
    POSTS {
      bigint id PK
      bigint user_id FK
      enum category
      varchar title
      text content
      int view_count
    }
    COMMENTS {
      bigint id PK
      bigint post_id FK
      bigint user_id FK
      varchar content
    }
    POST_ATTACHMENTS {
      bigint id PK
      bigint post_id FK
      varchar object_key
      varchar image_url
      varchar content_type
      bigint file_size_bytes
      int display_order
    }
    POST_VIEWS {
      bigint id PK
      bigint post_id FK
      bigint user_id FK
    }
    FEEDBACKS {
      bigint id PK
      bigint user_id FK
      bigint answered_by_user_id FK
      enum type
      enum visibility
      enum notification_status
      varchar title
      text content
      text answer
    }
    ADMIN_MEMOS {
      bigint id PK
      enum answer_status
      text question
      text answer
    }
```

admin_memos는 현재 user FK 없이 운영 메모 자체를 저장한다. 모든 BaseTimeEntity 계열 table은 migration에 정의된 created_at·updated_at을 사용한다.

정확한 DDL과 index는 [Flyway migration](../../backend/src/main/resources/db/migration/)이 Source of Truth다.
