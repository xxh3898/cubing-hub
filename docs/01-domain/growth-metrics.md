---
doc_type: domain
status: active
created: 2026-08-11
updated: 2026-08-14
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/roadmap.md
  - docs/01-domain/solve-model.md
  - docs/02-requirements/features/growth.md
  - docs/02-requirements/features/profile.md
  - docs/08-decisions/adr-0010-current-record-growth-read-contract.md
---
# Growth Metrics

## 문서 상태

V2.2 `MUST` metric formula와 edge case는 active contract다. PR A의 pure calculator와 PR B의 private Growth read API는 이 문서의 effective result, Ao, median, period comparison, IQR, PB progression, timezone 규칙을 구현한다.

My Growth UI와 release는 아직 구현하지 않았다. `SHOULD`, `NOT NOW`, future candidate는 implementation commitment가 아니다.

```text
Current
- V2.1 Record, current PB projection, event history, Timer Ao5/Ao12
- Growth pure calculator와 canonical unit fixture
- private Growth summary, 30-day trend, paginated PB progression API

Next implementation
- My Growth dashboard

Future candidate
- best Ao progression, pre-aggregation, user timezone

Out of scope
- Daily Challenge, Verification, Competition, device telemetry, AI coaching
```

## 사용자 질문과 MVP 연결

| 사용자 질문 | V2.2 추천 답변 |
| --- | --- |
| 최근에 빨라지고 있는가 | 완료된 최근 7일 median과 직전 7일 median 비교, 최근 30일 daily median |
| 현재 실력은 어느 정도인가 | current PB, recent Ao5, recent Ao12 |
| PB는 어떻게 발전했는가 | current canonical Record에서 재구성한 PB progression |
| 연습량은 늘었나 줄었나 | 7일·직전 7일·30일 solve count, 30일 daily solve count |
| 기록의 안정성이 좋아졌는가 | latest 12와 previous 12의 interquartile range, DNF·PLUS_TWO count |
| 다음 Practice 목표는 무엇인가 | current recent Ao12 이하의 다음 Ao12를 만드는 deterministic CTA |
| 지금까지 얼마나 활동했는가 | event별 total solves, active days, first/latest recorded activity |

## 공통 canonical contract

### Population과 ordering

- V2.2 public release의 지원 event는 `WCA_333` 하나다.
- 모든 metric은 요청한 `eventType`의 현재 남아 있는 completed Practice Record만 사용한다.
- chronological ordering은 `created_at ASC, id ASC`, recent ordering은 `created_at DESC, id DESC`다.
- `created_at`은 실제 solve 발생 시각이 아니라 server persistence timestamp다. UI에서는 `기록된 시각`, `Practice 기록 활동`으로 표현한다.
- Record 삭제와 penalty PATCH는 current canonical state를 바꾼다. 별도 audit가 없으므로 이전 상태를 복원한 history로 표현하지 않는다.

### Effective result

| Penalty | Metric value | Count policy |
| --- | --- | --- |
| `NONE` | `timeMs` | Record count와 rankable count에 포함 |
| `PLUS_TWO` | `timeMs + 2000` | Record count와 rankable count에 포함, PLUS_TWO count 별도 표시 |
| `DNF` | numeric value 없음 | Record count에는 포함, median·mean·percentile에서는 제외, DNF count 별도 표시 |

`PLUS_TWO`의 2,000ms를 metric별로 다시 정의하지 않는다. Persistent `effective_time_ms`를 추가하지 않고 canonical raw time과 current penalty에서 계산한다.

### Ao5와 Ao12

Recent Ao5/Ao12는 V2.1의 Cubing Hub Practice rolling average를 그대로 사용한다.

1. recent ordering의 같은 event Record 5개 또는 12개를 정확히 사용한다.
2. `NONE`과 `PLUS_TWO`는 effective value를 사용한다.
3. DNF 한 개는 worst로 제거할 수 있다.
4. DNF가 두 개 이상이면 결과 status는 `DNF`다.
5. best와 worst를 각각 한 개 제거한다.
6. 나머지 산술평균을 integer millisecond로 반올림한다.

Window가 부족하면 `INSUFFICIENT_DATA`, 계산 결과가 DNF면 `DNF`, 숫자 결과가 있으면 `AVAILABLE`로 구분한다. `null` 하나로 부족한 표본과 DNF를 합치지 않는다. 이 규칙을 WCA-compliant라고 표현하지 않는다.

### Median

Median은 이름이 지정된 population의 rankable effective value를 오름차순 정렬해 계산한다.

- 홀수 `n`: 가운데 값
- 짝수 `n`: 가운데 두 값의 산술평균을 integer millisecond로 반올림
- DNF: numeric population에서 제외하고 같은 window의 DNF count/rate로 함께 제공

`평균`이라는 일반 label 대신 `최근 7일 median`, `일별 median`처럼 population을 표시한다. 한국어 UI는 `중앙 기록`을 기본 label로 사용하고 tooltip에서 median 정의를 설명한다.

### 기간과 timezone

- persistence와 API instant는 UTC를 유지한다.
- V2.2 activity day와 chart의 service boundary는 `Asia/Seoul`이다.
- `asOfDate`는 response 생성 시점의 Asia/Seoul 날짜다.
- 30-day chart/activity window는 `asOfDate - 29일` 00:00 inclusive부터 `asOfDate + 1일` 00:00 exclusive까지다. 오늘은 진행 중인 partial day임을 UI에 표시한다.
- `last7DaysSolveCount`는 오늘을 포함한 7개 calendar date, `last30DaysSolveCount`는 오늘을 포함한 30개 calendar date다.
- `previous7DaysSolveCount`는 `last7DaysSolveCount` 구간 바로 전의 연속 7개 calendar date다. 두 activity 구간 사이에는 gap이나 overlap이 없다.
- performance 비교는 partial day 편향을 피하기 위해 오늘을 제외한 완료 calendar day를 사용한다.

```text
current activity 7 days  = [asOfDate - 6일 00:00, asOfDate + 1일 00:00)
previous activity 7 days = [asOfDate - 13일 00:00, asOfDate - 6일 00:00)
```

```text
recent period   = [asOfDate - 7일 00:00, asOfDate 00:00)
previous period = [asOfDate - 14일 00:00, asOfDate - 7일 00:00)
```

Named user timezone과 V2.3 Daily Challenge timezone은 이 계약에 포함하지 않는다.

### 기간 비교와 표본

Performance period는 다음을 모두 만족할 때만 비교한다.

- period 대표값은 해당 구간에 저장된 모든 rankable effective Record를 하나의 population으로 둔 median이다. Daily median들의 median이 아니다.
- 각 period에 rankable Record 5개 이상
- 각 period에 rankable Record가 있는 active day 2일 이상

한쪽이 0건이면 `NO_DATA`, record는 있지만 기준보다 적으면 `INSUFFICIENT_SAMPLE`, 양쪽이 기준을 만족하면 `AVAILABLE`이다. 기록이 없는 날을 0ms solve로 넣거나 synthetic value로 보간하지 않는다.

### Improvement 표현

시간은 낮을수록 좋으므로 raw 증감률 대신 다음 공식을 사용한다.

```text
improvementPercent
= (previousMedianMs - recentMedianMs) / previousMedianMs * 100
```

- 양수: `10.0% 빨라짐`
- 음수: `10.0% 느려짐`
- 0: `변화 없음`

계산은 원래 millisecond 값으로 하고 표시는 소수점 한 자리로 반올림한다. 표본 수와 기간을 함께 표시하고 통계적 유의성이나 원인을 주장하지 않는다.

### Recent consistency

MVP의 consistency는 latest 12 Record와 바로 앞 previous 12 Record를 비교한다.

- 각 12-record window의 DNF·PLUS_TWO count를 보존한다.
- rankable effective value가 8개 이상일 때만 Q1·Q3와 IQR을 계산한다.
- percentile은 sorted values에서 index `(n - 1) * p`를 사용하고 양쪽 값 사이를 linear interpolation한 뒤 integer millisecond로 반올림한다.
- `IQR = Q3 - Q1`이다. 작은 IQR은 기록 분포가 좁다는 뜻일 뿐 더 빠르다는 뜻은 아니다.
- current와 previous window 모두 계산 가능할 때만 `NARROWER`, `WIDER`, `UNCHANGED`를 표시한다.

UI label은 `표준편차`나 `안정성 점수`가 아니라 `최근 12회 기록 범위`를 사용하고 recent Ao12와 함께 보여 준다.

## 분류 요약

| 분류 | Metric |
| --- | --- |
| MUST | Current PB, PB progression, Recent Ao5, Recent Ao12, period median comparison, 30-day daily median, total/7-day/30-day/daily solve count, active days, first/latest activity, latest-12 IQR, latest-12 DNF/+2 rate, event-specific My Growth summary |
| SHOULD | Best Ao5/Ao12, recent best/worst tooltip, Ao progression, compact public Profile after privacy validation |
| NOT NOW | generic recent/all-time average, 7/30-day mean, rolling mean chart, streak, standard deviation, variance, best/worst spread, Growth Redis/pre-aggregation |

## Record / Performance metric 평가

### Current PB

```text
Metric: Current PB single
User question: 내 가장 빠른 current Practice Record는 무엇인가?
Value: 익숙하고 즉시 이해되며 Ranking과도 연결된다.
Formula: user_pbs의 요청 event projection과 근거 Record의 effective time.
Required data: user_id, event_type, user_pbs.best_time_ms, record_id, Record created_at/penalty/time_ms.
DNF/+2 policy: DNF 제외, PLUS_TWO는 +2000ms.
Time boundary: 기간 제한 없음. current retained Record 기준.
Performance cost: user/event unique lookup과 Record join으로 작다.
Potential misleading interpretation: PB 하나가 현재의 반복 가능한 실력을 대표한다고 오해할 수 있다.
V2.2 recommendation: MUST. Recent Ao12와 나란히 표시한다.
```

### PB progression

```text
Metric: PB progression
User question: 내 PB가 언제, 어떤 순서로 좋아졌는가?
Value: 장기 성장 서사를 가장 직접적으로 보여 준다.
Formula: chronological rankable Record를 순회하며 이전 running minimum보다 strictly lower인 point만 남긴다. 같은 effective time의 뒤 Record는 새 PB가 아니다.
Required data: record id, event_type, time_ms, penalty, created_at.
DNF/+2 policy: DNF 제외, PLUS_TWO effective time 사용.
Time boundary: 전체 current retained history. created_at은 recorded time이다.
Performance cost: DB window scan O(N), response는 improvement point O(P).
Potential misleading interpretation: penalty PATCH·삭제 이전에 보았던 immutable 역사로 오해할 수 있다.
V2.2 recommendation: MUST. `현재 남아 있는 기록 기준` 안내와 함께 step chart/timeline으로 표시한다.
```

### Recent Ao5

```text
Metric: Recent Ao5
User question: 바로 최근 짧은 solve 묶음의 결과는 어떤가?
Value: Practice 직후 feedback이 빠르고 현재 Timer contract를 재사용한다.
Formula: recent same-event Record 5개의 Cubing Hub Practice Ao5.
Required data: 최신 5개 event Record의 time_ms, penalty, effective result, stable ordering.
DNF/+2 policy: 공통 Ao contract.
Time boundary: 날짜가 아니라 latest 5 Record.
Performance cost: composite index reverse scan limit 5.
Potential misleading interpretation: 표본이 작아 한두 solve에 민감하다.
V2.2 recommendation: MUST. Recent Ao12보다 보조적으로 표시한다.
```

### Best Ao5

```text
Metric: Best Ao5
User question: 지금까지 가장 좋은 5-solve 묶음은 무엇인가?
Value: single PB보다 반복 성과를 보여 줄 수 있다.
Formula: chronological same-event history의 모든 contiguous 5-record window에서 numeric Ao5 minimum.
Required data: 전체 ordered Record history와 window 종료 Record id/created_at.
DNF/+2 policy: 공통 Ao contract. DNF 결과 window는 best 후보에서 제외.
Time boundary: 전체 current retained history.
Performance cost: request마다 O(N) window scan이 필요하다.
Potential misleading interpretation: current form이 아니라 과거 최고 순간으로 읽힐 수 있다.
V2.2 recommendation: SHOULD. MVP 이후 사용자 가치와 query cost를 확인하고 추가한다.
```

### Recent Ao12

```text
Metric: Recent Ao12
User question: 내 현재 반복 가능한 3x3 성과는 어느 정도인가?
Value: PB보다 안정적인 current performance anchor이며 다음 Practice 목표로 바로 연결된다.
Formula: recent same-event Record 12개의 Cubing Hub Practice Ao12.
Required data: 최신 12개 event Record.
DNF/+2 policy: 공통 Ao contract.
Time boundary: 날짜가 아니라 latest 12 Record.
Performance cost: composite index reverse scan limit 12.
Potential misleading interpretation: Session/WCA official average로 오해할 수 있다.
V2.2 recommendation: MUST. `최근 12회`를 label에 명시한다.
```

### Best Ao12

```text
Metric: Best Ao12
User question: 지금까지 가장 좋은 12-solve 묶음은 무엇인가?
Value: 장기 profile 성과 후보로 single PB를 보완한다.
Formula: 모든 contiguous 12-record window의 numeric Ao12 minimum.
Required data: 전체 ordered Record history와 window 종료 point.
DNF/+2 policy: 공통 Ao contract.
Time boundary: 전체 current retained history.
Performance cost: O(N) history scan과 window calculation.
Potential misleading interpretation: current performance로 오해하거나 official result처럼 읽을 수 있다.
V2.2 recommendation: SHOULD. Public Profile 도입과 함께 별도 검증한다.
```

### Recent average

```text
Metric: Recent average
User question: 최근 평균은 얼마인가?
Value: 쉬운 표현처럼 보이지만 population이 없으면 의미가 없다.
Formula: 정의하지 않는다. Recent Ao12 또는 named 7-day median으로 대체한다.
Required data: 선택한 population에 따라 달라진다.
DNF/+2 policy: 미정 label 자체가 정책을 숨긴다.
Time boundary: 미정.
Performance cost: 구현보다 contract ambiguity가 더 큰 비용이다.
Potential misleading interpretation: 최근 N, 기간, DNF 처리, mean/Ao를 사용자가 알 수 없다.
V2.2 recommendation: NOT NOW. UI/API field로 `recentAverage`를 만들지 않는다.
```

### Median

```text
Metric: Median
User question: outlier 영향을 줄인 기간 대표 기록은 무엇인가?
Value: daily/period trend를 안정적으로 비교할 수 있다.
Formula: named rankable population의 중앙값. 짝수면 가운데 두 값 평균 후 integer 반올림.
Required data: effective time과 정확한 period/window.
DNF/+2 policy: DNF numeric 제외+rate 병기, PLUS_TWO 반영.
Time boundary: daily median 또는 완료 최근 7일 median처럼 명시.
Performance cost: MySQL 8 window/native aggregate 또는 bounded server calculation.
Potential misleading interpretation: DNF 제외 사실을 숨기면 실제 안정성을 과대평가할 수 있다.
V2.2 recommendation: MUST. standalone 전체 median이 아니라 daily/7-day metric에 사용한다.
```

### Best / worst recent solve

```text
Metric: Best / worst recent solve
User question: 최근 분포의 양 끝은 어디인가?
Value: chart tooltip과 recent window 설명에 도움이 된다.
Formula: 명시한 recent 12 Record의 rankable effective min/max.
Required data: 최신 12개 Record.
DNF/+2 policy: DNF는 worst numeric으로 만들지 않고 별도 count, PLUS_TWO 반영.
Time boundary: latest 12 Record.
Performance cost: recent window에서 O(12).
Potential misleading interpretation: extreme 하나를 성장 또는 퇴보로 과대해석할 수 있다.
V2.2 recommendation: SHOULD. primary card가 아닌 tooltip/detail로 제한한다.
```

### DNF rate

```text
Metric: DNF rate
User question: 최근 solve를 완주하지 못한 비율은 어떤가?
Value: median/IQR이 숨기는 실패를 보완한다.
Formula: latest 12 Record의 DNF count / Record count * 100.
Required data: recent Record penalty.
DNF/+2 policy: DNF가 numerator이며 numeric time으로 바꾸지 않는다.
Time boundary: latest 12 Record. window size와 numerator를 함께 표시.
Performance cost: recent window에서 O(12).
Potential misleading interpretation: 적은 표본의 percentage가 크게 흔들린다.
V2.2 recommendation: MUST. `1/12 DNF`를 먼저, percentage는 보조로 표시한다.
```

### PLUS_TWO rate

```text
Metric: PLUS_TWO rate
User question: 최근 +2 결과가 얼마나 자주 발생했는가?
Value: effective performance와 solve execution discipline을 구분해 볼 단서다.
Formula: latest 12 Record의 PLUS_TWO count / Record count * 100.
Required data: recent Record penalty.
DNF/+2 policy: PLUS_TWO는 effective time에도 반영하고 count에도 포함한다.
Time boundary: latest 12 Record.
Performance cost: recent window에서 O(12).
Potential misleading interpretation: +2 원인을 측정하지 않으므로 원인 진단으로 표현할 수 없다.
V2.2 recommendation: MUST. consistency detail에 count 중심으로 표시한다.
```

## Trend metric 평가

### 최근 7일 평균

```text
Metric: 최근 7일 arithmetic mean
User question: 최근 일주일 기록은 평균적으로 어떤가?
Value: 익숙하지만 outlier와 volume 편향이 크다.
Formula: 후보로 채택하지 않는다. 완료 최근 7일 median을 사용한다.
Required data: 7일 effective records.
DNF/+2 policy: DNF 제외 시 rate 병기가 필수, PLUS_TWO 반영.
Time boundary: 오늘 제외 완료 7 calendar day.
Performance cost: range aggregate.
Potential misleading interpretation: 한 번의 매우 느린 solve와 하루의 많은 solve가 결과를 지배한다.
V2.2 recommendation: NOT NOW. named median으로 대체한다.
```

### 최근 30일 평균

```text
Metric: 최근 30일 arithmetic mean
User question: 한 달 동안의 대표 성과는 무엇인가?
Value: 장기 요약은 가능하지만 현재 변화가 희석된다.
Formula: 후보로 채택하지 않는다. 30-day daily median series를 사용한다.
Required data: 30일 effective records.
DNF/+2 policy: DNF 제외+rate, PLUS_TWO 반영.
Time boundary: 30 calendar date.
Performance cost: range aggregate.
Potential misleading interpretation: 연습량이 많은 날짜와 오래된 기록이 current 상태를 가린다.
V2.2 recommendation: NOT NOW.
```

### 이전 기간 대비 변화율

```text
Metric: Recent 7 completed days vs previous 7 completed days
User question: 최근 performance가 직전 같은 길이의 기간보다 좋아졌는가?
Value: 방향을 한 문장으로 전달한다.
Formula: (previousMedianMs - recentMedianMs) / previousMedianMs * 100.
Required data: 두 period의 effective records, active day, sample count.
DNF/+2 policy: median은 DNF 제외, 각 period DNF count/rate 병기, PLUS_TWO 반영.
Time boundary: 오늘을 제외한 연속 7일 두 구간, Asia/Seoul.
Performance cost: 14-day range와 median calculation.
Potential misleading interpretation: 인과나 통계적 유의성을 뜻하지 않으며 작은 표본은 왜곡된다.
V2.2 recommendation: MUST. 최소 표본 gate와 `빨라짐/느려짐` 문구를 사용한다.
```

### Rolling average trend

```text
Metric: Rolling mean trend
User question: solve마다 이동 평균이 어떻게 변했는가?
Value: 부드러운 선을 제공한다.
Formula: window N의 arithmetic mean.
Required data: ordered history와 window 정책.
DNF/+2 policy: DNF 처리에 따라 선 의미가 크게 달라진다.
Time boundary: solve sequence.
Performance cost: O(N), payload/시각 복잡도 증가.
Potential misleading interpretation: smoothing이 실제 변동과 활동 공백을 숨긴다.
V2.2 recommendation: NOT NOW. daily median line을 우선 검증한다.
```

### Daily median trend

```text
Metric: 30-day daily median trend
User question: Practice한 날의 대표 기록이 최근 어떻게 움직였는가?
Value: 날짜·활동량과 performance를 함께 이해할 수 있다.
Formula: 각 Asia/Seoul date의 rankable effective median.
Required data: 30-day created_at range, effective time, penalty.
DNF/+2 policy: DNF-only day는 median null+DNF count, PLUS_TWO 반영.
Time boundary: 오늘 포함 최근 30 calendar date.
Performance cost: indexed range scan+날짜 group/window aggregate, response 최대 30 point.
Potential misleading interpretation: 적은 solve의 날과 많은 solve의 날을 같은 point로 본다.
V2.2 recommendation: MUST. point마다 record/rankable count를 tooltip에 표시한다.
```

### PB trend

```text
Metric: PB trend
User question: 최고 기록이 장기적으로 어떻게 내려갔는가?
Value: 장기 성장 서사다.
Formula: PB progression과 동일하다.
Required data: 전체 current canonical Record history.
DNF/+2 policy: PB progression contract와 동일.
Time boundary: 전체 recorded history.
Performance cost: O(N) scan.
Potential misleading interpretation: 별도 선을 추가하면 PB progression과 중복된다.
V2.2 recommendation: MUST를 PB progression으로 충족하고 별도 metric/API는 만들지 않는다.
```

### Ao progression

```text
Metric: Ao5/Ao12 progression
User question: single PB가 아니라 rolling performance가 어떻게 변했는가?
Value: 실력의 지속적 변화를 보여 줄 수 있다.
Formula: 모든 chronological contiguous window의 Ao 결과 또는 running best Ao point.
Required data: 전체 ordered history.
DNF/+2 policy: 공통 Ao contract.
Time boundary: solve sequence와 window end created_at.
Performance cost: O(N) 계산과 더 큰 payload.
Potential misleading interpretation: rolling points가 강하게 겹치고 chart가 과밀해진다.
V2.2 recommendation: SHOULD. MVP에서는 recent Ao와 daily median을 먼저 검증한다.
```

## Activity metric 평가

### Total solves

```text
Metric: Event total solves
User question: 이 event를 지금까지 얼마나 기록했는가?
Value: 장기 활동량을 가장 단순하게 보여 준다.
Formula: current retained user/event Record count, DNF 포함.
Required data: user_id, event_type.
DNF/+2 policy: 둘 다 completed Practice Record count에 포함.
Time boundary: 전체 current retained history.
Performance cost: composite index count.
Potential misleading interpretation: 삭제한 Record와 다른 도구의 Practice는 포함하지 않는다.
V2.2 recommendation: MUST. `저장된 기록`이라고 표현한다.
```

### 최근 7/30일 solve count

```text
Metric: Last 7/30 calendar-day solve count
User question: 최근 Practice 기록량은 어느 정도인가?
Value: 단기와 한 달 활동량을 함께 보여 준다.
Formula: 오늘 포함 각 window의 user/event Record count.
Required data: created_at range.
DNF/+2 policy: 둘 다 count에 포함.
Time boundary: Asia/Seoul calendar date, 오늘은 partial day.
Performance cost: indexed range count.
Potential misleading interpretation: 실제 연습했지만 저장하지 않은 solve는 보이지 않는다.
V2.2 recommendation: MUST. exact date range 또는 `오늘 포함`을 표시한다.
```

### Daily solves

```text
Metric: Daily solve count
User question: 어떤 날에 얼마나 Practice를 기록했는가?
Value: 활동량 증가·감소와 공백을 시각적으로 확인한다.
Formula: 각 Asia/Seoul date의 Record count.
Required data: 30-day created_at range.
DNF/+2 policy: 둘 다 count에 포함.
Time boundary: 오늘 포함 최근 30 calendar date.
Performance cost: indexed range+date group, response 30 point.
Potential misleading interpretation: 저장 retry 지연은 실제 solve 날짜와 다를 수 있다.
V2.2 recommendation: MUST. daily median response의 같은 date point에 포함한다.
```

### Active days

```text
Metric: Active days
User question: 최근 한 달에 며칠 Practice Record를 남겼는가?
Value: solve volume과 별개로 반복 빈도를 보여 준다.
Formula: 30-day window에서 Record 1개 이상인 distinct Asia/Seoul date count.
Required data: created_at.
DNF/+2 policy: 둘 다 active day를 만든다.
Time boundary: 오늘 포함 30 calendar date.
Performance cost: date group 결과에서 O(30).
Potential misleading interpretation: 저장 활동일이지 실제 모든 Practice 날짜가 아니다.
V2.2 recommendation: MUST.
```

### Longest/current practice streak

```text
Metric: Longest/current practice streak
User question: 연속으로 며칠 Practice했는가?
Value: 반복 동기를 줄 수 있다.
Formula: consecutive active Asia/Seoul dates.
Required data: 전체 distinct activity date.
DNF/+2 policy: 둘 다 active day를 만든다.
Time boundary: service timezone과 day cutoff에 강하게 의존.
Performance cost: 전체 date history scan 또는 별도 projection.
Potential misleading interpretation: 휴식일을 실패로 만들고 V2.3 engagement policy와 불필요하게 결합한다.
V2.2 recommendation: NOT NOW. notification system도 만들지 않는다.
```

### First record date

```text
Metric: First recorded Practice activity
User question: Cubing Hub에 기록을 남기기 시작한 시점은 언제인가?
Value: 장기 활동 이력의 시작점을 보여 준다.
Formula: current retained user/event Record의 minimum created_at.
Required data: created_at.
DNF/+2 policy: 둘 다 포함.
Time boundary: UTC instant 응답, Asia/Seoul 표시.
Performance cost: index first entry 또는 aggregate.
Potential misleading interpretation: 가입일·실제 큐빙 시작일이 아니며 첫 Record를 삭제하면 바뀐다.
V2.2 recommendation: MUST. `첫 기록`으로만 표현한다.
```

### Latest activity

```text
Metric: Latest recorded Practice activity
User question: 마지막으로 Practice Record를 남긴 때는 언제인가?
Value: 자신의 최근 활동 context를 제공한다.
Formula: current retained user/event Record의 maximum created_at.
Required data: created_at.
DNF/+2 policy: 둘 다 포함.
Time boundary: UTC instant 응답, Asia/Seoul 표시.
Performance cost: index reverse first entry.
Potential misleading interpretation: 전체 서비스 활동이나 실제 solve 발생 시각으로 오해할 수 있다.
V2.2 recommendation: MUST for private My Growth, public Profile에는 노출하지 않는다.
```

## Consistency metric 평가

### 표준편차

```text
Metric: Standard deviation
User question: 기록이 평균 주위에서 얼마나 퍼지는가?
Value: 익숙한 통계량이지만 outlier와 population 선택에 민감하다.
Formula: sample 또는 population 정의가 추가로 필요하다.
Required data: named rankable window.
DNF/+2 policy: DNF 별도 처리, PLUS_TWO 반영.
Time boundary: window를 명시해야 한다.
Performance cost: SQL aggregate는 가능하다.
Potential misleading interpretation: 큐버가 숫자의 단위를 직관적으로 해석하기 어렵고 느린 outlier가 지배한다.
V2.2 recommendation: NOT NOW. IQR을 먼저 사용한다.
```

### Percentile range

```text
Metric: Latest-12 interquartile range
User question: 최근 기록의 가운데 절반이 얼마나 좁게 모였는가?
Value: outlier 영향을 줄이면서 안정성 변화를 millisecond 폭으로 보여 준다.
Formula: latest 12 Record의 rankable Q3-Q1, previous 12와 비교.
Required data: latest 24 Record의 time_ms, penalty, ordering.
DNF/+2 policy: rankable value는 PLUS_TWO 반영, DNF count 병기. 각 window rankable 8개 이상 필요.
Time boundary: solve sequence window.
Performance cost: index reverse scan limit 24와 O(24) application calculation.
Potential misleading interpretation: 좁지만 느릴 수 있으므로 recent Ao12와 함께 봐야 한다.
V2.2 recommendation: MUST. UI에서는 `최근 12회 기록 범위`로 설명한다.
```

### Best/worst spread

```text
Metric: Best/worst recent spread
User question: 최근 가장 빠른 값과 느린 값 차이는 얼마인가?
Value: 계산과 설명이 쉽다.
Formula: recent N rankable max-min.
Required data: recent N records.
DNF/+2 policy: DNF를 numeric worst로 넣지 않으면 별도 표시가 필요하다.
Time boundary: recent N.
Performance cost: O(N) bounded.
Potential misleading interpretation: extreme 두 개에 지나치게 민감하고 DNF 처리에 따라 왜곡된다.
V2.2 recommendation: NOT NOW as headline metric. best/worst tooltip만 SHOULD다.
```

### Recent N variance

```text
Metric: Recent N variance
User question: 최근 결과의 변동성이 달라졌는가?
Value: 기계 계산에는 유용하지만 단위가 ms squared라 사용자 해석성이 낮다.
Formula: named window의 variance.
Required data: recent N rankable records.
DNF/+2 policy: DNF 별도, PLUS_TWO 반영.
Time boundary: recent N.
Performance cost: bounded aggregate.
Potential misleading interpretation: 숫자 크기를 실력이나 품질 점수로 오해하기 쉽다.
V2.2 recommendation: NOT NOW.
```

## Profile metric 평가

### Profile PB

```text
Metric: Profile PB
User question: 이 사용자를 대표하는 현재 Practice PB는 무엇인가?
Value: 기존 Ranking과 일관된 identity signal이다.
Formula: Current PB와 동일.
Required data: user_pbs와 Record.
DNF/+2 policy: Current PB와 동일.
Time boundary: current retained records.
Performance cost: 작은 unique lookup.
Potential misleading interpretation: verified 또는 WCA official result처럼 보일 수 있다.
V2.2 recommendation: MUST in private My Growth. 신규 public Profile은 만들지 않고 기존 Ranking 노출만 유지한다.
```

### Profile best Ao5/Ao12

```text
Metric: Profile best Ao5/Ao12
User question: single이 아닌 대표 best rolling performance는 무엇인가?
Value: public/private 대표 성과 후보다.
Formula: Best Ao5/Ao12와 동일.
Required data: 전체 ordered history.
DNF/+2 policy: 공통 Ao contract.
Time boundary: current retained history.
Performance cost: O(N) request scan 또는 future projection.
Potential misleading interpretation: official average나 current form으로 오해할 수 있다.
V2.2 recommendation: SHOULD, MVP public Profile에서는 제외한다.
```

### Profile total solves

```text
Metric: Profile total solves
User question: 이 event의 저장 활동량은 얼마인가?
Value: 장기 참여를 보여 준다.
Formula: Event total solves와 동일.
Required data: user/event Record count.
DNF/+2 policy: 둘 다 포함.
Time boundary: current retained history.
Performance cost: index count.
Potential misleading interpretation: 연습량 공개는 privacy와 비교 압박을 만든다.
V2.2 recommendation: MUST private, public에는 노출하지 않는다.
```

### Profile activity period

```text
Metric: Profile activity period
User question: 언제부터 언제까지 기록 활동을 했는가?
Value: 장기 이력의 context다.
Formula: first/latest current retained Record created_at.
Required data: min/max created_at.
DNF/+2 policy: 둘 다 포함.
Time boundary: UTC instant, KST 표시.
Performance cost: index endpoints.
Potential misleading interpretation: 가입일·전체 큐빙 경력과 다르며 공개 시 privacy 문제가 있다.
V2.2 recommendation: MUST private, public에는 노출하지 않는다.
```

### Event-specific summary

```text
Metric: Event-specific Growth summary
User question: 선택 event에서 내 current 성과와 활동은 무엇인가?
Value: 서로 다른 result kind와 event 기록을 섞는 오류를 막는다.
Formula: 모든 하위 metric에 eventType predicate를 적용한다.
Required data: event_type dimension과 Practice capability.
DNF/+2 policy: 각 하위 metric contract.
Time boundary: 각 하위 metric contract.
Performance cost: composite index의 user/event prefix를 사용한다.
Potential misleading interpretation: 지원하지 않는 event에 empty profile을 보여 줄 수 있다.
V2.2 recommendation: MUST. WCA_333 외 요청은 400으로 거절한다.
```

### Recent improvement

```text
Metric: Profile recent improvement
User question: 최근 완료 7일이 그 전 7일보다 빨라졌는가?
Value: Profile 첫 화면에서 성장 방향을 요약한다.
Formula: canonical improvementPercent와 direction.
Required data: 두 period median과 sample metadata.
DNF/+2 policy: period comparison contract.
Time boundary: 완료 calendar period, Asia/Seoul.
Performance cost: 14-day range aggregate.
Potential misleading interpretation: 인과·장기 추세·유의성을 뜻하지 않는다.
V2.2 recommendation: MUST private. 작은 표본이면 결과 대신 부족 이유를 표시한다.
```

### Current Practice activity

```text
Metric: Profile current Practice activity
User question: 최근에 얼마나 자주, 얼마나 많이 기록했는가?
Value: performance만 보지 않고 Practice 행동을 함께 이해한다.
Formula: 7/30-day counts, 30-day active days와 daily series 조합.
Required data: created_at와 event_type.
DNF/+2 policy: 모두 activity count에 포함.
Time boundary: 오늘 포함 Asia/Seoul calendar date.
Performance cost: 30-day indexed range aggregate.
Potential misleading interpretation: 저장된 Record만 관찰하며 실제 전체 연습량은 아니다.
V2.2 recommendation: MUST private. public에는 노출하지 않는다.
```

## PB progression canonical interpretation

V2.2 PB progression은 별도 snapshot/event table 없이 current Record history에서 재구성한다.

```text
canonical records ordered by created_at ASC, id ASC
→ DNF 제외
→ effective time 계산
→ first rankable Record emit
→ previous running minimum보다 strictly lower면 emit
```

Progression response point는 다음 field를 사용한다.

- `recordId`
- `timeMs`
- `penalty`
- `effectiveTimeMs`
- `createdAt`

`eventType`은 response root에 한 번 둔다. Endpoint가 한 event만 반환하므로 point마다 복제하지 않는다.

Penalty가 나중에 PATCH되면 current penalty로 전체 progression을 다시 계산한다. DNF로 바뀐 Record는 point에서 사라질 수 있고 PLUS_TWO 변경은 이후 running minimum까지 바꿀 수 있다. Record가 삭제되면 그 point와 downstream progression도 달라질 수 있다. 이 behavior는 current PB 재계산과 일치한다.

따라서 V2.2는 다음을 하지 않는다.

- PB snapshot/event table 추가
- 당시 penalty 상태나 삭제된 Record 복원 주장
- `user_pbs` row history를 progression으로 오해
- Redis ranking에 Growth history 저장

Immutable history가 필요해지면 audit/event lifecycle, correction 표시, retention을 별도 설계한다.

## V2.2 MVP metric units

1. `Current performance`: Current PB + Recent Ao5 + Recent Ao12
2. `Performance direction`: 완료 최근 7일 median vs 직전 7일 + 30-day daily median
3. `Recent consistency`: latest 12 IQR + DNF/+2 count vs previous 12
4. `PB progression`: current canonical PB step history
5. `Practice activity`: 7/30-day count, active days, daily count, total, first/latest
6. `Next Practice`: Recent Ao12가 있으면 그 값 이하의 다음 Ao12, 없으면 다음 Ao5 또는 첫 5 solves를 deterministic CTA로 제시

Next Practice CTA는 coaching·prediction이 아니다. 새 metric을 만들지 않고 이미 계산한 current window를 다음 행동 문구로 연결한다.

## 명시적 비범위

- all-event combined Growth score
- generic `averageTimeMs`를 V2.2 canonical metric으로 승격
- Session, streak notification, Daily Challenge
- Verified/Competition/WCA Official result 혼합
- `occurred_at`, import/export, offline queue
- user timezone setting
- public activity timestamp·solve count·detailed trend
- Growth용 Redis, snapshot table, materialized analytics platform
