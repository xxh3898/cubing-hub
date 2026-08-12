---
doc_type: requirement
status: draft
created: 2026-08-11
updated: 2026-08-12
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/vision.md
  - docs/00-product/roadmap.md
  - docs/00-product/metrics.md
  - docs/01-domain/growth-metrics.md
  - docs/02-requirements/features/profile.md
  - docs/03-architecture/growth-architecture.md
  - docs/08-decisions/adr-0010-current-record-growth-read-contract.md
---
# Growth

## 문서 상태

V2.2 Growth & Profile은 main의 V2.1 Timer / Record Foundation을 기반으로 하는 `draft`다. metric formula와 pure calculator는 PR A에서 구현했지만, read API와 My Growth UI는 아직 application contract나 출시 약속이 아니다.

```text
Current
- Timer의 recent Ao5/Ao12
- private MyPage의 전체 요약, 최근 raw Record chart, history 관리
- Ranking의 nickname과 event PB
- current Record projection을 계산하는 Growth metric calculator

Next implementation
- private My Growth dashboard
- event별 canonical Growth metric과 bounded aggregate API
- next Practice로 돌아가는 명확한 action

Future candidate
- best Ao, Ao progression, opt-in public Profile

Out of scope
- Challenge, Verification, Competition, device/AI analytics
```

Metric 공식과 edge case는 [Growth Metrics](../../01-domain/growth-metrics.md), API·query·성능 제안은 [Growth Architecture](../../03-architecture/growth-architecture.md)가 기준이다.

## 해결할 사용자 문제

Primary User는 일상적으로 큐브를 반복 연습하며 기록 단축과 성장에 관심이 있다. V2.1은 solve를 신뢰할 수 있게 Record로 남기는 기반을 만들었지만, current MyPage의 전체 평균과 raw solve line만으로는 다음을 정확히 답하기 어렵다.

- 최근에 빨라지고 있는가
- current 반복 성과는 어느 정도인가
- PB가 어떻게 발전했는가
- 연습량과 안정성이 어떻게 달라졌는가
- 다음 Practice에서 무엇을 목표로 할 것인가
- Cubing Hub에 얼마나 오래 기록 활동을 남겼는가

V2.2는 숫자가 많은 통계 화면이 아니라 `Record → Improve → Profile → Practice`를 연결하는 최소 read experience여야 한다.

## 목표

- 사용자가 3x3 Practice의 current performance, direction, consistency, activity를 한 화면에서 이해한다.
- 모든 metric이 population, DNF/+2, time boundary, insufficient sample을 명시한다.
- PB progression으로 장기 기록 서사를 제공한다.
- 한 화면의 결과를 다음 Timer 행동으로 연결한다.
- current Record Foundation과 event dimension을 재사용하고 schema·Redis를 불필요하게 확장하지 않는다.

## 비목표

- 모든 계산 가능한 통계 제공
- current MyPage history 관리와 account 관리 제거
- 신규 public Profile/visibility setting system
- all-event combined score 또는 지원하지 않는 event의 empty dashboard
- Session, streak reward·notification, Daily Challenge
- `occurred_at`, import/export, multi-solve offline queue
- Verified Record, Competition, Organizer
- Stackmat, Smart Timer, Smart Cube telemetry
- AI coaching 또는 자동 solve phase 분석
- analytics infrastructure 구현

## V2.2 MVP

### 1. Current performance

- 사용자 가치: PB 하나와 반복 가능한 최근 결과를 구분해 current skill을 이해한다.
- metric contract: Current PB, Recent Ao5, Recent Ao12.
- API: private Growth summary.
- backend work: current `user_pbs` 조회와 latest 12 lightweight Record projection, canonical Ao calculator.
- frontend work: 세 summary card, 부족/DNF status, Timer와 같은 시간 formatter.
- data/migration impact: 없음.
- tests: PB null/+2, Ao 부족/1 DNF/2 DNF, stable ordering, unsupported event.
- risk: Ao를 official result 또는 session average로 오해할 수 있어 `최근 5회/12회`를 표시한다.

### 2. Performance direction

- 사용자 가치: 최근 완료 7일이 직전 7일보다 빨라졌는지와 30일 흐름을 함께 본다.
- metric contract: 두 7-day median 비교와 30-day daily median.
- API: Growth summary의 period comparison + Growth trend의 fixed 30-day points.
- backend work: Asia/Seoul 경계를 UTC instant로 변환한 range query와 median aggregate.
- frontend work: `빨라짐/느려짐/표본 부족` copy, daily median line chart.
- data/migration impact: 없음.
- tests: KST 자정, 빈 날, DNF-only day, 작은 표본, PLUS_TWO, partial today.
- risk: descriptive comparison을 인과·통계적 유의성으로 표현하지 않는다.

### 3. Recent consistency

- 사용자 가치: 최근 가운데 기록 범위가 이전 12회보다 좁아졌는지 확인한다.
- metric contract: latest 12와 previous 12의 IQR, DNF/+2 count.
- API: private Growth summary.
- backend work: latest 24 Record projection과 deterministic percentile calculator.
- frontend work: `최근 12회 기록 범위` card와 previous comparison, recent Ao12 병치.
- data/migration impact: 없음.
- tests: percentile interpolation, rankable 8 미만, DNF/+2, 좁아짐/넓어짐/같음.
- risk: 좁은 범위가 빠른 성과를 뜻하지 않으므로 별도 score/badge로 만들지 않는다.

### 4. PB progression

- 사용자 가치: 장기 성장 이력을 milestone으로 이해한다.
- metric contract: current canonical Record의 strictly improving running minimum.
- API: private PB progression endpoint.
- backend work: MySQL 8 window query 또는 ordered projection scan으로 point만 반환.
- frontend work: step chart와 접근 가능한 ordered timeline, current-state 안내.
- data/migration impact: snapshot/event table 없이 재계산.
- tests: tie, PLUS_TWO, DNF, penalty 변경·삭제 후 재구성, 동일 timestamp+ID ordering.
- risk: immutable 과거로 오해할 수 있어 `현재 남아 있는 기록 기준`을 표시한다.

### 5. Practice activity

- 사용자 가치: 최근 Practice 기록량과 장기 활동 범위를 확인한다.
- metric contract: event total, 오늘 포함 7/30-day count, previous 7-day count, 30-day active days/daily counts, first/latest recorded activity.
- API: Growth summary + Growth trend daily point.
- backend work: indexed count/min/max와 30-day date aggregate.
- frontend work: activity cards와 daily bar chart, exact KST date/partial-today label.
- data/migration impact: 없음.
- tests: 0 records, DNF-only records, date boundary, deleted first/latest Record.
- risk: 실제 모든 Practice가 아니라 Cubing Hub에 저장된 activity다.

### 6. Next Practice action

- 사용자 가치: 통계를 본 뒤 다음 행동을 선택한다.
- metric contract: 새 예측 metric이 아니라 existing recent window를 사용하는 deterministic priority다.
- API: 추가 field 불필요. summary data로 client가 표현한다.
- backend work: 없음.
- frontend work: Recent Ao12가 numeric이면 `다음 12회에서 {Ao12} 이하 만들기`; Ao12가 없고 Ao5가 있으면 `12회까지 기록 이어가기`; 5건 미만이면 `첫 Ao5 만들기`; Timer link 제공.
- data/migration impact: 없음.
- tests: 각 fallback과 `/timer` navigation.
- risk: coaching으로 과장하지 않고 사용자가 무시할 수 있는 제안으로 둔다.

## UX / Information Architecture 대안

| 안 | Practice 직후 연결 | 복잡도 | 모바일/navigation | V2.3 확장 | 평가 |
| --- | --- | --- | --- | --- | --- |
| A. Timer 일부 + Profile Growth section | 즉시 보임 | Timer가 측정·저장·통계까지 과밀해짐 | 좁은 화면에서 solve flow를 방해 | Challenge와 Timer가 더 복잡해질 수 있음 | 비추천 |
| B. 별도 Growth page + Profile summary | 명확한 전용 공간 | 새 route·top nav·mobile tab 위치 필요 | 현재 MyPage와 기능 중복 | 별도 activity hub 확장은 쉬움 | 장기 후보 |
| C. My Page를 My Growth dashboard로 확장 | Timer CTA로 연결 가능 | 기존 summary/chart/history를 교체 | protected route와 account modal 재사용 | Challenge activity는 나중에 별도 aggregate로 연결 가능 | **추천** |

### V2.2 proposal

V2.2는 `/mypage` route를 유지하고 화면의 primary identity를 `My Growth`로 확장한다. Account 관리는 current modal을 유지하며, Record history/penalty/delete는 dashboard 아래에 둔다. Timer에는 Ao5/Ao12와 작은 `내 성장 보기` link만 두고 Growth chart를 복제하지 않는다.

이 선택은 새 navigation item을 추가하지 않고 current MyPage와 Recharts를 재사용한다. V2.3 Daily Challenge는 Growth metric이나 `records`에 섞지 않고 나중에 별도 activity section으로 연결할 수 있다.

## Text wireframe

```text
My Growth                                      [3x3x3]
내 Practice 기록을 바탕으로 현재 성장 흐름을 확인합니다.

[Current PB]        [Recent Ao5]       [Recent Ao12]
[19.780]             [20.412]           [20.965]

Next Practice
----------------------------------------------------
다음 12회에서 Ao12 20.965 이하를 만들어보세요. [Timer 시작]

Performance Direction
----------------------------------------------------
최근 완료 7일 중앙 기록 20.100
직전 7일 21.350보다 5.9% 빨라짐 · 표본 24 / 18
[30-day daily median line chart]

Recent Consistency
----------------------------------------------------
최근 12회 기록 범위 1.820초 · 이전 12회보다 0.430초 좁아짐
DNF 1/12 · +2 1/12

PB Progression
----------------------------------------------------
[PB step chart]
23.410 → 21.820 → 20.150 → 19.780
[접근 가능한 milestone list]

Practice Activity
----------------------------------------------------
[7일 42회] [직전 7일 31회] [30일 126회] [활동일 12일]
[30-day daily activity bar chart]
전체 438회 · 첫 기록 2026-04-22 · 최근 기록 2026-08-11

Record History
----------------------------------------------------
[기존 pagination / penalty / delete]
```

Empty state는 빈 card를 여러 개 만들지 않고 다음 단계 하나를 제시한다.

- 0 records: 첫 Practice를 시작하는 Timer CTA
- 1~4 records: PB와 activity만 표시하고 첫 Ao5까지 남은 수 안내
- 5~11 records: Ao5와 Ao12까지 남은 수 안내
- period sample 부족: chart raw point와 count는 보여 주되 improvement 문구는 숨김
- DNF-only: count와 DNF 상태를 보여 주고 numeric trend를 만들지 않음

## Chart 결정

현재 frontend에 Recharts `3.8.1`이 설치돼 있고 MyPage에서 `ResponsiveContainer`, `LineChart`, `Tooltip`을 사용한다. V2.2에 새 chart dependency는 필요하지 않다.

### 30-day daily median line

- x-axis: Asia/Seoul `YYYY-MM-DD`, 모바일에서는 5~7개 tick만 표시
- y-axis: effective millisecond를 formatted time으로 표시, `낮을수록 빠름` 안내
- sample size: 최대 30 date point, tooltip에 record/rankable/DNF/+2 count
- missing day: `medianTimeMs=null`, 선을 연결하지 않고 0으로 만들지 않음
- DNF-only day: null point와 tooltip의 DNF count
- timezone: response의 `Asia/Seoul`
- responsive: fixed 240~280px height, horizontal scroll 없이 tick 수를 줄임

### PB step chart

- x-axis: progression point `createdAt`을 Asia/Seoul date로 표시
- y-axis: effective millisecond
- sample size: improvement point만 사용
- missing day: 개념 없음. 다음 PB까지 step 유지
- DNF: progression point가 될 수 없음
- responsive: point가 적으면 timeline을 우선, 많으면 tick 축약
- accessibility: chart만 제공하지 않고 chronological text list를 함께 제공

### Daily activity bar

- x-axis: daily median과 같은 30 date
- y-axis: Record count, DNF 포함
- missing day: 높이 0 bar
- timezone: Asia/Seoul
- responsive: day label 축약, tooltip에 exact date와 penalty count

### 보류 chart

- Sparkline: summary card에 의미·축·표본을 숨기므로 MVP에서는 사용하지 않는다.
- Raw solve line: 현재 MyPage chart는 outlier와 irregular activity를 그대로 연결한다. 상세 drill-down 후보로 남기고 canonical Growth trend로 사용하지 않는다.
- Rolling Ao chart: overlapping window와 DNF 표현이 복잡해 MVP 이후 검증한다.

## My Growth와 Public Profile

| 항목 | My Growth | Public Profile |
| --- | --- | --- |
| 접근 | authenticated owner only | V2.2 신규 route/API 없음 |
| nickname | 표시·수정 | 기존 Ranking에서 이미 공개 |
| Current PB | 표시 | 기존 Ranking PB만 유지 |
| Recent Ao/trend/IQR | 표시 | 공개하지 않음 |
| total/7/30-day solve count | 표시 | 공개하지 않음 |
| first/latest activity | 표시 | 공개하지 않음 |
| Record history·scramble·input method | owner 관리 | 공개하지 않음 |

### Privacy proposal

- Practice 횟수는 경쟁 실력과 다른 행동 정보이므로 default public으로 만들지 않는다.
- 최근 활동 시각은 생활 패턴을 드러낼 수 있어 공개하지 않는다.
- 상세 trend와 consistency는 공개 가치가 확인되지 않았고 비교 압박을 만들 수 있어 private로 둔다.
- visibility setting system은 V2.2 문제 해결의 prerequisite가 아니다.
- 신규 public Profile을 만들지 않으면 privacy setting 없이도 안전한 최소 범위를 유지할 수 있다.

Future public Profile을 검토할 때는 stable user identifier, block/deleted-user behavior, opt-in 또는 visibility policy를 먼저 결정한다. nickname과 PB만 보여 주는 화면은 현재 Ranking 이상의 사용자 가치가 있는지도 검증해야 한다.

## Event 정책

- V2.2 public release는 `WCA_333` Growth만 지원한다.
- UI selector는 supported Practice event만 보여 준다. current `mainEvent`가 미지원 legacy value이면 WCA_333을 fallback으로 사용하되 해당 event의 fake empty dashboard를 만들지 않는다.
- API는 `eventType`을 유지해 future event 추가가 response/schema rewrite를 요구하지 않게 한다.
- known but unsupported event는 기존 capability policy대로 400을 반환한다.
- Result Kind와 capability 승인 없이 other EventType을 time metric에 넣지 않는다.

## Acceptance와 release gate

### Metric correctness

- DNF, PLUS_TWO, tie, deletion, penalty PATCH와 stable ordering fixture가 domain contract와 일치한다.
- 부족한 표본, DNF result, numeric result가 서로 다른 status로 표현된다.
- chart와 summary가 동일한 `generatedAt`, `asOfDate`, timezone 의미를 사용한다.
- PB progression이 current `user_pbs` PB와 같은 final point를 갖는다.

### API/Data

- Growth endpoint는 authenticated owner의 WCA_333 data만 반환한다.
- unsupported/invalid event와 인증 실패 contract를 REST Docs로 검증한다.
- summary/trend는 bounded payload이며 frontend에 전체 history를 보내지 않는다.
- 10,000-record fixture에서 query plan과 row scope를 기록한다. 100,000-record case는 stress evidence이며 실제 blocker threshold는 baseline 측정 후 정한다.
- V2.2 release note에는 migration이 없음을 기록한다. Production row count는 release criterion으로 사용하지 않는다.

### Frontend

- loading, error, empty, insufficient, numeric, DNF state를 구분한다.
- desktop/mobile에서 chart, tooltip, text alternative, Timer CTA와 history 관리가 동작한다.
- current Timer save/penalty/delete 뒤 Growth refresh가 canonical server result와 일치한다.
- 새 chart dependency를 추가하지 않는다.

### CI와 smoke

- 각 implementation PR의 focused backend/frontend test와 generated REST Docs를 통과한다.
- `dev` push와 `dev → main` PR Validate의 required job이 성공한다.
- release candidate에서 keyboard/touch save → Growth, penalty/delete → PB progression 재계산, KST boundary, mobile layout을 targeted smoke한다.
- build/CI 성공을 production request 성공으로 표현하지 않는다. main merge/deploy는 별도 승인과 release gate를 따른다.

## Product validation

### 출시 후 볼 행동 지표

- `Growth page reach`: Record를 가진 주간 사용자 중 My Growth를 본 비율
- `Growth revisit`: 첫 조회 뒤 7일 이내 다시 본 사용자 비율
- `Timer → Growth`: Timer 저장 또는 Timer 화면에서 My Growth로 이동한 비율
- `Growth → Timer`: Next Practice CTA를 통해 Timer로 돌아간 비율
- `PB progression interaction`: progression tooltip/timeline을 확인한 비율
- `Practice continuation`: Growth 조회 cohort와 미조회 cohort의 이후 7일 Record 저장 빈도. 인과로 단정하지 않고 표본·selection bias를 기록

### 최소 analytics event 후보

Analytics infrastructure는 V2.2에 포함하지 않는다. 향후에도 raw time, scramble, Record ID를 event payload에 넣지 않는다.

| Event | 최소 property | 목적 |
| --- | --- | --- |
| `growth_viewed` | `eventType`, `entryPoint`, `sampleState` | reach와 entry path |
| `growth_revisited` | `eventType`, `daysSinceFirstViewBucket` | revisit |
| `growth_pb_progression_opened` | `eventType`, `pointCountBucket` | progression 가치 |
| `growth_practice_cta_clicked` | `eventType`, `targetType` | Growth → Practice 연결 |
| `practice_record_saved` | `eventType`, `origin` | 이후 Practice 행동과 연결. 실제 time은 수집하지 않음 |

### 사용자 인터뷰 질문

1. 지금은 기록이 빨라지고 있는지 어떤 방식으로 확인하는가?
2. PB와 최근 Ao12 중 현재 실력을 더 잘 설명한다고 느끼는 것은 무엇이며 왜 그런가?
3. 최근 7일 중앙 기록과 직전 7일 비교가 이해되는가? 어떤 표현이 더 자연스러운가?
4. 기록이 없는 날을 chart의 빈칸으로 보는 것이 이해되는가?
5. `최근 12회 기록 범위`가 안정성을 이해하는 데 도움이 되는가, 아니면 복잡한가?
6. PB progression에서 가장 보고 싶은 정보는 time, 날짜, penalty 중 무엇인가?
7. 연습량에서 solve count, active days, streak 중 실제 행동을 바꾸는 정보는 무엇인가?
8. Growth 화면을 본 뒤 다음 Practice 목표로 어떤 안내가 가장 유용한가?
9. 다른 사람에게 공개해도 괜찮은 Profile 정보와 공개하고 싶지 않은 정보는 무엇인가?
10. 이 화면이 기존 timer/statistics 도구를 보완하는가, 중복하는가?

## Decision matrix

| Decision | Options | V2.2 proposal | Why | Confidence | Blocks implementation? |
| --- | --- | --- | --- | --- | --- |
| V2.2 MVP metrics | 많은 통계 / 6 value units | Current, direction, consistency, PB, activity, next action | 사용자 7개 질문을 작은 묶음으로 충족 | High | No, default 사용 가능 |
| Growth page location | Timer+Profile / 별도 page / MyPage 확장 | MyPage를 My Growth로 확장 | current route·chart·history·account 구조 재사용 | High | No |
| Calculation | frontend full history / backend aggregate | backend canonical calculation | O(N) client transfer와 client drift 방지 | High | No |
| PB progression | snapshot table / current history scan | current canonical history 재구성 | 현재 data로 충분하고 correction과 일치 | High | No |
| Trend | 7/30 mean / rolling mean / daily median+7-day median | daily median+완료 7-day 비교 | population과 missing day를 명확히 표현 | Medium | No, 사용자 검증 필요 |
| DNF | mean 제외 / infinity / rate only | median/IQR에서 제외하고 count/rate 병기, Ao는 V2.1 rule | metric 목적을 섞지 않음 | High | No |
| Activity timezone | UTC / Asia/Seoul / user timezone | Asia/Seoul service day, instant는 UTC | current UI/Home 정책 재사용, user timezone은 과도 | High | No |
| Public Profile | 상세 공개 / 최소 공개 / 신규 없음 | 신규 public Profile 없음 | privacy setting 없이 안전한 최소 범위 | Medium | No, default 사용 가능 |
| API shape | history client 계산 / one large response / summary+series split | summary + trend + PB progression | initial payload·query·evolution 분리 | High | No |
| Migration/index | covering index·snapshot / 없음 | V2.2 migration 없음 | 기존 user/event/date index가 최소 query 지원 | Medium | No, benchmark gate 필요 |

## Open Questions

### 1. 신규 Public Profile을 V2.2에 포함할 것인가

```text
Question: V2.2에서 다른 사용자가 여는 신규 Profile route/API를 만들 것인가?
Why it matters: Practice count·activity time·trend 공개는 privacy와 stable identifier 계약을 만든다.
Option A: My Growth만 구현하고 기존 Ranking nickname/PB 공개만 유지한다.
Option B: nickname과 event PB만 보여 주는 최소 public Profile을 추가한다.
Proposal: Option A. current Growth 범위에 집중하고 public Profile 가치를 별도로 검증한다.
Default without a separate decision: Option A.
```

### 2. Legacy 전체 평균을 어떻게 전환할 것인가

```text
Question: current profile/home `averageTimeMs`를 V2.2에서 즉시 제거할 것인가?
Why it matters: event·population이 없는 all-time mean은 V2.2 metric 원칙과 충돌하지만 existing consumer compatibility가 있다.
Option A: UI에서는 제거하고 API field는 한 release 동안 유지·deprecated 처리한 뒤 별도 제거한다.
Option B: API와 UI에서 같은 PR에 제거한다.
Proposal: Option A. Growth API를 additive하게 도입하고 consumer 전환을 분리한다.
Default without a separate decision: Option A.
```

### 3. Consistency 표현을 노출할 것인가

```text
Question: latest-12 IQR을 `최근 12회 기록 범위`로 MVP에 보여 줄 것인가?
Why it matters: 안정성 질문에는 답하지만 처음 보는 사용자에게 복잡할 수 있다.
Option A: Ao12 옆에 기록 범위와 DNF/+2 count를 짧게 표시한다.
Option B: raw/daily trend만 제공하고 consistency card는 사용자 연구 뒤 추가한다.
Proposal: Option A. 수학 용어와 score를 숨기고 previous 12와의 millisecond 차이만 설명한다.
Default without a separate decision: Option A.
```

세 항목은 기본안으로 구현 계획을 막지 않는다. 기본안이 바뀌면 API payload, UI acceptance와 PR 분할을 다시 확인한다.
