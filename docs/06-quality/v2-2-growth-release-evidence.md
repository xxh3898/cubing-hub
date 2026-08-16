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

`KST_BOUNDARY=PASS`. `GrowthTimeWindowsTest`와 `GrowthReadApiIntegrationTest`의 fixed clock fixture가 Asia/Seoul↔UTC conversion, completed recent/previous 7-day window, KST calendar boundary와 `todayPartial`을 deterministic하게 검증한다. System clock 또는 wall-clock browser 조작은 이 gate에 필요하지 않다.

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

`frontend-design-system.md`의 My Growth Desktop/Mobile Target Mockup approval과 1440×900 target screenshot, 200% zoom, contrast, reduced-motion focused check는 approved Target Mockup 기반 screen-migration PR gate다. V2.2 My Growth는 기존 canonical UI를 유지한 기능 implementation이므로 `TARGET_MOCKUP_APPROVAL=NOT_APPLICABLE`이며 screen-migration 전용 accessibility gate도 적용하지 않는다. Growth release의 accessibility evidence는 Growth requirement/architecture, quality gate, ADR-0010, component regression과 actual browser/mobile smoke를 따른다.

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

Growth Architecture의 manual release smoke 1~6은 다음 candidate evidence에 각각 대응한다.

| # | Manual release smoke | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Keyboard/touch WCA_333 save → Growth 반영 | PASS | Chrome keyboard 12.168 (`KEYBOARD`), touch 16.000 (`TOUCH`) 저장 뒤 History, Growth summary와 PB progression 갱신 |
| 2 | Timer recent Ao ↔ Growth recent Ao parity | PASS | 같은 로그인 상태에서 Timer/Growth Ao5 `18.321`, Ao12 `19.570` exact match |
| 3 | Penalty `NONE → PLUS_TWO → DNF`와 refresh | PASS | 20.818 Record를 `NONE → PLUS_TWO → DNF → NONE`으로 변경하며 History와 Growth refresh 확인 |
| 4 | Record delete와 PB/progression parity | PASS | Record 66(12.168) 삭제 뒤 Current PB와 progression final point가 16.000으로 일치하고 stale point 제거 |
| 5 | Empty/insufficient user와 30-day gap | PASS | 0 Record에서 empty/첫 Practice CTA, 1 Record(25.000)에서 첫 Ao5까지 4회 및 numeric Ao 미표시; 2026-07-18은 `기록 없음 · solve 0회`이며 fake median 없음 |
| 6 | 390px My Growth → Timer → My Growth | PASS | 390×844 touch emulation으로 CTA 이동, Record 69(9.337, `TOUCH`) 저장, History/Growth/PB progression refresh; `innerWidth=390`, `scrollWidth=390` |

Growth-specific smoke와 별도로 release smoke runbook의 general browser checklist를 다음과 같이 실행했다.

| Smoke Runbook item | Result | Evidence |
| --- | --- | --- |
| Auth/Timer 1 — login/logout | PASS | authenticated logout 뒤 private state 비노출, guest 상태 확인과 smoke account 재로그인 복구 |
| Auth/Timer 2-3 — Keyboard/Touch | PASS | 12.168 `KEYBOARD`, 16.000과 9.337 `TOUCH`; stopped display/raw time과 provenance 일치 |
| Auth/Timer 4 — next-scramble locking | PASS | next WCA_333 scramble 지연 중 Timer lock; unsupported event 왕복 중 이전 response 무시; fresh WCA_333 commit 뒤 unlock |
| Auth/Timer 5 — penalty/delete/Ao | PASS | penalty/delete/PB evidence와 Timer/Growth Ao5 18.321, Ao12 19.570 exact parity |
| Pending 1-2 — response loss/reload | PASS | Record create 201 뒤 response abort; 16.081 snapshot과 Retry/Discard 복구; reload 자동 Record POST 0 |
| Pending 3 — idempotent Retry | PASS | Retry 201 뒤 pending 제거, DB의 16.081 Record 1건 |
| Pending 4 — canonical penalty convergence | PASS | 0.722 response loss 뒤 second tab에서 PLUS_TWO 변경; Retry가 2.722 canonical 상태로 수렴하고 DB Record 1건 유지 |
| Pending 5 — invalid JSON/Discard | PASS | owner pending key invalid JSON reload 시 Timer lock과 Discard-only UI; explicit Discard 뒤 unlock |
| Pending 6 — account isolation | PASS | A의 0.882 pending 뒤 B login; B Timer에 A time, Retry와 Discard 비노출 |
| Pending 7 — Record 401/refresh failure | PASS | A의 1.053 pending 보존; unauth Retry의 guest/API 저장 0; A 재로그인 Retry 201 뒤 DB Record 1건 |
| Pending 8 — stale history | PASS | WCA_333 Ao5 05.974 history 지연 뒤 WCA_222 전환; late response 후 unsupported state와 Ao dash 유지 |
| Guest — save/reload/penalty/delete | PASS | guest 1.181 save와 reload, 3.181 PLUS_TWO, DNF, UI confirm delete와 reload 후 재등장 없음; Ao5/Ao12 dash와 pagination 정상 |
| Guest — legacy/max 100 | PASS | `inputMethod` 없는 legacy 101건에서 UI penalty mutation 뒤 100건, first `inputMethod=UNKNOWN`, overflow item 제거 |

Failure-path 검증을 위한 response abort, synthetic Record 401과 refresh `InternetDisconnected`는 의도한 trigger다. Guest reload의 `/api/auth/refresh` 400은 refresh cookie가 없는 비로그인 bootstrap의 정상 contract다. 이 항목들을 제외한 Chrome application console error, unexpected 4xx/5xx와 failed request는 0건이었고 duplicate Record도 없었다. Growth Architecture manual 1~6과 general release smoke runbook의 pre-main manual/runtime 항목은 모두 explicit PASS evidence를 가진다.

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

Candidate/dev application CI는 PASS다. PR E docs-only branch Validate는 PR quality gate이며 위 candidate application evidence를 대체하지 않는다. Final release CI gate인 `dev → main` PR Validate는 아직 PR이 열리지 않아 PENDING이다.

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
| Candidate/dev CI | PASS |
| Final `dev → main` PR Validate | PENDING |
| Isolated runtime smoke | PASS |
| Manual browser smoke | PASS |
| Mobile 390px smoke | PASS |
| KST boundary deterministic test | PASS |
| Actual iPhone smoke | NOT_RUN |
| Migration | NONE |

Release decision: **PRE-MAIN RELEASE GATES COMPLETE**. V2.2 application과 evidence는 dev candidate에서 release-ready하다. Final `dev → main` PR Validate는 PENDING이며 PR #47 merge 후 별도 release 단계에서 성공해야 한다. 이후 main merge 승인, release/deploy 승인과 production verification도 남아 있다. Actual iPhone smoke는 실행하지 않은 known limitation이며 pre-main blocker가 아니다.
