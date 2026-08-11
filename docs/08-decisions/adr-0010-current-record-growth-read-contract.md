---
doc_type: adr
status: proposed
created: 2026-08-11
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/roadmap.md
  - docs/01-domain/growth-metrics.md
  - docs/01-domain/solve-model.md
  - docs/02-requirements/features/growth.md
  - docs/02-requirements/features/profile.md
  - docs/03-architecture/growth-architecture.md
  - docs/04-data/data-dictionary.md
  - docs/05-api/conventions.md
---
# ADR-0010 Current Record 기반 Growth read contract

## Context

V2.1은 `Record = completed Practice solve` 경계, WCA_333 capability, raw time·penalty, stable event history, current PB와 Redis Ranking 책임을 확정했다. V2.2는 이 Record를 사용자가 이해할 수 있는 성장 정보와 장기 활동 이력으로 연결해야 한다.

다음 결정은 metric, API, query, UX와 correction behavior에 동시에 영향을 주므로 개별 구현 세부보다 오래 유지될 가능성이 높다.

- PB progression이 immutable event history인지 current Record의 derived view인지
- `created_at`을 어떤 activity timestamp로 해석하는지
- DNF/+2와 timezone을 어느 layer가 canonical하게 계산하는지
- private My Growth와 future public Profile을 같은 read contract로 취급하는지
- current history API를 client가 aggregate할지 dedicated read API를 만들지
- request-time query로 시작할지 snapshot/cache schema를 선구현할지

현재 `records`에는 `occurred_at`과 immutable correction audit가 없다. Penalty는 PATCH 가능하고 Record는 delete할 수 있다. `user_pbs`는 current PB projection이며 history table이 아니다. Redis는 Ranking을 위한 rebuild 가능한 Read Model이다.

## Options

### Option A — 기존 history API와 frontend 계산

Frontend가 paginated Record history를 내려받아 PB, trend와 activity를 계산한다.

- 장점: backend endpoint와 SQL 추가가 적다.
- 단점: page size 밖의 history, mixed event, DNF/timezone drift와 O(N) transfer가 생긴다.
- 단점: Web 외 consumer가 metric contract를 다시 구현해야 한다.

### Option B — immutable Growth snapshot/event model 선구현

PB event, daily aggregate 또는 Growth snapshot table을 추가해 historical view를 고정한다.

- 장점: read cost와 immutable historical display를 제어하기 쉽다.
- 단점: correction·delete 의미, backfill, rebuild, audit·retention 정책을 먼저 확정해야 한다.
- 단점: 현재 사용자 가치와 규모가 검증되기 전에 schema와 운영 책임이 생긴다.

### Option C — current Record 기반 dedicated server read model

Current canonical Record를 요청 시 계산하고, summary·trend·PB progression endpoint를 분리한다. Existing index와 MySQL projection/window query를 사용하며 schema와 Redis를 추가하지 않는다.

- 장점: V2.1 correction/PB semantics를 재사용하고 client drift와 raw history transfer를 막는다.
- 장점: current index로 MVP query를 시작하고 observed cost 뒤에만 최적화할 수 있다.
- 단점: PB progression은 user/event 전체 history O(N) scan일 수 있다.
- 단점: 과거에 보았던 PB snapshot을 복원하지 않는다.

## Decision proposal

Option C를 V2.2 proposal로 둔다. ADR-0010은 `proposed`이며 accepted contract가 아니다.

1. Growth의 canonical population은 요청 event의 current retained completed Practice Record다.
2. `NONE`은 raw time, `PLUS_TWO`는 raw + 2,000ms, `DNF`는 non-numeric result다. DNF는 일반 median/percentile에서 제외하고 count/rate로 보존한다. Ao5/Ao12는 V2.1의 별도 trim rule을 유지한다.
3. PB progression은 `created_at ASC, id ASC`에서 strictly improving running minimum을 재구성한다. Penalty PATCH와 delete 뒤 current canonical state로 다시 계산한다.
4. `created_at`은 actual occurrence가 아니라 recorded Practice activity instant다. API instant는 UTC, V2.2 calendar day는 `Asia/Seoul`을 사용한다.
5. Growth calculation은 authenticated owner용 dedicated server read API가 담당한다. Fixed summary, 30-day trend와 paginated PB progression을 분리한다.
6. My Growth 상세 통계는 private다. V2.2에서 신규 public Profile route/API와 visibility setting을 만들지 않는다. Existing Ranking nickname/PB 공개 범위만 유지한다.
7. V2.2는 Flyway, generated effective column, PB snapshot table, Growth Redis와 pre-aggregation을 추가하지 않는다. 10,000-record query evidence를 release gate로 남기고 100,000-record stress에서 문제가 확인되면 후속 결정을 연다.
8. Event dimension은 유지하되 current public Growth capability는 WCA_333만 허용한다. Unsupported known event에 fake empty Growth를 제공하지 않는다.

세부 metric formula는 [Growth Metrics](../01-domain/growth-metrics.md), endpoint와 query proposal은 [Growth Architecture](../03-architecture/growth-architecture.md)가 관리한다.

## Consequences

### Positive

- V2.1 Record, PB와 correction behavior를 schema 재설계 없이 재사용한다.
- 같은 metric이 backend contract 하나에서 계산돼 client와 future consumer 사이 drift를 줄인다.
- Frontend는 full history, scramble과 provenance를 Growth 화면 때문에 전송받지 않는다.
- Public/private boundary가 명시돼 activity timestamp와 Practice volume을 실수로 공개하지 않는다.
- Redis Ranking 책임이 Growth analytics로 확장되지 않는다.
- Future event와 user timezone을 response dimension으로 확장할 여지를 남긴다.

### Negative

- PB progression은 immutable 당시 snapshot이 아니며 Record correction 뒤 이전 point가 달라질 수 있다.
- `created_at` 기반 daily metric은 delayed retry가 실제 Practice date와 다를 수 있다.
- Summary가 여러 query를 조합하므로 read-only transaction, one-clock boundary와 query-plan 검증이 필요하다.
- 100,000 Record user의 progression view는 전체 index range를 스캔할 수 있다.
- Asia/Seoul 밖 사용자의 local day와 service day가 다를 수 있다.

### Required follow-up

- 구현 전에 ADR-0010과 MUST metric proposal을 accepted contract로 확정한다.
- Backend calculator fixture에서 DNF/+2/Ao/median/IQR/time boundary를 고정한다.
- MySQL 8 integration test와 10,000-record `EXPLAIN ANALYZE` evidence를 남긴다.
- UI에 `현재 남아 있는 기록 기준`, `기록된 활동`, `Asia/Seoul`, sample count를 필요한 위치에 표시한다.
- Public Profile, immutable audit, user timezone 또는 measured pre-aggregation 필요가 생기면 각각 별도 product/architecture decision을 연다.

## Rejected as part of this proposal

- current `averageTimeMs`를 이름만 바꿔 canonical Growth metric으로 재사용
- DNF를 arbitrary worst millisecond나 infinity로 바꿔 일반 mean에 포함
- `occurred_at`을 V2.2 prerequisite로 추가
- 모든 Profile view마다 entire Record entity/history를 client로 전송
- `user_pbs` row를 PB history로 해석
- Ranking Redis namespace에 Growth summary/progression을 저장
- 다른 EventType enum에 misleading empty Growth response 제공
