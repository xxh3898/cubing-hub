---
doc_type: quality
status: draft
created: 2026-08-16
updated: 2026-08-16
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/growth-metrics.md
  - docs/02-requirements/features/growth.md
  - docs/02-requirements/features/profile.md
  - docs/03-architecture/growth-architecture.md
  - docs/06-quality/acceptance-criteria.md
  - docs/06-quality/performance/growth-read-api-10k-mysql-8-4.md
  - homeserver/docs/release-smoke-runbook.md
---
# V2.2 Growth & Profile Release Evidence

## Candidate

| Item | Evidence |
| --- | --- |
| Candidate SHA | `7ca9c7f47e0af4f77efc975cb8876d959264d770` |
| Integration branch | `dev` |
| Current backend tree | `f10f92d9d726389daeb783300a056162091e6f09` |
| Current frontend tree | `2d5e127b05d153333b64848bcae0aa8be9f14c0b` |
| Current dev Validate | [31933736295](https://github.com/xxh3898/cubing-hub/actions/runs/31933736295), success |

이 문서는 `dev` release candidate의 검증 근거다. `main` merge, release, production deploy 또는 production runtime 적용을 뜻하지 않는다.

## Integrated Scope

| Scope | Integrated evidence |
| --- | --- |
| Growth contract and calculator | PR #25 merge `1522a24036fdc848e701c7ef410cf4659b9f4ae7` |
| Growth read API and query | PR #26 merge `ca8df07bd42c80e384a0256fa0104e55a668f868` |
| My Growth dashboard | PR #41 merge `9e9ae385c2667ed443727871c9428bd41b14f2de` |
| Pending solve ownership | PR #42 merge `d760aac9e27fd3a096149b722dc21133ef414bc0` |
| Profile/Home consumer transition | PR #43 merge `ba786fe70994c1daa6e14fb7f5ccec652ed41563` |
| Contribution templates | PR #44 merge `46d6284a9d865a7a8bf5fb202ac1210739d842ca`; release-supporting process change, V2.2 product scope 아님 |
| API container health contract | PR #46 merge `affe3852a00f0b4c0d476d503258dcd73363f666`; isolated smoke blocker 해소 |
| Growth median terminology | PR #48 merge `7ca9c7f47e0af4f77efc975cb8876d959264d770`; user-facing median 표현을 `중앙값`으로 통일 |

Frontend runtime source에는 `TREND_FETCH_SIZE`, `recentRecordsSource`, `buildFirstPageFromRecentRecords`, `RecordTrendTooltip`, `전체 평균`, `DNF 제외 평균 기록` consumer가 없다. `HomePage.test.jsx`의 두 한글 문자열은 legacy 카드 비노출 regression assertion으로만 남아 있다.

## Metric Correctness

현재 backend tree는 PR #46 merge candidate의 dev Validate [31926263963](https://github.com/xxh3898/cubing-hub/actions/runs/31926263963)에서 Java 25 backend test와 build를 실제 실행해 통과했다. PR #48은 frontend와 문서만 변경했으며 candidate backend tree는 해당 validated tree와 같다.

| Contract | Executable evidence |
| --- | --- |
| `NONE`, `PLUS_TWO`, `DNF` effective result | `GrowthMetricCalculatorTest.should_apply_canonical_effective_result_when_penalty_is_none_plus_two_or_dnf` |
| Ao5/Ao12, one/two DNF, rounding and tie | `GrowthMetricCalculatorTest` Ao fixture tests |
| median, sample status and period direction | `GrowthMetricCalculatorTest` median and comparison tests |
| IQR, DNF/+2 counts and direction | `GrowthMetricCalculatorTest` consistency tests |
| Asia/Seoul activity and completed comparison windows | `GrowthTimeWindowsTest` |
| missing day, DNF-only day and `todayPartial` | `GrowthReadApiIntegrationTest.should_return_fixed_trend_points_when_days_are_missing_or_dnf_only` |
| KST UTC boundary and PLUS_TWO daily median | `GrowthReadApiIntegrationTest.should_calculate_daily_median_with_kst_boundary_and_plus_two_in_mysql` |
| PB tie, PLUS_TWO, DNF exclusion and stable ordering | `GrowthMetricCalculatorTest` PB progression fixtures and `GrowthReadApiIntegrationTest.should_return_descending_pb_points_when_records_share_timestamp_and_tie` |
| penalty/delete current-state rebuild | `GrowthReadApiIntegrationTest.should_recalculate_pb_progression_after_penalty_update_and_delete` |

Calculator, time-window, service, repository, API integration과 REST Docs test가 같은 backend gate에서 실행됐다. [Growth Metrics](../01-domain/growth-metrics.md)와 다른 metric contract는 발견되지 않았다.

## API / Privacy

Private owner endpoint는 다음과 같다.

- `GET /api/users/me/growth`
- `GET /api/users/me/growth/trend`
- `GET /api/users/me/growth/pb-progression`

`GrowthController`는 authenticated principal에서 owner를 결정한다. `GrowthReadService`는 current Practice capability만 허용하고 known unsupported event를 거절한다. Trend는 `30D`, recent Record는 24개, PB progression은 request당 최대 100개로 제한한다. Current frontend는 PB progression을 page 1, size 50으로 요청한다.

`GrowthReadApiIntegrationTest`는 owner-authenticated success, unsupported event와 period 400, unauthenticated 401, fixed 30-point trend와 bounded PB page를 검증한다. `GrowthDocsTest`는 current DTO에서 summary, trend와 progression REST Docs를 생성하며 available, empty, insufficient, DNF, authentication과 capability state를 다룬다.

세 Growth response DTO는 aggregate value와 최소 PB milestone field만 노출한다. DTO, service mapping과 REST Docs에는 다음 값이 없다.

- scramble
- email or password
- access token, refresh token or JWT
- `clientSubmissionId` or `clientSubmissionHash`
- `inputMethod`
- full Record entity or raw Record history

`GrowthReadApiIntegrationTest`도 summary payload에 `scramble`과 `inputMethod`가 없음을 검증한다.

## Query / Performance

Current query path는 MySQL 8.4.11 evidence를 기록한 commit `4eb6556b6ab09e9ef008a2a94e3f4217d6482cdc`와 같다.

- `GrowthReadRepository.java`: unchanged
- relevant Record entity mapping: unchanged
- `V3__add_record_foundation_fields.sql` index: unchanged
- no Flyway migration after V3
- current smoke and production repository target: MySQL 8.4.11

따라서 기존 isolated 10,000-record evidence를 재사용한다. 이 수치는 local query-plan snapshot이며 production latency나 capacity evidence가 아니다.

| Query | MySQL 8.4.11 evidence | Access path |
| --- | ---: | --- |
| latest 24 | 0.473ms | reverse lookup on `idx_record_user_event_created_at_id`, 24 rows |
| 30-day trend | 19.9ms | same index range scan, 10,000 rows |
| PB progression | 16.7ms | same index lookup and window materialization, 10,000 rows |

동일 backend tree를 검증한 run 31926263963의 backend gate도 exact MySQL 8.4.11에서 `GrowthQueryPlanIntegrationTest`를 실행했다.

## Frontend State Matrix

Current frontend tree `2d5e127b05d153333b64848bcae0aa8be9f14c0b`는 exact candidate dev push run [31933736295](https://github.com/xxh3898/cubing-hub/actions/runs/31933736295)이 검증했다. 해당 run은 Node.js 20 lint, full Vitest와 production build를 실제 실행하고 Web ARM64 verification image를 빌드했다.

`MyPage.test.jsx` covers:

- zero solves with Timer CTA
- 1 and 4 solve stages with remaining Ao5 count
- 5 and 11 solve stages with Ao5 state and remaining Ao12 count
- 12+ full dashboard
- numeric, insufficient and DNF-only metric states
- independent summary/trend/PB loading and error states
- summary pending while trend succeeds
- PB lazy load, bounded next-page load and stale-response rejection
- recordless day, DNF-only day and backend-declared `todayPartial`
- inclusive display of the exclusive period end
- Profile, password, Record history, penalty and delete regressions

Record History starts with server pagination `page=1,size=10`; the removed 100-record client source is not requested.

## Mutation Parity

Backend integration evidence는 penalty mutation과 delete 뒤 current retained Record state에서 PB progression을 다시 만들고 newest progression point가 current `user_pbs` PB와 일치함을 검증한다.

Frontend regression evidence는 successful penalty와 delete operation이 다음 lifecycle을 독립적으로 시작함을 검증한다.

- Growth summary refresh
- Growth trend refresh
- PB progression page 1 rebuild
- current Record History page refresh

Record mutation은 Profile/account를 refetch하지 않는다. Record History refresh failure는 이미 시작한 Growth invalidation을 취소하지 않으며 stale PB load-more response는 rebuilt dataset에 append되지 않는다.

## Accessibility

Static markup과 component regression에서 다음 automated evidence를 확인했다.

- numeric and DNF-only trend data retain a `<details>` text timeline
- staged Activity charts retain a daily text representation with solve, DNF, +2 and partial-day state
- PB step chart retains an ordered text timeline using the same chronological presentation data
- Timer CTAs are native buttons
- Record History actions use labelled native controls
- essential chart states are not available only through tooltip or color

Responsive CSS에는 mobile breakpoint와 bounded chart container가 있다. Actual Chrome 390×844 rendering과 touch emulation 결과는 아래 manual/mobile evidence에 기록한다.

## Auth Regression

Current frontend tree에는 다음 PR #42 ownership guard와 regression test가 있다.

- same-account temporary auth failure preserving the pending solve
- confirmed different-account login clearing the previous owner pending solve
- same-account re-login recovery
- explicit session clear immediately cleaning the confirmed owner pending solve

이 test는 run 31933736295의 full frontend gate에 포함됐다.

## Isolated Runtime Smoke

Release smoke는 candidate `7ca9c7f47e0af4f77efc975cb8876d959264d770`에서 고정 project `cubing-hub-smoke`로 실행했다. Production Compose, data, volume, network, `.env`, domain과 runtime configuration은 사용하지 않았다. 기존 smoke MySQL과 post image volume을 유지해 QA 계정과 Record fixture를 보존했다.

Commands:

```bash
homeserver/scripts/smoke-v2-1.sh up
homeserver/scripts/smoke-v2-1.sh status
homeserver/scripts/smoke-v2-1.sh flyway
homeserver/scripts/smoke-v2-1.sh down
```

Results:

| Gate | Result |
| --- | --- |
| `docker compose up --wait` | PASS |
| MySQL | 8.4.11, healthy |
| Redis | healthy |
| API | healthy |
| Web | healthy |
| Mailpit | healthy |
| API runtime probe | `curl 7.81.0`, linux/arm64 |
| API loopback Actuator | `status=UP` |
| Web same-origin Actuator | `status=UP` |
| Flyway | V1, V2, V3 success |
| Cleanup | normal `down`; no smoke containers remained, volumes retained by runbook contract |

이 candidate에서는 기존 `wget: not found` API healthcheck blocker가 해소됐다. Repository production Compose도 같은 API direct readiness contract를 정의하지만 production container에 적용됐다는 의미는 아니다.

## Manual Browser Smoke

`MANUAL_BROWSER_SMOKE=PASS`.

실제 Google Chrome과 smoke-only QA account `qa-v22@smoke.localhost`를 사용했다. Production credential, SMTP, account와 data는 사용하지 않았다.

| Flow | Evidence |
| --- | --- |
| Keyboard Timer → Growth | 12.168 Record 저장, `inputMethod=KEYBOARD`; History, Growth summary와 PB progression 갱신 PASS |
| Touch emulation → Growth | Chrome 390×844 Device Toolbar에서 16.000 Record 저장, `inputMethod=TOUCH`; History와 Growth 갱신 PASS |
| Penalty | 20.818 Record `NONE → PLUS_TWO → DNF → NONE`; 각 단계 History와 Growth refresh PASS |
| Delete | Record 66, 12.168 삭제; Current PB와 PB progression final point가 16.000으로 재계산되고 stale 12.168 제거 PASS |
| Pagination | 삭제 뒤 Record History page 2와 page 5 이동 PASS |
| Console and network | application console error 0, failed request 0; 관련 save, Growth, mutation, delete와 pagination request HTTP 200 |

PR #48 median terminology delta는 exact candidate를 smoke에 다시 빌드한 뒤 My Growth에서 별도로 확인했다. `완료된 7일 구간의 중앙값`, `날짜별 중앙값`, `최근 30일 중앙값 그래프`, `중앙값이 있는 날`과 text timeline의 `중앙값 28.994`가 렌더링됐고 user-facing `중앙 기록` 또는 단독 `중앙 {기록}` 표현은 남지 않았다.

## Mobile

`MOBILE_390_SMOKE=PASS` and `ACTUAL_IPHONE_SMOKE=NOT_RUN`.

Chrome Device Toolbar 390×844에서 My Growth, Home, Timer, Ranking, Learning, Community, Q&A, Feedback와 Account modal을 확인했다. Measured `scrollWidth`는 route마다 390px였고 Growth cards, trend/PB chart, text alternatives, Record History action과 mobile navigation에 horizontal overflow나 clipping이 없었다. Touch emulation save도 이 viewport에서 완료했다.

PR #48 delta 확인에서도 `중앙값` heading, description, chart alternative와 summary copy가 정상 wrap됐고 layout regression은 없었다. Actual iPhone은 실행하지 않았으며 이 limitation을 Chrome responsive/touch emulation evidence와 구분한다. Tailscale Serve와 production ingress는 변경하지 않았다.

## CI Provenance

| Evidence | Candidate relationship | Result |
| --- | --- | --- |
| dev Validate 31933736295 | exact candidate SHA | Detect, infrastructure, frontend lint/full Vitest/build and Web ARM64 actually ran and succeeded; backend and API ARM64 safe-skipped |
| dev Validate 31926263963 | identical backend tree and API image inputs | backend test/build and API ARM64 actually ran and succeeded |

PR E CI는 evidence branch의 Draft PR이 열린 뒤 별도로 기록한다. Docs-only PR green 결과는 위 candidate application evidence를 대체하지 않는다.

## Known Limitations

- Actual iPhone smoke was not run. Chrome 390×844 responsive and touch emulation passed; the physical-device gap is not a release blocker.
- Non-blocking QA findings remain: the 390px account card is tall, a populated PB timeline is long, and some English/Korean, `Asia/Seoul` and solve terminology is mixed. PR #48 resolves only the median terminology finding.
- The MySQL 8.4.11 performance numbers are an isolated query-plan snapshot, not production latency.
- Issue #45 remains open because the fix is on `dev`, not the default branch. It was not manually closed.
- Repository production healthcheck configuration is not evidence of currently deployed production state.

## Release Decision

| Gate | Decision |
| --- | --- |
| Metric correctness | PASS |
| API contract | PASS |
| Privacy | PASS |
| Query performance | PASS |
| Frontend state matrix | PASS |
| Accessibility | PASS |
| Mutation parity | PASS |
| Auth regression | PASS |
| Automated CI | PASS |
| Isolated runtime smoke | PASS |
| Manual browser smoke | PASS |
| Mobile 390px smoke | PASS |
| Actual iPhone smoke | NOT_RUN |
| Migration | NONE |

Release decision: **V2.2 release gates complete on dev candidate**. Actual iPhone smoke는 실행하지 않은 known limitation이며 release blocker가 아니다. 이 결정은 `main` merge, release, production deploy 또는 production verification을 뜻하지 않는다.
