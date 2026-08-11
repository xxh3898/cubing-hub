---
doc_type: adr
status: accepted
created: 2026-08-10
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/01-domain/solve-model.md
  - docs/01-domain/ranking-rules.md
  - docs/01-domain/scramble-rules.md
  - docs/02-requirements/features/timer.md
  - docs/03-architecture/backend-architecture.md
---
# ADR-0009 EventType identity와 Practice capability를 분리

## Context

현재 `EventType`에는 여러 WCA event code가 있고 Record와 Ranking API가 그 enum 전체를 받을 수 있다. 반면 public Timer와 Scramble은 WCA_333만 실제 지원한다. WCA_333FM과 WCA_333MBF처럼 일반 `time_ms` lower-is-better 결과와 맞지 않는 event까지 enum 존재만으로 Practice Record·Ranking에 허용하면 잘못된 제품 의미를 만든다.

V2.1 public Practice 범위는 기존 `records`와 `user_pbs` data가 없다는 전제로 정했다. Production query는 실행하지 않았으며, 기존 event data migration blocker를 두지 않는다.

## Decision

Event code identity와 public Practice 지원 여부를 분리한다. 기존 `EventType` 값은 삭제하지 않는다.

V2.1 application domain은 immutable registry로 `PracticeEventCapability`를 관리한다. Capability는 eventType, Result Kind, Practice Timer, Scramble, Practice Record, Practice Ranking 지원 여부를 가진다.

Registry에는 WCA_333만 등록한다.

```text
eventType = WCA_333
resultKind = TIME
practiceTimerSupported = true
scrambleSupported = true
practiceRecordSupported = true
practiceRankingSupported = true
```

Entry가 없는 EventType은 V2.1 public Practice flow에서 unsupported다. Record, Scramble과 Ranking use case는 같은 registry를 사용하고 repository나 Redis를 호출하기 전에 capability를 검증한다. Unsupported known event는 400으로 응답한다.

Capability는 code review와 release로 변경되는 제품 계약이다. V2.1에서는 dynamic DB table, admin configuration과 capability discovery endpoint를 만들지 않는다. Future event는 Result Kind와 각 capability를 명시적으로 승인한 뒤 registry와 consumer contract를 함께 확장한다.

## Alternatives

- `EventType` enum 존재를 모든 Practice 기능 지원으로 간주
- WCA_333만 남기고 다른 EventType code 삭제
- Timer, Scramble, Record, Ranking마다 별도 supported Set 유지
- `EventType` constructor에 모든 product capability를 직접 결합
- Dynamic event table과 admin-configurable capability 도입
- WCA_333FM과 WCA_333MBF를 일반 time result로 임시 처리

## Consequences

- Event identity를 유지하면서 V2.1 public Practice 의미를 WCA_333으로 명확히 제한한다.
- Timer, Scramble, Record와 Ranking이 같은 backend policy를 사용해 drift를 줄인다.
- 다른 known EventType 요청은 misleading empty result 대신 명시적 400을 반환한다.
- Frontend는 한 supported-event Set을 presentation hint로 유지하되 backend가 최종 authority다.
- 새 event는 Result Kind, generator, Record와 Ranking eligibility를 함께 결정해야 한다.
- Runtime event 설정과 admin UI는 제공하지 않으며 event 추가에는 application release가 필요하다.
