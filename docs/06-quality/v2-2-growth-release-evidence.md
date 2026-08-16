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
| Candidate SHA | `affe3852a00f0b4c0d476d503258dcd73363f666` |
| Integration branch | `dev` |
| Current backend tree | `f10f92d9d726389daeb783300a056162091e6f09` |
| Current frontend tree | `afa61956d7687c092f17dc86187bf44dd6612ad2` |
| Current dev Validate | [31926263963](https://github.com/xxh3898/cubing-hub/actions/runs/31926263963), success |

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

Frontend runtime source에는 `TREND_FETCH_SIZE`, `recentRecordsSource`, `buildFirstPageFromRecentRecords`, `RecordTrendTooltip`, `전체 평균`, `DNF 제외 평균 기록` consumer가 없다. `HomePage.test.jsx`의 두 한글 문자열은 legacy 카드 비노출 regression assertion으로만 남아 있다.

## Metric Correctness

현재 backend tree는 candidate Validate 31926263963에서 Java 25 backend test와 build를 실제 실행해 통과했다.

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

Candidate Validate 31926263963의 backend gate도 exact MySQL 8.4.11에서 `GrowthQueryPlanIntegrationTest`를 실행했다.

## Frontend State Matrix

Current frontend tree `afa61956d7687c092f17dc86187bf44dd6612ad2`는 dev push run [31922609953](https://github.com/xxh3898/cubing-hub/actions/runs/31922609953)이 검증한 tree와 같다. 해당 run은 Node.js 20 lint, Vitest 37 files·509 tests와 production build를 실제 실행했다.

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

Responsive CSS에는 mobile breakpoint와 bounded chart container가 있다. Actual browser 390px rendering은 manual gate로 남는다.

## Auth Regression

Current frontend tree에는 다음 PR #42 ownership guard와 regression test가 있다.

- same-account temporary auth failure preserving the pending solve
- confirmed different-account login clearing the previous owner pending solve
- same-account re-login recovery
- explicit session clear immediately cleaning the confirmed owner pending solve

이 test는 run 31922609953의 509-test frontend gate에 포함됐다.

## Isolated Runtime Smoke

Release smoke는 candidate `affe3852a00f0b4c0d476d503258dcd73363f666`에서 고정 project `cubing-hub-smoke`로 실행했다. Production Compose, data, volume, network, `.env`, domain과 runtime configuration은 사용하지 않았다.

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
| API runtime probe | `curl 7.81.0`, linux/arm64 |
| API loopback Actuator | `status=UP` |
| Web same-origin Actuator | `status=UP` |
| Flyway | V1, V2, V3 success |
| Cleanup | normal `down`; no smoke containers remained, volumes retained by runbook contract |

이 candidate에서는 기존 `wget: not found` API healthcheck blocker가 해소됐다. Repository production Compose도 같은 API direct readiness contract를 정의하지만 production container에 적용됐다는 의미는 아니다.

## Manual Browser Smoke

`MANUAL_BROWSER_SMOKE=PENDING`.

실행 환경에 연결 가능한 browser target이 없었다. Keyboard save, touch-emulated save, penalty transition, delete와 Growth UI parity는 실행하지 않았으며 PASS로 기록하지 않는다.

Isolated smoke environment에서 남은 최소 checklist는 다음과 같다.

1. Login, save a Keyboard solve, open My Growth and verify current metrics.
2. Save a Touch solve and verify `inputMethod=TOUCH` and Growth refresh.
3. Apply `NONE → PLUS_TWO → DNF` and verify summary, trend and PB progression.
4. Delete the Record and verify current PB, progression and History parity.
5. Verify empty, insufficient and DNF-only presentation with isolated accounts or fixtures.

## Mobile

`MOBILE_LAYOUT_SMOKE=PENDING` and `ACTUAL_IPHONE_SMOKE=PENDING`.

Responsive browser target이 없어 390px overflow, chart clipping, text timeline, PB pagination, Record control과 Timer CTA를 responsive mode에서 확인하지 못했다. Tailscale Serve와 production ingress는 변경하지 않았다.

## CI Provenance

| Evidence | Candidate relationship | Result |
| --- | --- | --- |
| dev Validate 31926263963 | exact candidate SHA | Detect, backend, infrastructure and API ARM64 actually ran and succeeded; frontend and Web ARM64 safe-skipped |
| dev Validate 31922609953 | identical frontend tree, frontend Dockerfile, `.dockerignore` and Web inputs | frontend lint, 509 Vitest tests, build and Web ARM64 actually ran and succeeded |

PR E CI는 evidence branch의 Draft PR이 열린 뒤 별도로 기록한다. Docs-only PR green 결과는 위 candidate application evidence를 대체하지 않는다.

## Known Limitations

- Manual browser smoke is pending.
- 390px responsive and actual iPhone smoke are pending.
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
| Accessibility | PASS for automated/static contract; manual responsive confirmation PENDING |
| Mutation parity | PASS |
| Auth regression | PASS |
| Automated CI | PASS |
| Isolated runtime smoke | PASS |
| Manual browser smoke | PENDING |
| Mobile smoke | PENDING |
| Migration | NONE |

Release decision: **MANUAL SMOKE REQUIRED**. Manual browser와 mobile evidence를 추가하기 전에는 V2.2 release gate 완료로 취급하지 않는다.
