---
doc_type: index
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related: []
---
# Architecture Decision Records

ADR은 구현과 운영에 영향을 주는 중요한 기술 결정과 trade-off를 보존한다. status는 proposed, accepted, rejected, superseded 중 하나를 사용한다. `accepted`는 사용자가 결정을 승인했다는 뜻이며 구현 완료를 의미하지 않는다.

| ADR | 상태 | 결정 |
| --- | --- | --- |
| [ADR-0001](adr-0001-mysql-source-of-truth.md) | accepted | MySQL을 business data Source of Truth로 사용 |
| [ADR-0002](adr-0002-redis-ranking-read-model.md) | accepted | Redis ZSET 기반 ranking Read Model 사용 |
| [ADR-0003](adr-0003-memory-access-token-http-only-refresh-cookie.md) | accepted | memory access token과 HttpOnly refresh cookie 사용 |
| [ADR-0004](adr-0004-forward-only-flyway-migrations.md) | accepted | applied Flyway를 변경하지 않는 forward-only migration |
| [ADR-0005](adr-0005-exact-revision-deployment-unit.md) | accepted | exact application revision과 runtime config digest pair 배포 |
| [ADR-0006](adr-0006-practice-record-future-lifecycle-boundary.md) | accepted | Practice Record와 future lifecycle aggregate 분리 |
| [ADR-0007](adr-0007-canonical-timer-time-input-provenance.md) | accepted | Practice Timer canonical time과 Input Method provenance 분리 |
| [ADR-0008](adr-0008-record-submission-idempotency.md) | accepted | client submission identity 기반 Record 저장 idempotency |

과거 최초 결정일을 신뢰성 있게 특정하지 못해, 기존 구현을 ADR로 공식 기록한 2026-08-10을 created로 사용한다.

## 추가 규칙

- 새 결정은 다음 번호로 추가한다.
- accepted ADR의 결정을 바꾸면 원문을 덮어쓰지 않고 새 ADR에서 supersede한다.
- 단순 구현 설명은 architecture 문서에 두고 실제 대안·trade-off가 있는 결정만 ADR로 남긴다.
