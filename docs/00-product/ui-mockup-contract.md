---
doc_type: product
status: active
created: 2026-08-11
updated: 2026-08-16
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/ui-visual-direction.md
  - docs/00-product/vision.md
  - docs/00-product/prd.md
  - docs/00-product/roadmap.md
  - docs/01-domain/growth-metrics.md
  - docs/02-requirements/features/timer.md
  - docs/02-requirements/features/growth.md
  - docs/02-requirements/features/profile.md
  - docs/03-architecture/frontend-architecture.md
  - docs/03-architecture/frontend-design-system.md
  - docs/03-architecture/growth-architecture.md
  - docs/08-decisions/adr-0010-current-record-growth-read-contract.md
---
# UI Mockup Screen Contract

## Status and responsibility

이 문서는 Cubing Hub UI mockup 생성 입력의 Source of Truth다. 실제 구현 범위를 늘리지 않으면서 화면에 넣을 수 있는 capability, 공통 Master Prompt, 화면별 prompt, 생성 순서와 target 승인·저장 규칙을 관리한다.

모든 UI mockup은 다음 네 입력만 조합한다.

```text
Repository current capability
+
승인된 redesign-only UI behavior
+
명시적으로 지정된 future target
+
approved visual language
```

`active`는 이 분류·생성·승인 절차를 현재 mockup 작업에 적용한다는 뜻이다. 문서나 future proposal이 있다는 이유만으로 capability를 `CURRENT`로 승격하지 않으며, 현재 `dev`의 route, component, API와 executable test evidence를 대조해 분류한다. [UI Visual Direction](ui-visual-direction.md)은 visual intent, [Frontend Design System](../03-architecture/frontend-design-system.md)은 implementation architecture, 이 문서는 screen capability와 image-generation input을 담당한다.

## Capability classification

| Classification | 의미 | Current-safe mockup | V2.2 target mockup |
| --- | --- | --- | --- |
| `CURRENT` | 현재 `dev`의 실행 가능한 code·test·API에서 실제 제공하는 기능 | 사용 가능 | 해당 target에 필요한 current shell·기능만 사용 가능 |
| `REDESIGN-APPROVED` | 새 backend/domain capability를 만들지 않는 승인된 presentation·interaction behavior | 지정된 화면에서만 사용 가능 | 지정된 화면에서만 사용 가능 |
| `V2.2 TARGET PRESENTATION` | My Growth의 current capability를 future screen migration에서 재배치하는 visual target. capability 추가 권한이 아님 | current-safe mockup label로 사용하지 않음 | `CURRENT`와 해당 화면의 `REDESIGN-APPROVED` capability만 사용 가능 |
| `FUTURE / OUT` | future 후보이거나 승인·근거가 없는 기능 | 사용 금지 | 명시적인 별도 target 승인 전까지 사용 금지 |

분류는 기능 이름이 아니라 화면에 실제로 제공할 수 있는 data와 behavior를 기준으로 한다. enum, draft, repository field 또는 미래 아이디어가 존재한다는 사실만으로 `CURRENT`가 되지 않는다.

### 현재 승인된 redesign-only behavior

| Screen | Behavior | Boundary |
| --- | --- | --- |
| Timer | focus mode와 명시적인 exit | 브라우저 Fullscreen API나 별도 Timer state를 자동 결정하지 않는다. |
| Timer | cube visualization 표시 toggle | 기존 VisualCube를 표시하거나 숨기는 presentation control이다. |
| Timer | cube visualization default hidden | persistence 방식은 구현 설계에서 정하며 localStorage 계약을 여기서 확정하지 않는다. |
| Shared shell | mockup brand text `Cubing Hub` | application의 기존 text를 이번 문서 작업에서 변경하지 않는다. |

## Repository evidence rule

Current capability는 가능한 경우 다음 흐름을 끝까지 대조한다.

```text
frontend route
→ frontend component
→ frontend API client
→ backend controller
→ service
→ repository
→ REST Docs test
→ integration test
→ Flyway
→ active requirement / accepted ADR
```

문서와 executable current source가 충돌하면 code, test, migration, workflow를 우선한다. API request·response의 전체 필드 계약은 generated [REST Docs index](../../backend/src/docs/asciidoc/index.adoc)를 사용하며 이 문서에 복제하지 않는다. UI가 사용하지 않는 API field는 `CURRENT data-only`로 표시하고 화면 노출을 자동 승인하지 않는다.

### Current route inventory

| Screen | Route | Access | Current source |
| --- | --- | --- | --- |
| Home | `/` | Public, auth-aware | `frontend/src/App.jsx`, `frontend/src/pages/HomePage.jsx` |
| Timer | `/timer` | Public, auth-aware | `frontend/src/pages/TimerPage.jsx`, `frontend/src/hooks/useCubeTimer.js` |
| Rankings | `/rankings` | Public, auth-aware | `frontend/src/pages/RankingsPage.jsx` |
| Learning | `/learning` | Public | `frontend/src/pages/LearningPage.jsx` |
| Community List | `/community` | Public | `frontend/src/pages/CommunityPage.jsx` |
| Community Detail | `/community/:id` | Public, auth-aware actions | `frontend/src/pages/CommunityDetailPage.jsx` |
| Community Write | `/community/write` | Authenticated | `frontend/src/pages/CommunityWritePage.jsx` |
| Community Edit | `/community/:id/edit` | Author or ADMIN | `frontend/src/pages/CommunityWritePage.jsx` |
| Q&A List | `/qna` | Public | `frontend/src/pages/QnaPage.jsx` |
| Q&A Detail | `/qna/:id` | Public | `frontend/src/pages/QnaDetailPage.jsx` |
| Login | `/login` | Guest-only | `frontend/src/pages/LoginPage.jsx` |
| Signup / Verification | `/signup` | Guest-only | `frontend/src/pages/SignupPage.jsx` |
| Password Reset | `/reset-password` | Public recovery | `frontend/src/pages/ResetPasswordPage.jsx` |
| MyPage / Records | `/mypage` | Authenticated | `frontend/src/pages/MyPage.jsx` |
| My Growth | `/mypage` 내 dashboard surface | Authenticated | `frontend/src/App.jsx`, `frontend/src/pages/MyPage.jsx` |
| Feedback | `/feedback` | Authenticated | `frontend/src/pages/FeedbackPage.jsx` |
| Admin | `/admin` | ADMIN | `frontend/src/pages/AdminPage.jsx` |
| Admin Feedback Detail | `/admin/feedbacks/:id` | ADMIN | `frontend/src/pages/AdminFeedbackDetailPage.jsx` |
| Admin Memo Detail | `/admin/memos/:id` | ADMIN | `frontend/src/pages/AdminMemoDetailPage.jsx` |
| Not Found | unmatched route | Public | `frontend/src/pages/NotFoundPage.jsx` |

`/auth`는 `/login` redirect이며 독립 화면이 아니다.

### Executable evidence ledger

아래 ledger는 capability inventory를 확인한 source chain의 진입점이다. 세부 field는 DTO와 REST Docs test, 정렬·권한·fallback은 service/repository와 integration test를 함께 확인한다.

| Screen group | Frontend evidence | Backend/data evidence | Test and document evidence |
| --- | --- | --- | --- |
| Home | `App.jsx`, `HomePage.jsx`, `api.js` | `HomeController.java`, `HomeService.java`, Home DTO, `RecordRepository.java`, `PostRepository.java` | `HomePage.test.jsx`, `HomeDocsTest.java`, `HomeControllerIntegrationTest.java`, active PRD/User Flows |
| Timer | `TimerPage.jsx`, `useCubeTimer.js`, keyboard/touch hooks, guest/pending storage | `ScrambleController.java`, `RecordController.java`, submission/record/scramble services and repositories, V1/V3 migration | Timer hooks/page/storage tests, Record/Scramble REST Docs and integration tests, Timer requirement, ADR-0007~0009 |
| Rankings | `RankingsPage.jsx`, `api.js` | `RankingController.java`, `RankingRedisService.java`, `UserPBRepositoryImpl.java`, `RankingRedisRepository.java`, V1 `user_pbs` | Rankings page/API tests, `RankingDocsTest.java`, `RankingControllerIntegrationTest.java`, Ranking Rules/requirement, ADR-0002/0009 |
| MyPage / Records | `MyPage.jsx`, `api.js` | `UserProfileController.java`, `UserProfileService.java`, profile/record DTO, `UserRepository.java`, `RecordRepository.java`, V1/V3 migration | MyPage tests, `UserProfileDocsTest.java`, `UserProfileIntegrationTest.java`, Profile requirement |
| My Growth | `App.jsx`, `MyPage.jsx`, `api.js`의 `getMyGrowth`/`getMyGrowthTrend`/`getMyGrowthPbProgression` | `GrowthController.java`, `GrowthReadService.java`, `GrowthReadRepository.java`, Growth response DTO, existing `records`/`user_pbs` | `MyPage.test.jsx`, `GrowthDocsTest.java`, `GrowthReadApiIntegrationTest.java`, `GrowthReadServiceTest.java`, `GrowthQueryPlanIntegrationTest.java`, Growth Metrics/requirement/architecture, ADR-0010 accepted |
| Community | Community list/detail/write pages and `api.js` | Post/Comment controllers, services, repositories, storage service, DTO, V1/V2 migration | Community page tests, Post/Comment REST Docs and integration/search tests, Community requirement |
| Q&A / Feedback | Q&A list/detail and Feedback pages, `api.js` | Public/Admin/User Feedback controllers, `FeedbackService.java`, `FeedbackRepository.java`, public/admin DTO, V1 migration | Q&A/Feedback page tests, Feedback REST Docs and three controller integration test groups, Feedback requirement |
| Learning | `LearningPage.jsx`, `mockLearning.js`, `visualCube.js` | backend 없음 | Learning page/static-data/VisualCube tests, Learning requirement |
| Auth | Login/Signup/Reset pages, auth provider/client and route guards | `AuthController.java`, `AuthService.java`, verification/reset stores, `UserRepository.java`, V1 users | Auth page/route/API tests, `AuthDocsTest.java`, `AuthControllerIntegrationTest.java`, Authentication requirement, ADR-0003 |
| Admin | Admin, Feedback Detail, Memo Detail pages and `api.js` | Admin Feedback/Memo controllers, services, repositories, DTO, V1 feedback/admin_memos | Admin page tests, management/Admin Memo REST Docs, integration/security tests, Feedback requirement |
| Not Found | `App.jsx`, `NotFoundPage.jsx` | backend 없음 | route tests |

Flyway에는 users, records, user_pbs, posts, comments, attachments, views, feedbacks, admin_memos와 record foundation field가 있다. Current Growth read capability는 existing canonical `records`와 `user_pbs`를 요청 시 계산하며 Growth 전용 snapshot/aggregate table, Redis model 또는 새 Flyway migration은 없다. Social, verification, competition, streak, session 또는 recommendation schema도 없다.

## Anti-Invention rule

이미지 생성 모델은 screen contract에서 `Allowed`로 지정한 기능만 보여 준다. 화면에 남는 공간은 여백, 정렬, divider, 읽기 폭과 responsive composition으로 해결한다.

```text
빈 공간을 기능으로 채우지 않는다.
```

대시보드처럼 보이게 하려고 streak를 만들거나, 랭킹을 풍부하게 보이게 하려고 online 상태를 만들거나, Home을 채우려고 추천을 만들거나, 통계 화면을 채우려고 활동 시간과 임의 지표를 만들지 않는다.

다음 항목은 screen contract에서 별도로 허용하지 않는 한 전역 금지다.

```text
AI coaching
AI solve analysis
연속 기록일
streak
XP
level
achievement system
training plan
estimated workout duration
estimated practice duration
personalized recommendation
friend
follower
online status
last online
country flag
국내/글로벌 필터
rank movement
social reaction
like
bookmark count
verification badge
competition badge
smart cube telemetry
Daily Challenge
Public Profile
new event type
arbitrary analytics
```

기능과 혼동될 수 있는 장식용 수치, badge, chip, chart, avatar, notification dot도 만들지 않는다. layout용 예시 값이 필요하면 해당 화면의 허용된 field에만 값을 넣고 새 field label을 만들지 않는다.

## Brand and existing asset inventory

| Asset | Exact repository path or source | Current use | Mockup rule |
| --- | --- | --- | --- |
| Cubing Hub mark | `frontend/public/CUBINGHUB.png` | 1254×1254 PNG, header, favicon, Login, Signup, Password Reset | reference를 제공할 수 있으면 이 asset을 사용한다. 새 logo나 icon으로 재설계하지 않는다. |
| Favicon reference | `frontend/index.html`의 `/CUBINGHUB.png` | browser favicon | 별도 favicon 디자인을 만들지 않는다. |
| Header logo reference | `frontend/src/App.jsx`의 `/CUBINGHUB.png` | desktop/mobile app shell | current asset의 형태와 비율을 유지한다. |
| VisualCube diagram | `frontend/src/utils/visualCube.js`의 `https://www.cubing.net/api/visualcube/` URL | Timer scramble, Learning case | brand asset이 아니라 functional cube visualization이다. 임의 cube telemetry로 확장하지 않는다. |

Mockup의 brand text는 정확히 `Cubing Hub`다. `큐빙 허브`를 brand name으로 사용하지 않고 `CubingHub`처럼 붙여 쓰지 않는다. 생성 모델이 asset reference를 받을 수 없으면 로고를 새로 그리지 말고 brand text만 사용한다.

현재 repository에는 별도의 brand SVG나 다른 header logo가 없다. `docs/assets/screenshots/**`는 historical UI evidence이며 logo source나 Approved Target으로 사용하지 않는다.

## Master UI Mockup Prompt

모든 화면 prompt 앞에 아래 Master Prompt를 그대로 붙인다. screen-specific prompt가 Master Prompt의 기능 금지나 visual constraint를 완화할 수 없다.

~~~text
Create one realistic production-ready web application screenshot for Cubing Hub. Treat this as a strict repository-grounded UI screen contract, not an invitation to design new product features.

CAPABILITY RULE
Use only: (1) repository CURRENT capabilities explicitly listed in the attached screen prompt, (2) REDESIGN-APPROVED UI-only behavior explicitly listed for that screen, and (3) the approved visual language below. A My Growth V2.2 TARGET PRESENTATION label changes only the visual target; it never authorizes a non-CURRENT capability. Never infer a feature from empty space, a familiar dashboard pattern, or visual convention. Leave space empty or solve it with spacing and layout. Do not create a new metric, chart, badge, filter, action, status, data field, navigation item, content type, or social signal.

VISUAL LANGUAGE
Use Measured Momentum with Precision Bench numeric discipline on Timer. The product should feel like precision cubing practice and performance tracking: calm, focused, trustworthy, and medium-high density. Use a light-first warm neutral canvas, minimal shadow, controlled radius, typography/spacing/divider hierarchy, and measured surfaces; not every section is a card. Align times and metrics with tabular numerals. Use subtle 3x3 geometry only where it supports identity. Keep the result feasible in ordinary React and CSS.

EXACT PALETTE
background #F3F5F2
surface #FAFBF9
surface raised #FFFFFF
surface subtle #E9EEEA
primary #136B57
primary hover #0F5A49
primary active #0B493C
text #111A1F
secondary text #3A474D
muted text #667277
border #D5DDD8
strong border #A8B4AD
success #18744B
PB #C27100
+2 and warning #A55F05
DNF and danger #B42318
Timer idle #66736D
Timer holding #A86100
Timer ready #0F7A5B
Timer running #155E75
Timer stopped #1B252B
Timer stage #10191F
Timer stage text #F7FAF8

BRAND AND LANGUAGE
Use Korean UI copy, while preserving established technical labels such as WCA_333, PB, Ao5, Ao12, +2, and DNF where the screen contract permits them. The brand text is exactly “Cubing Hub”. Do not use “큐빙 허브” as the brand name and do not concatenate it as “CubingHub”. If the existing asset is supplied, preserve frontend/public/CUBINGHUB.png; never redesign the logo or invent another cube icon.

RENDERING TARGET
Render a realistic production-ready web application screenshot. It must look implementable with React/CSS, stable grids, normal DOM geometry, accessible control proportions, and plausible responsive behavior. It is not concept art, a poster, a marketing landing page, or a brand campaign.

VISUAL NEGATIVE CONSTRAINTS
No purple SaaS gradient. No blue SaaS gradient. No glassmorphism. No neon glow. No giant marketing hero. No generic admin dashboard. No generic analytics dashboard. No excessive rounded cards. No decorative icon box everywhere. No emoji decoration. No six-color rainbow app palette. No gamer UI. No impossible Dribbble-style geometry. No excessive shadows. No fabricated feature.

FEATURE NEGATIVE CONSTRAINTS
No AI coaching or AI solve analysis. No streak or consecutive-day metric. No XP, level, achievement system, training plan, estimated practice duration, or personalized recommendation. No friend/follower, online status, last online, country flag, domestic/global filter, rank movement, reaction, like, bookmark count, verification badge, or competition badge. No smart cube telemetry, Daily Challenge, Public Profile, new event type, or arbitrary analytics. A screen-specific prompt may use an item only when it explicitly classifies and allows that exact item.
~~~

### Prompt assembly

```text
Master UI Mockup Prompt
+
one screen-specific prompt
+
approved target reference, only when available
```

여러 화면 prompt를 한 번에 섞지 않는다. Desktop과 Mobile은 각각 생성하고 같은 screen contract를 공유한다. 생성 모델이 contract를 따르지 못한 결과는 exploration에서 폐기하며 수정 전·후 이미지를 repository에 저장하지 않는다.

## Screen capability inventory and contracts

표의 `Current mockup`과 `V2.2 target`은 해당 capability를 그 종류의 이미지에 표시할 수 있는지를 뜻한다. `data-only`는 backend/API에 존재하더라도 별도 UI 승인이 없으면 표시하지 않는다.

### Timer

Screen goal은 scramble을 받고 정확하게 측정한 뒤 Record로 이어지는 Practice다. Timer가 시각적 주인공이고 통계 dashboard가 아니다.

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Timer | WCA_333 Practice event와 scramble 생성·새 scramble | `CURRENT` | `TimerPage.jsx`; `ScrambleController.java`; `ScrambleDocsTest.java`; ADR-0009 | 허용 | 해당 없음 | 다른 EventType은 enum에 있어도 current Practice 지원이 아니다. |
| Timer | `idle`, `holding`, `ready`, `running`, `stopped`와 300ms hold | `CURRENT` | `timerMachine.js`; `useCubeTimer.js`; Timer tests; [Timer requirement](../02-requirements/features/timer.md) | 허용 | 해당 없음 | state label과 control은 실제 전이를 보존한다. |
| Timer | keyboard Space, touch·pen input | `CURRENT` | `useKeyboardTimerInput.js`; `useTouchTimerInput.js`; `useCubeTimer.test.jsx`; ADR-0007 | 허용 | 해당 없음 | 별도 hardware timer를 암시하지 않는다. |
| Timer | VisualCube scramble diagram | `CURRENT` | `TimerPage.jsx`; `visualCube.js` | toggle 상태에서 허용 | 해당 없음 | 현재 code는 자동 표시지만 target은 승인된 toggle을 적용한다. |
| Timer | cube visualization toggle, default hidden | `REDESIGN-APPROVED` | 이 문서의 승인된 redesign-only behavior | 허용 | 해당 없음 | persistence 방식은 미결정이다. |
| Timer | focus mode와 exit | `REDESIGN-APPROVED` | 이 문서의 승인된 redesign-only behavior | 허용 | 해당 없음 | browser fullscreen이나 새 timing state가 아니다. |
| Timer | Ao5, Ao12, recent history | `CURRENT` | `TimerPage.jsx`; Timer calculator/storage tests; Timer requirement | 허용 | 해당 없음 | DNF/+2 계산 규칙을 보존한다. PB는 포함하지 않는다. |
| Timer | authenticated save, guest local history | `CURRENT` | `TimerPage.jsx`; `api.js`; `RecordController.java`; Record tests | 허용 | 해당 없음 | 화면 하나에서 guest/auth behavior를 섞지 않는다. |
| Timer | penalty correction, DNF, delete | `CURRENT` | `RecordController.java`; `RecordDocsTest.java`; Timer page tests | 허용 | 해당 없음 | stopped/recent context에 둔다. |
| Timer | authenticated pending Retry / Discard | `CURRENT` | `TimerPage.jsx`; `pendingTimerSolveStorage.js`; Timer tests; ADR-0008 | 해당 상태에서 허용 | 해당 없음 | fresh scramble이 pending recovery를 덮지 않는다. |
| Timer | current page의 recent solve 묶음 | `CURRENT` | `TimerPage.jsx` | 허용 | 해당 없음 | 별도 Session domain, duration, mean, analytics를 뜻하지 않는다. |
| Timer | Timer PB display, session duration·mean·analytics, Growth chart, training plan, AI coaching | `FUTURE / OUT` | Timer response/UI에 근거 없음 | 금지 | 금지 | `user_pbs` 존재를 Timer UI capability로 해석하지 않는다. |

Information hierarchy는 `scramble context → Timer stage/state → stopped result/recovery action → Ao5/Ao12 → compact recent history`다. Normal view는 이 정보를 한 화면에 유지하고 Focus는 scramble, timer, state, focus exit만 남기는 방향으로 secondary 정보를 억제한다. Mobile portrait는 timer digit과 touch target을 우선하고 landscape focus는 viewport height를 Timer stage에 우선 배분한다.

### Timer approved targets

| Target | Approval state | Repository state |
| --- | --- | --- |
| Timer Desktop Normal | Approved visual anchor | approved externally / pending repository import |
| Timer Desktop Focus | Approved visual anchor | approved externally / pending repository import |
| Timer Mobile Portrait | Approved visual anchor | approved externally / pending repository import |
| Timer Mobile Landscape Focus | Approved visual anchor | approved externally / pending repository import |

네 target binary는 현재 repository에 없다. 파일이 있다고 가정하거나 비슷한 이미지를 임의로 재생성하지 않는다. correction이 필요하면 기존 승인 이미지를 입력 reference로 제공받고 별도 승인 뒤 수정한다.

### Home

Screen goal은 다음 행동을 빠르게 선택하게 하고 Practice 복귀를 가장 먼저 보여 주는 것이다. full Timer, full Growth, full Record History를 복제하지 않는다.

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Home | 오늘의 WCA_333 scramble과 Timer 이동 | `CURRENT` | `HomePage.jsx`; `HomeController.java`; `HomeService.java`; `HomeDocsTest.java` | 허용 | 해당 없음 | Practice 복귀의 primary block이다. |
| Home | nickname, main event | `CURRENT` | `HomeSummaryResponse.java`; `HomePage.jsx` | 인증 화면에 허용 | 해당 없음 | compact profile context로만 사용한다. |
| Home | total solve count, PB | `CURRENT` | `HomePage.jsx`; `HomeSummaryResponse.java`; Home tests | 인증 화면에 허용 | 해당 없음 | Profile/Home summary의 current visible field다. |
| Home | `summary.averageTimeMs` provider field | `CURRENT data-only` | `HomeSummaryResponse.java`; `HomePage.test.jsx` legacy average 비노출 regression | 금지 | 금지 | API compatibility를 위해 남아 있지만 Home이나 Growth UI에 노출하지 않는다. |
| Home | 최근 Record 최대 5건의 event, result, penalty, scramble, date | `CURRENT` | `HomeRecentRecordResponse.java`; `HomePage.jsx`; Home REST Docs | 인증 화면에 허용 | 해당 없음 | compact preview이며 full history가 아니다. |
| Home | 최근 Community post 최대 3건 | `CURRENT` | `HomeResponse.java`; `HomeService.java`; guest `HomePage.jsx` | guest 화면에 허용 | 해당 없음 | auth target에 억지로 추가하지 않는다. |
| Home | Learning·Community·Rankings 등 current route 소개 | `CURRENT` | `HomePage.jsx`; `App.jsx` | guest capability entry에 허용 | 해당 없음 | recommendation이 아니라 route 안내다. |
| Home | 7-day median, 30-day trend, IQR, active days, streak, DNF change, PB progression, Growth chart | `FUTURE / OUT` for Home | current Home source에 없음; 일부 metric은 My Growth에서만 `CURRENT` | 금지 | Home에는 금지 | My Growth capability를 Home capability로 확대하지 않는다. |
| Home | next-practice recommendation, estimated practice time | `FUTURE / OUT` | current Home API 근거 없음 | 금지 | Home에는 금지 | Timer CTA를 추천 engine으로 표현하지 않는다. |

Information hierarchy는 `오늘의 scramble + Practice CTA → 인증 시 compact summary → 최근 Record preview`다. guest target은 `Practice CTA → current capability entry → 최근 Community`로 분리한다. Desktop은 wide hero가 아니라 compact action band를 사용하고, Mobile은 첫 viewport에서 Practice CTA가 보이게 한다.

### Rankings

Screen goal은 Cubing Hub 내부 WCA_333 PB 순위를 빠르게 비교하고 nickname으로 찾는 것이다.

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Rankings | WCA_333 event | `CURRENT` | `RankingController.java`; `RankingControllerIntegrationTest.java`; ADR-0009 | 허용 | 해당 없음 | unsupported event selector option은 만들지 않는다. |
| Rankings | rank, nickname, PB effective time | `CURRENT` | `RankingResponse.java`; `RankingDocsTest.java`; `RankingsPage.jsx` | 허용 | 해당 없음 | table의 핵심 3개 field다. |
| Rankings | nickname contains search | `CURRENT` | `RankingController.java`; `UserPBRepositoryImpl.java`; Ranking tests | 허용 | 해당 없음 | 검색 결과도 전체 rank를 표시한다. |
| Rankings | 1-based pagination, current user rank | `CURRENT` | `RankingPageResponse.java`; Ranking REST Docs; `RankingsPage.jsx` | 허용 | 해당 없음 | 로그인 시 current user row를 구조와 label로 구분한다. |
| Rankings | restrained Top 3 distinction | `REDESIGN-APPROVED` | [UI Visual Direction](ui-visual-direction.md) | 허용 | 해당 없음 | gamer podium이나 medal spectacle은 금지한다. |
| Rankings | Ao5, Ao12, record/solve count | `FUTURE / OUT` | ranking response에 없음 | 금지 | 금지 | Timer metric을 ranking field로 옮기지 않는다. |
| Rankings | country, flag, 국내/글로벌 filter, online, last active, rank movement, avatar | `FUTURE / OUT` | ranking response에 없음 | 금지 | 금지 | global rank는 geography profile 기능을 뜻하지 않는다. |
| Rankings | verification·competition status | `FUTURE / OUT` | draft future domain | 금지 | 금지 | 현재 ranking은 self-reported Practice PB다. |

Information hierarchy는 `WCA_333 context + nickname search → restrained Top 3 → rank/nickname/PB table → pagination`이며 current user rank는 별도 compact context 또는 row highlight로 보여 준다. Mobile은 한 줄 비교 row를 유지하고 Top 3 때문에 목록이 첫 화면 밖으로 밀리지 않게 한다.

### MyPage / Records

Records-specific target의 목적은 `Record management + Account utility`다. Current My Growth는 같은 `/mypage` route에 존재하지만 이 target은 Records와 Account surface만 다루며 Growth dashboard를 복제하거나 placeholder로 만들지 않는다.

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| MyPage / Records | nickname, main event, profile update | `CURRENT` | `MyPage.jsx`; `UserProfileController.java`; `UserProfileDocsTest.java` | 허용 | My Growth shell에 compact context만 허용 | account utility로 분리한다. |
| MyPage / Records | password change, logout | `CURRENT` | `MyPage.jsx`; User Profile API/tests; Auth API | 허용 | account utility에 허용 | Record table의 primary surface와 분리한다. |
| MyPage / Records | event, raw time, effective result, penalty, date | `CURRENT` | `MyProfileRecordResponse.java`; `UserProfileDocsTest.java` | 필요한 field만 허용 | Records target에 허용 | scramble은 response에 없다. |
| MyPage / Records | record pagination, event filter | `CURRENT` | `MyRecordPageResponse.java`; `MyPage.jsx`; profile tests | 허용 | Records target에 허용 | page는 current contract를 따른다. |
| MyPage / Records | penalty correction, delete | `CURRENT` | `RecordController.java`; `MyPage.jsx`; tests | 허용 | Records target에 허용 | destructive action은 명확한 confirmation hierarchy를 둔다. |
| MyPage / Records | Profile `totalSolveCount`, `personalBestTimeMs`, `averageTimeMs` provider field | `CURRENT data-only` | `MyProfileSummaryResponse.java`; `MyPage.test.jsx` Growth source isolation | 금지 | 금지 | legacy summary/raw trend UI consumer는 제거됐다. Visible Growth metric은 private Growth API만 사용한다. |
| MyPage / Records | input method | `CURRENT data-only` | `MyProfileRecordResponse.java`; V3 migration; profile requirement | 금지 | 별도 결정 전 금지 | 현재 화면 노출 여부가 미확정이다. |
| MyPage / Records | scramble | `FUTURE / OUT` | MyPage record response에 없음 | 금지 | 금지 | Timer/Home record response와 혼동하지 않는다. |
| MyPage / Records | 7-day performance comparison, PB progression, IQR/recent consistency, activity, deterministic Next Practice | `CURRENT` on My Growth surface | `MyPage.jsx`; Growth API client/backend/tests | Records target에는 금지 | My Growth target presentation에 허용 | 같은 route의 current Growth capability지만 Records surface에 섞지 않는다. |
| MyPage / Records | streak, AI analysis/coaching | `FUTURE / OUT` | Growth explicit non-goals | 금지 | 금지 | deterministic Next Practice를 AI recommendation으로 표현하지 않는다. |

Information hierarchy는 `compact profile context → Records filter/list → correction/delete → pagination → separated account utility`다. Desktop은 dense table을, Mobile은 field를 잃지 않는 compact rows와 accessible action menu를 사용한다. progressive loading을 새 behavior로 만들지 않고 current pagination을 보존한다.

### My Growth — CURRENT capability / V2.2 target presentation

My Growth capability는 current `dev`의 `/mypage`에 구현됐다. WCA_333 private owner view이며 현재 남아 있는 canonical Record를 기준으로 한다. 아래 capability는 current-safe mockup과 future Target Mockup presentation에서 모두 사용할 수 있다. `V2.2 TARGET PRESENTATION`은 아직 승인되지 않은 redesigned presentation을 뜻하며 current capability를 future 기능으로 낮추거나 새 capability를 허용하지 않는다.

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| My Growth | Current PB, Recent Ao5, Recent Ao12 | `CURRENT` | `MyPage.jsx`; `GrowthSummaryResponse.java`; `GrowthMetricCalculator.java`; MyPage/Growth tests; [Growth Metrics](../01-domain/growth-metrics.md); ADR-0010 accepted | 허용 | 허용 | WCA_333 only, rankable sample rule 적용. |
| My Growth | 최근 완료 7일 중앙값과 직전 완료 7일 중앙값 비교 | `CURRENT` | `MyPage.jsx`; `GrowthReadService.java`; `GrowthSummaryResponse.java`; calculator/API tests; Growth Metrics/Architecture | 허용 | 허용 | 오늘을 제외한 완료 기간, Asia/Seoul service day다. |
| My Growth | 30-day daily median | `CURRENT` | `MyPage.jsx`; `getMyGrowthTrend`; `GrowthTrendResponse.java`; `GrowthReadRepository.java`; REST Docs/API tests | 허용 | 허용 | UI label은 `일별 중앙값`처럼 median임을 드러낸다. |
| My Growth | latest 12 vs previous 12 IQR, DNF/+2 count·rate, sample | `CURRENT` | `MyPage.jsx`; `GrowthSummaryResponse.java`; `GrowthMetricCalculator.java`; MyPage/calculator tests | 허용 | 허용 | `최근 12회 기록 범위`; rankable 8개 미만 gate를 표시한다. |
| My Growth | PB progression | `CURRENT` | `MyPage.jsx`; `getMyGrowthPbProgression`; `GrowthPbProgressionPageResponse.java`; `GrowthReadRepository.java`; REST Docs/API/query tests | 허용 | 허용 | strictly improving running minimum, `현재 남아 있는 기록 기준`. |
| My Growth | 7/previous 7/30-day record count, 30-day active days/daily count, first/latest recorded activity | `CURRENT` | `MyPage.jsx`; `GrowthSummaryResponse.java`; `GrowthTrendResponse.java`; `GrowthReadService.java`; MyPage/API tests | 허용 | 허용 | streak가 아니라 `기록된 활동`이다. |
| My Growth | deterministic Next Practice CTA | `CURRENT` | `MyPage.jsx`; `MyPage.test.jsx`; Growth Metrics/requirement | 허용 | 허용 | Ao sample rule 기반 Timer link. AI coaching·prediction이 아니다. |
| My Growth | streak, generic mean, stability score, standard deviation, session, AI technique/F2L analysis | `FUTURE / OUT` | Growth explicit non-goals | 금지 | 금지 | arbitrary analytics로 채우지 않는다. |
| My Growth | smart cube telemetry, Public Profile, social comparison | `FUTURE / OUT` | Growth explicit non-goals | 금지 | 금지 | owner-private target을 유지한다. |

Information hierarchy는 `현재 실력 → 최근 방향 → 안정성 → PB 발전 → Practice 활동 → 다음 Practice`다. Desktop은 섹션별 읽기 폭과 divider를 사용하고 모든 metric을 card로 만들지 않는다. Mobile은 한 번에 chart 하나만 보여 주고 sparse label과 text summary를 함께 둔다.

### Community List

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Community List | ALL/FREE/NOTICE category | `CURRENT` | `CommunityPage.jsx`; `PostController.java`; Post REST Docs | 허용 | 해당 없음 | ADMIN만 NOTICE 작성 가능하다는 권한을 바꾸지 않는다. |
| Community List | title/content keyword search, author search | `CURRENT` | `PostRepository.java`; search integration test | 허용 | 해당 없음 | 두 검색 의미를 섞지 않는다. |
| Community List | title, author, category, created date, view count | `CURRENT` | `PostListItemResponse.java`; `PostDocsTest.java` | 허용 | 해당 없음 | comment count는 없다. |
| Community List | pagination, authenticated write action | `CURRENT` | `PostPageResponse.java`; `CommunityPage.jsx`; route guard | 허용 | 해당 없음 | guest에게 작성 완료 상태를 보여 주지 않는다. |
| Community List | comment count, like, reaction, bookmark, trending score, follower, creator badge, online | `FUTURE / OUT` | list response에 없음 | 금지 | 금지 | metadata 줄을 새 social data로 채우지 않는다. |

Screen goal은 current post를 category와 search로 찾고 읽거나 작성으로 이동하는 것이다. Desktop은 filter/search/action 뒤 dense list와 pagination, Mobile은 category와 search를 compact control로 정리하고 title/author/date/view만 유지한다.

### Community Detail

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Community Detail | category, title, author, date, view count, body | `CURRENT` | `PostDetailResponse.java`; `CommunityDetailPage.jsx`; Post tests | 허용 | 해당 없음 | reading width를 우선한다. |
| Community Detail | attachments/images | `CURRENT` | `PostAttachmentResponse.java`; Flyway `post_attachments`; Post tests | 허용 | 해당 없음 | 실제 첨부 content 영역으로만 사용한다. |
| Community Detail | paginated comments, authenticated comment create | `CURRENT` | `CommentController.java`; Comment REST Docs; detail page | 허용 | 해당 없음 | comment metadata는 author/date/content다. |
| Community Detail | post author/ADMIN edit·delete, comment author/ADMIN delete | `CURRENT` | controllers/services; integration tests; frontend actions | 권한 상태에서 허용 | 해당 없음 | permission을 redesign하지 않는다. |
| Community Detail | like, reaction, bookmark, follower, creator badge | `FUTURE / OUT` | current API에 없음 | 금지 | 금지 | action bar를 가짜 engagement로 채우지 않는다. |

Screen goal은 post를 읽고 허용된 comment와 owner/admin action을 수행하는 것이다. Desktop은 narrow reading column과 metadata/action separation, Mobile은 본문을 먼저 두고 권한 action을 compact menu로 정리한다.

### Community Write / Edit

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Community Write / Edit | title, content, category | `CURRENT` | `PostCreateRequest.java`; `PostUpdateRequest.java`; write page/tests | 허용 | 해당 없음 | user는 FREE, ADMIN은 NOTICE를 사용할 수 있다. |
| Community Write / Edit | multiple image upload, retained/removed existing images | `CURRENT` | `PostController.java`; storage service; multipart REST Docs; write page | 허용 | 해당 없음 | 최대 5개와 validation feedback을 현재 계약대로 표현한다. |
| Community Write / Edit | submit, cancel/back, loading/error | `CURRENT` | `CommunityWritePage.jsx`; page tests | 허용 | 해당 없음 | editor plugin이나 rich reaction을 만들지 않는다. |
| Community Write / Edit | poll, tag system, draft collaboration, social preview | `FUTURE / OUT` | current API에 없음 | 금지 | 금지 | form 빈 공간을 feature로 채우지 않는다. |

Desktop prompt는 form-first composition과 image attachment queue를 보여 준다. Edit는 existing attachment retention/removal가 필요한 상태에서만 별도 생성하며 Write prompt에 존재하지 않는 historical data를 넣지 않는다.

### Q&A

Community에서 확정한 list, detail, form, metadata, pagination과 responsive content system을 재사용하되 Q&A 전용 current data만 추가한다.

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Q&A List | answered + PUBLIC feedback 목록, type, title, question·answer preview, generic questioner·answerer, published date, total count, pagination | `CURRENT` | `PublicFeedbackController.java`; `PublicFeedbackListItemResponse.java`; Feedback REST Docs; `QnaPage.jsx` | 허용 | 해당 없음 | 공개 목록에는 unanswered가 없다. total count는 공개 답변 page metadata다. |
| Q&A Detail | question content, ADMIN answer, questioner/answerer labels, timestamps | `CURRENT` | `PublicFeedbackDetailResponse.java`; `QnaDetailPage.jsx`; tests | 허용 | 해당 없음 | `사용자`, `관리자` generic label을 따른다. |
| Q&A | authenticated question submit route to Feedback | `CURRENT` | `QnaPage.jsx`; `/feedback` route guard; `FeedbackController.java` | 허용 | 해당 없음 | public inline submit form으로 바꾸지 않는다. |
| Q&A | waiting/answered filter, public visibility control, unanswered detail | `FUTURE / OUT` | public API에 없음 | 금지 | 금지 | status primitive는 Admin에서만 사용한다. |
| Q&A | vote, reputation, accepted-answer score, expert badge, follower | `FUTURE / OUT` | current API에 없음 | 금지 | 금지 | Stack Overflow형 feature를 만들지 않는다. |

Q&A List는 Community List의 density와 pagination을, Q&A Detail은 Community Detail의 reading width와 metadata를 사용한다. Mobile Core는 answered public question 하나의 title, question, answer와 navigation만 보존한다.

### Learning

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Learning | notation, beginner, F2L, OLL, PLL tabs | `CURRENT` | `LearningPage.jsx`; `mockLearning.js`; Learning requirement/tests | 허용 | 해당 없음 | static current content다. |
| Learning | case name/title, algorithm, VisualCube | `CURRENT` | `mockLearning.js`; `visualCube.js`; page tests | 허용 | 해당 없음 | 실제 반복 content unit이므로 card를 사용할 수 있다. |
| Learning | progress tracking, completion, personalized curriculum, recommendation | `FUTURE / OUT` | current source에 없음 | 금지 | 금지 | checkmark/progress bar도 만들지 않는다. |

Screen goal은 current curriculum tab에서 case와 algorithm을 찾아 학습하는 것이다. Page/section/card 3중 nesting을 피하고 case card 자체가 content unit이 되게 한다. Mobile은 tab overflow를 제어하고 algorithm과 diagram을 같은 case 안에서 읽게 한다.

### Auth

Auth는 form-first다. decorative illustration 때문에 form, field, validation, recovery link가 밀리지 않게 한다.

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Login | email, password, submit | `CURRENT` | `LoginPage.jsx`; `AuthController.java`; `AuthDocsTest.java` | 허용 | 해당 없음 | 성공 시 requested route 또는 Home으로 이동한다. |
| Login | Signup, Password Reset links | `CURRENT` | `LoginPage.jsx`; route tests | 허용 | 해당 없음 | social provider를 추가하지 않는다. |
| Signup / Verification | email code request·confirm, nickname, main event, password·confirm | `CURRENT` | `SignupPage.jsx`; Auth API/docs/integration tests | 허용 | 해당 없음 | 실제 단계와 resend/error/loading만 사용한다. |
| Password Reset | email code request·confirm, new password·confirm | `CURRENT` | `ResetPasswordPage.jsx`; Auth REST Docs/tests | 허용 | 해당 없음 | success 뒤 Login으로 이동한다. |
| Auth | fake Google/Apple/Kakao login, passkey, magic link | `FUTURE / OUT` | current auth API에 없음 | 금지 | 금지 | familiar auth convention으로 발명하지 않는다. |

Desktop은 form width를 안정적으로 제한하고 asset을 크게 재해석하지 않는다. Mobile은 keyboard와 safe area를 고려해 submit과 error가 보이게 한다.

### Feedback

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Feedback | BUG/FEATURE/UX/OTHER type, reply email, title, content | `CURRENT` | `FeedbackPage.jsx`; `FeedbackCreateRequest.java`; Feedback REST Docs | 허용 | 해당 없음 | authenticated form이다. |
| Feedback | submit, validation, loading, success/error | `CURRENT` | page/controller integration tests | 허용 | 해당 없음 | public anonymous form으로 만들지 않는다. |
| Feedback | user ticket history, vote, priority, live chat | `FUTURE / OUT` | current user API에 없음 | 금지 | 금지 | support dashboard를 만들지 않는다. |

Feedback은 한 화면 form과 concise guidance로 구성하고 Community Write의 form primitive를 재사용한다.

### Admin

| Screen | Capability | Classification | Source evidence | Current mockup | V2.2 target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Admin Feedback | list, answered filter, visibility filter, pagination | `CURRENT` | `AdminPage.jsx`; `AdminFeedbackController.java`; management REST Docs/tests | 허용 | 해당 없음 | operational density를 우선한다. |
| Admin Feedback Detail | submitter, type, reply email, content, notification state, answer, visibility, timestamps | `CURRENT` | `AdminFeedbackDetailResponse.java`; detail page/tests | 허용 | 해당 없음 | answer와 visibility update만 현재 workflow다. |
| Admin Memo | list, pagination, create, detail, question, answer, ANSWERED/UNANSWERED, update, delete | `CURRENT` | `AdminMemoController.java`; Admin pages; integration tests; Flyway | 허용 | 해당 없음 | DELETE만 REST Docs 문서화 gap이 있다. |
| Admin | analytics KPI, user growth chart, moderation queue, role redesign | `FUTURE / OUT` | current Admin source에 없음 | 금지 | 금지 | generic admin dashboard로 확장하지 않는다. |

Admin은 표, filter, status, form의 운영 밀도를 우선한다. 큰 decorative summary card나 임의 KPI를 만들지 않고 current permission/workflow를 그대로 둔다.

### Not Found

Not Found는 잘못된 route 안내와 Home 이동만 제공하는 current utility screen이다. 별도 prompt pack 우선순위에는 넣지 않는다. 검색, 추천 content, support chat을 추가하지 않는다.

## Content-system generation dependency

Community를 먼저 만든다. list, detail, form, metadata, pagination과 responsive content system을 승인한 뒤 Q&A가 같은 primitive를 재사용해야 한다.

```text
Community List
→ Community Detail
→ Community Write
→ Community responsive rule 승인
→ Q&A List
→ Q&A Detail
→ Q&A Mobile core state
```

Q&A에서 Community와 다른 card language나 새로운 status system을 먼저 만들지 않는다.

## Screen-specific Prompt Pack

각 block은 Master UI Mockup Prompt 뒤에 붙이는 화면 전용 입력이다. `Shared visual system`과 `Negative constraints`는 Master의 전체 visual·금지 규칙을 그대로 적용한다는 뜻이며 생략 허가가 아니다. 생성 모델에는 Master와 screen block을 함께 전달한다.

### Timer correction prompts

승인된 원본 target이 reference image로 제공된 correction 작업에만 사용한다. reference 없이 새 Timer anchor를 생성하지 않는다.

#### Timer Desktop Normal

~~~text
SCREEN: Timer Desktop Normal — APPROVED ANCHOR CORRECTION ONLY, 1440×900.
Screen goal: preserve the attached approved normal Timer target while correcting only the explicitly requested visual defect; keep Practice timing dominant.
Allowed features: WCA_333 scramble, hidden-by-default VisualCube toggle, idle/holding/ready/running/stopped state, keyboard and touch guidance, Ao5, Ao12, recent solves, authenticated save or guest-local behavior for one chosen state, penalty, DNF, delete, and pending Retry/Discard only when that exact pending state is requested.
Forbidden/invented features: Timer PB, session duration, session mean, session analytics, Growth chart, streak, training plan, AI coaching, hardware telemetry, or any feature outside the Timer contract.
Information hierarchy: scramble context → large dark Timer stage and state → stopped or recovery action → Ao5/Ao12 → compact recent history.
Desktop layout: compact top navigation, broad centered stage, measured secondary rail or strip; preserve the attached approved composition and do not explore a new variant.
Shared visual system: apply the complete Master Prompt, Measured Momentum, Precision Bench numerals, exact palette, minimal elevation, and existing Cubing Hub asset rule.
Korean label rule: Korean product copy with only approved technical labels WCA_333, Ao5, Ao12, +2, and DNF; brand text exactly “Cubing Hub”.
Rendering target: a React/CSS-feasible production web screenshot matching the attached approved target, not concept art or marketing art.
Negative constraints: apply every Master negative constraint unchanged; do not regenerate without the approved reference image and do not add a PB field.
~~~

#### Timer Desktop Focus

~~~text
SCREEN: Timer Desktop Focus — APPROVED ANCHOR CORRECTION ONLY, 1440×900.
Screen goal: preserve the attached approved focus target and maximize calm timing focus without changing Timer behavior.
Allowed features: compact WCA_333 scramble context, dominant dark Timer stage, timer digits and current state, REDESIGN-APPROVED focus exit, and the hidden VisualCube control only if it exists in the attached target.
Forbidden/invented features: browser fullscreen chrome, a new timing state, PB, Ao dashboard, session analytics, Growth chart, streak, training plan, AI coaching, or device telemetry.
Information hierarchy: focus exit and scramble context → timer digits → state instruction; all secondary history remains suppressed.
Desktop layout: use nearly the full content viewport for the stage while retaining a clear in-app focus exit; preserve the approved target's proportions.
Shared visual system: apply the complete Master Prompt with Precision Bench numeric discipline and dark Timer stage inside the light-first product shell.
Korean label rule: concise Korean state and exit copy, approved Timer abbreviations only, brand text exactly “Cubing Hub” when visible.
Rendering target: a plausible production focus-state screenshot implementable in normal DOM/CSS, using the attached target as the visual source.
Negative constraints: apply every Master negative constraint unchanged; no browser Fullscreen API treatment, new controls, invented metric, or new composition.
~~~

#### Timer Mobile Portrait

~~~text
SCREEN: Timer Mobile Portrait — APPROVED ANCHOR CORRECTION ONLY, 390×844.
Screen goal: preserve the attached approved portrait target and keep touch timing reachable and visually dominant.
Allowed features: WCA_333 scramble, default-hidden VisualCube toggle, Timer states, touch/pen timing, Ao5, Ao12, compact recent solves, allowed stopped actions, and mobile bottom navigation outside active focus.
Forbidden/invented features: PB, session duration/mean, Growth chart, streak, coaching, hardware connection, or desktop-only extra rail.
Information hierarchy: compact scramble → large timer and state → stopped action → compact Ao/recent area; the timing target remains reachable above safe-area controls.
Mobile layout: portrait safe-area spacing, stable wide digits, no horizontal overflow, deliberate lower-region compression instead of stacked cards.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, Precision Bench numerals, and current app-shell navigation intent.
Korean label rule: concise Korean UI, WCA_333/Ao5/Ao12/+2/DNF only where allowed, brand text exactly “Cubing Hub”.
Rendering target: a realistic iPhone portrait web-app screenshot feasible in responsive React/CSS and faithful to the attached target.
Negative constraints: apply every Master negative constraint unchanged; no new metric, recommendation, social element, or replacement logo.
~~~

#### Timer Mobile Landscape Focus

~~~text
SCREEN: Timer Mobile Landscape Focus — APPROVED ANCHOR CORRECTION ONLY, 844×390.
Screen goal: preserve the attached approved landscape focus target and devote viewport height to reliable timing.
Allowed features: single-line WCA_333 scramble context, dark timer stage, large stable digits, current state, and REDESIGN-APPROVED focus exit.
Forbidden/invented features: browser fullscreen treatment, PB, Ao dashboard, session analytics, Growth chart, streak, coaching, device indicator, or bottom navigation inside focus.
Information hierarchy: focus exit/scramble → timer digits → state feedback; secondary data remains outside this focus target.
Mobile layout: landscape safe areas, minimal shell, no clipped digits, no scrolling dependency for the timing action, preserve the approved target's geometry.
Shared visual system: apply the full Master Prompt with Precision Bench numerals and the exact Timer-stage palette.
Korean label rule: only essential Korean state/exit copy and approved technical labels; brand text exactly “Cubing Hub” if present.
Rendering target: a normal mobile web layout feasible with viewport-aware React/CSS, based on the supplied approved image.
Negative constraints: apply every Master negative constraint unchanged; no new fullscreen API, metric, navigation, feature, or visual exploration.
~~~

### Home prompts

#### Home Desktop

~~~text
SCREEN: Home Desktop — CURRENT-SAFE, authenticated, 1440×900.
Screen goal: help the member choose the next action immediately, with return to Practice as the clear priority.
Allowed features: today's WCA_333 scramble, primary Timer CTA, compact nickname/main-event context, total saved solve count, PB, and up to five recent records with event/result/penalty/scramble/date.
Forbidden/invented features: Ao5, Ao12, 7-day median, 30-day trend, IQR, active days, streak, DNF change rate, PB progression, Growth chart, estimated practice time, next-practice recommendation, or full Timer/History duplication.
Information hierarchy: compact Practice action band → member summary with only current fields → recent Record preview and link to full Records.
Desktop layout: use a wide but restrained content grid; keep the Practice action above the fold and use dividers/spacing instead of a row of oversized metric cards.
Shared visual system: apply the complete Master Prompt, light-first Measured Momentum, exact palette, tabular times, desktop top navigation, and existing logo rule.
Korean label rule: Korean UI labels matching current concepts; WCA_333, PB, +2, DNF stay technical; brand text exactly “Cubing Hub”.
Rendering target: a realistic production Home screenshot that can be built with ordinary React/CSS, not a marketing dashboard.
Negative constraints: apply every Master negative constraint unchanged; do not add Community recommendation, Learning progress, social activity, or any unsupported statistic.
~~~

#### Home Mobile

~~~text
SCREEN: Home Mobile — CURRENT-SAFE, authenticated, 390×844.
Screen goal: expose the Timer return action in the first viewport and provide only a compact current snapshot below it.
Allowed features: today's WCA_333 scramble, Timer CTA, nickname/main event, total solve count, PB, and compact recent records using current fields.
Forbidden/invented features: Ao5/Ao12, median/trend/IQR, active days, streak, recommendations, estimated duration, Growth chart, full Timer controls, or full Record History.
Information hierarchy: scramble and Practice CTA → condensed current summary → recent Record rows → Records link.
Mobile layout: intentional portrait reading order, bottom navigation with safe-area spacing, compact summary rows rather than desktop cards stacked vertically, no horizontal table overflow.
Shared visual system: apply the full Master Prompt, Measured Momentum, exact palette, tabular time alignment, controlled radius, and mobile bottom-navigation intent.
Korean label rule: Korean current labels and approved time abbreviations only; brand text exactly “Cubing Hub”.
Rendering target: a production-ready responsive mobile web screenshot, React/CSS-feasible and not a landing page.
Negative constraints: apply every Master negative constraint unchanged; leave unused space calm instead of creating an activity metric or recommendation.
~~~

### Rankings prompts

#### Rankings Desktop

~~~text
SCREEN: Rankings Desktop — CURRENT-SAFE, 1440×900.
Screen goal: compare Cubing Hub WCA_333 Practice PB rank quickly and find a member by nickname.
Allowed features: WCA_333 as the only supported event context, nickname contains search, restrained Top 3 distinction, dense rank/nickname/PB rows, current-user rank context, and 1-based pagination.
Forbidden/invented features: Ao5, Ao12, record or solve count, country/flag, domestic/global filter, online/last-active state, rank movement arrow, avatar, verification, competition status, follower, or gamer podium.
Information hierarchy: supported-event context and search → restrained Top 3 → main rank/nickname/PB table → current-user context → pagination.
Desktop layout: compact toolbar and comparison-first table; distinguish Top 3 and current user through structure plus label, not spectacle or color alone.
Shared visual system: apply the complete Master Prompt, Measured Momentum, exact palette, tabular PB alignment, subtle 3x3 geometry, and desktop top navigation.
Korean label rule: Korean UI with WCA_333 and PB preserved; use `전체 순위` or `내 순위` without inventing a geographic filter; brand text exactly “Cubing Hub”.
Rendering target: a realistic production leaderboard screenshot implementable in React/CSS, not a sports game screen.
Negative constraints: apply every Master negative constraint unchanged; every row contains only rank, nickname, and PB.
~~~

#### Rankings Mobile

~~~text
SCREEN: Rankings Mobile — CURRENT-SAFE, 390×844.
Screen goal: scan WCA_333 rank, nickname, and PB with search and current-user context on a narrow screen.
Allowed features: WCA_333-only context, nickname search, compact Top 3 treatment if it does not displace the list, one-line rank/nickname/PB rows, current-user label, and pagination.
Forbidden/invented features: Ao metrics, solve count, flag, geography filter, online state, rank trend, avatar, badge, reaction, or podium spectacle.
Information hierarchy: event/search controls → immediately visible leaderboard → current-user context → pagination.
Mobile layout: stable rank and PB columns, ellipsized nickname only when needed, bottom navigation and safe areas, no card per ranking row.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, tabular numerals, controlled borders, and mobile navigation intent.
Korean label rule: Korean UI with WCA_333/PB; no `국내`/`글로벌` filter labels; brand text exactly “Cubing Hub”.
Rendering target: a plausible responsive production leaderboard screenshot feasible in normal React/CSS.
Negative constraints: apply every Master negative constraint unchanged; do not fill rows with unsupported metadata or icons.
~~~

### MyPage Records prompts

#### MyPage Records Desktop

~~~text
SCREEN: MyPage Records Desktop — CURRENT-SAFE, authenticated, 1440×900.
Screen goal: manage saved Records and reach account utilities without duplicating the current My Growth dashboard.
Allowed features: compact nickname/main-event profile context, event filter, records with event/effective result/penalty/date, current pagination, penalty correction, delete confirmation/action, profile update, password change, and logout in a separated account area.
Forbidden/invented features: duplicate My Growth dashboard or placeholder inside this Records-specific target, 7-day Growth, PB progression, IQR, active days, deterministic Next Practice, streak, AI analysis, scramble column, input-method column, progressive loading, or unsupported summary chart.
Information hierarchy: profile context and account entry → Records filter/list → correction/delete actions → pagination; account forms remain separate from the data surface.
Desktop layout: dense table with restrained action controls and clear destructive hierarchy; do not add a dashboard row above the records.
Shared visual system: apply the complete Master Prompt, Measured Momentum, exact palette, tabular results, compact surface hierarchy, and desktop shell.
Korean label rule: Korean labels with +2/DNF preserved; brand text exactly “Cubing Hub”; do not label any section Growth.
Rendering target: a realistic production record-management screenshot feasible with existing React/CSS interaction patterns.
Negative constraints: apply every Master negative constraint unchanged; no fake metric, chart, scramble, input method, recommendation, or future navigation.
~~~

#### MyPage Records Mobile

~~~text
SCREEN: MyPage Records Mobile — CURRENT-SAFE, authenticated, 390×844.
Screen goal: review and manage current records with reachable account utility on mobile.
Allowed features: compact profile context, event filter, event/effective result/penalty/date rows, current pagination, penalty correction, delete action with clear confirmation, and separated account entry.
Forbidden/invented features: duplicate My Growth dashboard or placeholder inside this Records-specific target, Growth metrics, streak, AI analysis, scramble, input method, infinite scroll, progressive loading, or full desktop summary chart.
Information hierarchy: profile/account context → filter → readable Record rows and actions → pagination.
Mobile layout: no horizontal overflow, no card-per-field nesting, accessible action target or compact menu, persistent bottom navigation outside modal states.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, tabular results, dividers, and controlled mobile density.
Korean label rule: Korean UI with +2/DNF; brand text exactly “Cubing Hub”; Records surface를 Growth section으로 잘못 label하지 않는다.
Rendering target: a production-ready responsive Records screenshot feasible with React/CSS and current pagination behavior.
Negative constraints: apply every Master negative constraint unchanged; do not turn empty space into analytics or social/profile content.
~~~

### My Growth prompts

#### My Growth Desktop

~~~text
SCREEN: My Growth Desktop — CURRENT CAPABILITY / V2.2 TARGET PRESENTATION, private authenticated owner view, WCA_333, 1440×900.
Screen goal: explain current skill, recent direction, consistency, PB development, recorded Practice activity, and the next deterministic Practice action in that order.
Allowed features: Current PB, Recent Ao5, Recent Ao12; recent completed 7-day median versus previous completed 7-day median; 30-day daily median; latest-12 versus previous-12 IQR with DNF/+2 count, rate, sample and insufficient-sample gate; retained-record PB progression; approved 7/previous-7/30-day counts, 30-day active days/daily counts, first/latest recorded activity; deterministic Next Practice Timer CTA.
Forbidden/invented features: streak, generic mean score, stability score, standard deviation, session analytics, AI coaching, technique/F2L weakness analysis, smart cube telemetry, Public Profile, social comparison, prediction, or arbitrary metric.
Information hierarchy: 현재 실력 → 최근 방향 → 안정성 → PB 발전 → Practice 활동 → 다음 Practice; state clearly in generation metadata that the capability is current while the redesigned presentation is an unapproved V2.2 target artifact.
Desktop layout: one primary reading column with supporting two-column regions where useful, limited charts, dividers and measured surfaces rather than one rounded card per metric.
Shared visual system: apply the full Master Prompt, Measured Momentum, exact palette, tabular numerals, restrained PB amber, sparse chart grid, and desktop shell.
Korean label rule: use `중앙값`, `일별 중앙값`, `최근 12회 기록 범위`, `기록된 활동`, `현재 남아 있는 기록 기준`; preserve PB/Ao5/Ao12/+2/DNF; brand text exactly “Cubing Hub”.
Rendering target: a realistic V2.2 target web-app screenshot feasible in React/Recharts/CSS, not a generic analytics dashboard.
Negative constraints: apply every Master negative constraint unchanged; Next Practice is deterministic and must never look like AI coaching or personalized prediction.
~~~

#### My Growth Mobile

~~~text
SCREEN: My Growth Mobile — CURRENT CAPABILITY / V2.2 TARGET PRESENTATION, private authenticated owner view, WCA_333, 390×844.
Screen goal: preserve the exact V2.2 Growth question order while keeping each metric and chart readable on mobile.
Allowed features: the same approved PB/Ao5/Ao12, completed 7-day median comparison, 30-day daily median, latest-12 IQR with DNF/+2 count/rate/sample, retained-record PB progression, recorded-activity metrics, and deterministic Timer CTA as the desktop target.
Forbidden/invented features: streak, average score, stability score, standard deviation, session, coaching, technique analysis, smart-cube data, public/social profile, prediction, or extra activity metric.
Information hierarchy: 현재 실력 → 최근 방향 → 안정성 → PB 발전 → Practice 활동 → 다음 Practice, one question at a time.
Mobile layout: one chart per visible section, sparse labels plus text summary, compact section navigation, bottom navigation and safe area, no horizontal chart overflow or metric-card wall.
Shared visual system: apply the complete Master Prompt, exact palette, tabular numerals, Measured Momentum, restrained chart density, and mobile shell intent.
Korean label rule: use the exact approved Korean metric labels and technical abbreviations; brand text exactly “Cubing Hub”.
Rendering target: a plausible V2.2 mobile target screenshot implementable with React/Recharts/CSS.
Negative constraints: apply every Master negative constraint unchanged; do not simplify by inventing a composite score or recommendation engine.
~~~

### Community prompts

#### Community List Desktop

~~~text
SCREEN: Community List Desktop — CURRENT-SAFE, 1440×900.
Screen goal: find and open current posts by category, keyword, or author and expose the authenticated write action.
Allowed features: ALL/FREE/NOTICE category controls, title/content keyword search, author search, write CTA for an authenticated state, rows containing category/title/author/created date/view count, and current pagination.
Forbidden/invented features: comment count, like, reaction, bookmark count, trending score, follower, creator badge, online state, tag cloud, or recommendation.
Information hierarchy: page title and write action → category/search controls → dense post list → pagination.
Desktop layout: content-first list or table with compact metadata, stable reading width, and minimal card framing; establish reusable list primitives for Q&A.
Shared visual system: apply the complete Master Prompt, Measured Momentum, exact palette, divider hierarchy, restrained current-category emphasis, and desktop shell.
Korean label rule: Korean current category/search/list labels; brand text exactly “Cubing Hub”; do not invent engagement labels.
Rendering target: a realistic production community-list screenshot feasible with current React/CSS components.
Negative constraints: apply every Master negative constraint unchanged; each row uses only current list-response fields.
~~~

#### Community List Mobile

~~~text
SCREEN: Community List Mobile — CURRENT-SAFE, 390×844.
Screen goal: scan and search current posts without losing category, author, date, and view context.
Allowed features: compact ALL/FREE/NOTICE control, keyword/author search, authenticated write action, title/category/author/date/view metadata, and current pagination.
Forbidden/invented features: comment count, social engagement, trend badge, follower, online state, infinite scroll, or recommended post block.
Information hierarchy: compact heading/write → category/search → post rows → pagination.
Mobile layout: deliberate two-line rows when needed, no card per metadata field, bottom navigation with safe-area spacing, search controls that do not overflow.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, divider-driven content list, controlled radius, and mobile shell.
Korean label rule: Korean current labels only; brand text exactly “Cubing Hub”; no invented social copy.
Rendering target: a production-ready responsive Community list screenshot feasible in React/CSS.
Negative constraints: apply every Master negative constraint unchanged; do not add unsupported counts, chips, badges, or sorting.
~~~

#### Community Detail Desktop

~~~text
SCREEN: Community Detail Desktop — CURRENT-SAFE, one explicit authenticated or guest state, 1440×900.
Screen goal: read one post, view its actual attachments, and use only permitted post/comment actions.
Allowed features: category/title/author/date/view count, body, current image attachments, paginated comments with author/content/date, authenticated comment form, and author/ADMIN edit/delete controls only when that permission state is chosen.
Forbidden/invented features: like, reaction, bookmark, follower, creator badge, related-post recommendation, online state, or comment score.
Information hierarchy: metadata and permitted actions → readable title/body/attachments → comments → current comment pagination/form.
Desktop layout: narrow reading column within the app shell, attachments at content width, actions visually secondary, comments reuse the approved content primitives.
Shared visual system: apply the complete Master Prompt, exact palette, Measured Momentum, reading-width typography, restrained borders, and desktop navigation.
Korean label rule: Korean current post/comment labels; brand text exactly “Cubing Hub”; permission labels must match the selected current state.
Rendering target: a realistic production post-detail screenshot implementable with normal React/CSS and current APIs.
Negative constraints: apply every Master negative constraint unchanged; no unsupported engagement bar or content recommendation.
~~~

#### Community Detail Mobile

~~~text
SCREEN: Community Detail Mobile — CURRENT-SAFE, one explicit authenticated or guest state, 390×844.
Screen goal: preserve reading comfort and current comment/action behavior on mobile.
Allowed features: current post metadata/body/attachments, paginated comments, authenticated comment form, and author/ADMIN action menu only for the chosen permission state.
Forbidden/invented features: reaction bar, like/bookmark, follower, related/trending posts, online badge, comment vote, or sticky social controls.
Information hierarchy: title and metadata → body and attachments → permitted actions → comments/form/pagination.
Mobile layout: single reading column, responsive images, compact permission menu, reachable comment submit, bottom navigation outside focused form state.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, readable Korean typography, measured dividers, and mobile shell.
Korean label rule: Korean current labels only; brand text exactly “Cubing Hub”; no invented social labels.
Rendering target: a plausible responsive post-detail screenshot feasible with React/CSS and current content behavior.
Negative constraints: apply every Master negative constraint unchanged; preserve empty space around long-form content rather than filling it.
~~~

#### Community Write Desktop

~~~text
SCREEN: Community Write Desktop — CURRENT-SAFE, authenticated, 1440×900.
Screen goal: compose and submit one current Community post with optional image attachments.
Allowed features: FREE category for a normal user or FREE/NOTICE for an ADMIN state, title, body, multiple image attachment queue up to five, validation/loading/error, submit, and cancel/back.
Forbidden/invented features: poll, tags, rich social preview, collaboration, scheduled publish, draft sharing, reaction settings, or AI writing.
Information hierarchy: page/form context → category/title → body → attachment queue and constraints → validation → submit/cancel.
Desktop layout: form-first centered column with enough body-writing width, attachment rows as functional units, concise guidance rather than decorative cards.
Shared visual system: apply the complete Master Prompt, exact palette, Measured Momentum, current form primitives, controlled radius, and desktop shell.
Korean label rule: Korean current form labels and validation; brand text exactly “Cubing Hub”; do not expose ADMIN-only NOTICE in a normal-user state.
Rendering target: a realistic production form screenshot implementable with current React/CSS and multipart behavior.
Negative constraints: apply every Master negative constraint unchanged; no invented editor toolbar or social publishing option.
~~~

### Q&A prompts

#### Q&A List Desktop

~~~text
SCREEN: Q&A List Desktop — CURRENT-SAFE, 1440×900, after Community responsive primitives are approved.
Screen goal: browse answered public questions and move authenticated members to the existing Feedback submission route.
Allowed features: PUBLIC answered feedback only, current public-answer total, type/title, question and ADMIN-answer preview, generic questioner/answerer labels, published date, current pagination, and a question CTA linking to protected Feedback.
Forbidden/invented features: waiting row, answered/waiting filter, visibility control, vote, reputation, accepted-answer score, expert badge, follower, or inline anonymous submit.
Information hierarchy: Q&A heading and question CTA → answered public list → pagination.
Desktop layout: reuse Community List's spacing, row, metadata, toolbar, and pagination language; Q&A-specific type is the only additional list signal.
Shared visual system: apply the complete Master Prompt and the approved Community content system, exact palette, Measured Momentum, and desktop shell.
Korean label rule: Korean current labels with generic `사용자`; brand text exactly “Cubing Hub”; do not label public items as waiting.
Rendering target: a realistic production Q&A list screenshot feasible with the current React/CSS/API model.
Negative constraints: apply every Master negative constraint unchanged; do not imitate Stack Overflow mechanics.
~~~

#### Q&A Detail Desktop

~~~text
SCREEN: Q&A Detail Desktop — CURRENT-SAFE, answered PUBLIC item, 1440×900.
Screen goal: read one public question and its ADMIN answer with clear metadata.
Allowed features: type, title, question content, generic questioner label, created date, ADMIN answer, answerer label, answered/published timestamps, and back-to-list navigation.
Forbidden/invented features: unanswered state, public status control, vote, accepted-answer score, expert badge, comments, follower, reaction, or related questions.
Information hierarchy: question metadata/title/content → clearly separated ADMIN answer → timestamps and list navigation.
Desktop layout: reuse Community Detail reading width and metadata primitives while giving the answer a measured surface, not a celebratory accepted-answer card.
Shared visual system: apply the complete Master Prompt and approved Community detail system, exact palette, Measured Momentum, and restrained surfaces.
Korean label rule: use current generic `사용자` and `관리자` labels; brand text exactly “Cubing Hub”.
Rendering target: a production-ready answered Q&A screenshot implementable with current React/CSS.
Negative constraints: apply every Master negative constraint unchanged; no social/reputation system or fabricated status.
~~~

#### Q&A Mobile Core

~~~text
SCREEN: Q&A Mobile Core — CURRENT-SAFE, answered PUBLIC item, 390×844.
Screen goal: preserve the core public question-and-answer reading state on mobile.
Allowed features: type/title, generic questioner/date, question content, ADMIN answer and answer timestamp, back-to-list, and mobile bottom navigation.
Forbidden/invented features: waiting state/filter, public answer form, vote, reputation, expert badge, follower, comments, reactions, or related content.
Information hierarchy: compact metadata/title → question → ADMIN answer → back navigation.
Mobile layout: one readable column, no nested cards, safe-area spacing, answer begins clearly without relying on color alone.
Shared visual system: apply the full Master Prompt and approved Community mobile detail primitives, exact palette, and Measured Momentum.
Korean label rule: Korean UI with `사용자` and `관리자`; brand text exactly “Cubing Hub”.
Rendering target: a realistic responsive Q&A detail screenshot feasible with current React/CSS.
Negative constraints: apply every Master negative constraint unchanged; retain calm whitespace instead of adding engagement controls.
~~~

### Learning prompts

#### Learning Desktop

~~~text
SCREEN: Learning Desktop — CURRENT-SAFE, 1440×900.
Screen goal: browse the current notation, beginner, F2L, OLL, or PLL curriculum and study concrete cases.
Allowed features: current tabs, section title/description, repeated case units with case name/title, algorithm, and VisualCube diagram.
Forbidden/invented features: completion check, progress percentage, streak, personalized curriculum, recommended next lesson, achievement, quiz score, or social annotation.
Information hierarchy: curriculum tabs → current section context → scannable case units with diagram and algorithm.
Desktop layout: case cards are allowed because each is a real repeated content unit; avoid page panel → section card → case card triple nesting.
Shared visual system: apply the complete Master Prompt, exact palette, Measured Momentum, readable algorithm typography, restrained case surfaces, and desktop shell.
Korean label rule: Korean curriculum labels while preserving F2L/OLL/PLL and algorithm notation; brand text exactly “Cubing Hub”.
Rendering target: a realistic production learning-page screenshot feasible with current static data and React/CSS.
Negative constraints: apply every Master negative constraint unchanged; no progress/recommendation data or decorative lesson badges.
~~~

#### Learning Mobile

~~~text
SCREEN: Learning Mobile — CURRENT-SAFE, 390×844.
Screen goal: select a current curriculum and read case diagram plus algorithm without horizontal loss.
Allowed features: scrollable or compact current tabs, section context, current case name/title, VisualCube diagram, and algorithm text.
Forbidden/invented features: completion, progress, personalized next lesson, streak, reward, quiz, social note, or new curriculum.
Information hierarchy: compact tabs → section context → one case after another, each keeping diagram and algorithm together.
Mobile layout: controlled tab overflow, readable algorithm wrapping/scroll treatment, case surfaces without outer card nesting, bottom navigation and safe area.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, restrained cards, and current mobile shell.
Korean label rule: Korean labels with F2L/OLL/PLL and notation preserved; brand text exactly “Cubing Hub”.
Rendering target: a plausible responsive Learning screenshot implementable with current React/CSS/static data.
Negative constraints: apply every Master negative constraint unchanged; no progress indicator, recommendation, or invented case metadata.
~~~

### Auth prompts

#### Login Desktop

~~~text
SCREEN: Login Desktop — CURRENT-SAFE, guest-only, 1440×900.
Screen goal: authenticate with the current email/password flow and expose current recovery and signup links.
Allowed features: existing Cubing Hub asset, email, password, submit, loading/error, Signup link, Password Reset link, and current redirect context only if explicitly provided.
Forbidden/invented features: Google/Apple/Kakao login, passkey, magic link, remember-me persistence, profile preview, marketing metrics, testimonial, or new auth option.
Information hierarchy: brand context → compact Login form → inline feedback → Signup and Password Reset links.
Desktop layout: form-first constrained column inside the app shell or restrained auth shell; no giant split-screen illustration or marketing hero.
Shared visual system: apply the complete Master Prompt, exact palette, Measured Momentum, current form primitives, minimal elevation, and existing logo asset.
Korean label rule: Korean auth labels; brand text exactly “Cubing Hub”; email/password field meaning must match current flow.
Rendering target: a realistic production Login screenshot feasible with current React/CSS and browser form behavior.
Negative constraints: apply every Master negative constraint unchanged; no fake provider, reward, account statistic, or redesigned logo.
~~~

#### Login Mobile

~~~text
SCREEN: Login Mobile — CURRENT-SAFE, guest-only, 390×844.
Screen goal: complete current email/password login with recovery links visible and keyboard-safe.
Allowed features: existing asset, email/password, submit, loading/error, Signup and Password Reset links.
Forbidden/invented features: social login, passkey, magic link, remember-me, testimonial, illustration carousel, or extra account option.
Information hierarchy: compact brand → form → feedback → recovery/signup links.
Mobile layout: safe-area and keyboard-aware spacing, reachable submit, no field hidden by decorative content, no bottom navigation on guest auth.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, form-first mobile geometry, and existing logo rule.
Korean label rule: Korean labels and exact `Cubing Hub` brand text.
Rendering target: a realistic mobile web Login screenshot feasible with current React/CSS.
Negative constraints: apply every Master negative constraint unchanged; no invented provider button or visual filler feature.
~~~

#### Signup / Verification Desktop

~~~text
SCREEN: Signup / Email Verification Desktop — CURRENT-SAFE, guest-only, one explicit current step, 1440×900.
Screen goal: show one real stage of email verification and account creation without combining impossible states.
Allowed features: email, verification-code request, code confirm/resend when valid for the chosen step, nickname, main event, password/confirm, validation/loading/error, submit, and Login link.
Forbidden/invented features: social signup, phone verification, username availability badge beyond current validation, profile photo, terms workflow not present in current source, progress gamification, or future event support.
Information hierarchy: brand/context → current step title → fields and verification action → feedback → next/submit and Login link.
Desktop layout: constrained form column with step clarity; do not show all controls as simultaneously completed unless the chosen current state supports it.
Shared visual system: apply the complete Master Prompt, exact palette, Measured Momentum, current form primitives, and existing asset.
Korean label rule: Korean labels, current EventType presentation, brand text exactly “Cubing Hub”.
Rendering target: a realistic production Signup/Verification screenshot feasible with current React/CSS and auth API states.
Negative constraints: apply every Master negative constraint unchanged; no fake provider, profile system, reward, or unsupported signup field.
~~~

#### Signup / Verification Mobile

~~~text
SCREEN: Signup / Email Verification Mobile — CURRENT-SAFE, guest-only, one explicit current step, 390×844.
Screen goal: complete the selected real email-verification/signup step with clear validation on mobile.
Allowed features: only the current step's email/code/resend or nickname/main-event/password fields, submit, feedback, and Login link.
Forbidden/invented features: social/phone signup, profile photo, gamified progress, unsupported terms flow, extra event capability, or all steps shown as one dense dashboard.
Information hierarchy: compact brand and step → fields/action → validation → next/submit → Login link.
Mobile layout: keyboard-aware vertical flow, reachable code action and submit, no horizontal field pair that reduces readability.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, current mobile form primitives, and existing logo rule.
Korean label rule: Korean current copy and exact `Cubing Hub` brand text.
Rendering target: a plausible production mobile auth screenshot implementable with current React/CSS.
Negative constraints: apply every Master negative constraint unchanged; do not invent a provider, profile field, badge, or completion reward.
~~~

#### Password Reset Desktop

~~~text
SCREEN: Password Reset Desktop — CURRENT-SAFE, one explicit recovery step, 1440×900.
Screen goal: recover an account through the current email-code flow and set a new password.
Allowed features: email, verification-code request/confirm, new password/confirm, resend where current, validation/loading/error, submit, and Login link for the chosen step.
Forbidden/invented features: security questions, phone recovery, social provider recovery, support chat, account details, recovery score, or device list.
Information hierarchy: recovery context → selected-step fields/action → feedback → next/submit → Login link.
Desktop layout: form-first constrained width, clear current step, restrained brand asset, no decorative split-screen takeover.
Shared visual system: apply the complete Master Prompt, exact palette, Measured Momentum, current auth form primitives, and existing logo rule.
Korean label rule: Korean recovery labels and brand text exactly “Cubing Hub”.
Rendering target: a realistic production Password Reset screenshot feasible with current React/CSS/API behavior.
Negative constraints: apply every Master negative constraint unchanged; no invented recovery method, security metric, or marketing content.
~~~

#### Password Reset Mobile

~~~text
SCREEN: Password Reset Mobile — CURRENT-SAFE, one explicit recovery step, 390×844.
Screen goal: complete the selected current email verification or new-password step with clear mobile feedback.
Allowed features: selected-step email/code/resend or new password/confirm fields, submit, loading/error, and Login link.
Forbidden/invented features: phone/security-question recovery, social provider, support chat, device management, or extra account state.
Information hierarchy: compact brand/context → fields/action → feedback → Login link.
Mobile layout: keyboard-aware form, visible submit, error placed near its field, no guest bottom navigation.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, mobile auth primitives, and existing asset rule.
Korean label rule: Korean current labels and exact `Cubing Hub` brand text.
Rendering target: a plausible production mobile recovery screenshot implementable with current React/CSS.
Negative constraints: apply every Master negative constraint unchanged; no invented method, metric, badge, or logo.
~~~

### Feedback prompts

#### Feedback Desktop

~~~text
SCREEN: Feedback Desktop — CURRENT-SAFE, authenticated, 1440×900.
Screen goal: submit one current feedback item clearly and efficiently.
Allowed features: BUG/FEATURE/UX/OTHER type, reply email, title, content, concise current guidance, validation/loading/error/success, and submit.
Forbidden/invented features: ticket history, priority/SLA picker, vote, live chat, file attachment, public toggle, assignee, or support analytics.
Information hierarchy: purpose/guidance → type and reply email → title/content → feedback → submit.
Desktop layout: form-first medium-width column reusing Community Write primitives, no dashboard summary or decorative card wall.
Shared visual system: apply the complete Master Prompt, exact palette, Measured Momentum, current form primitives, and desktop shell.
Korean label rule: Korean current feedback labels; brand text exactly “Cubing Hub”; enum meanings remain current.
Rendering target: a realistic production Feedback screenshot feasible with current React/CSS/API behavior.
Negative constraints: apply every Master negative constraint unchanged; no invented workflow, history, engagement, or attachment feature.
~~~

#### Feedback Mobile

~~~text
SCREEN: Feedback Mobile — CURRENT-SAFE, authenticated, 390×844.
Screen goal: submit current feedback with readable fields and reachable action on mobile.
Allowed features: current type, reply email, title, content, validation/loading/error/success, and submit.
Forbidden/invented features: ticket list, priority, live chat, upload, public control, vote, assignee, or analytics.
Information hierarchy: compact guidance → type/email → title/content → feedback → submit.
Mobile layout: keyboard-aware single column, textarea remains usable, submit stays reachable, bottom navigation outside focused input when appropriate.
Shared visual system: apply the full Master Prompt, exact palette, Measured Momentum, mobile form primitives, and current shell.
Korean label rule: Korean current labels and exact `Cubing Hub` brand text.
Rendering target: a plausible responsive Feedback screenshot implementable with current React/CSS.
Negative constraints: apply every Master negative constraint unchanged; do not fill space with ticket status, chat, or metrics.
~~~

### Admin prompts

#### Admin Operations Desktop

~~~text
SCREEN: Admin Operations Desktop — CURRENT-SAFE, ADMIN, 1440×900.
Screen goal: process current feedback and internal memos with operational density.
Allowed features: feedback list with answered and visibility filters, current list fields/status/pagination, memo list with ANSWERED/UNANSWERED and pagination, memo-create form, and navigation to current detail routes.
Forbidden/invented features: user-growth KPI, traffic chart, moderation queue, user management, role editor, system health, deployment status, notification center, or analytics dashboard.
Information hierarchy: operational section selection → compact filters/actions → dense feedback or memo table → pagination; show one coherent selected section rather than every tool at once.
Desktop layout: tables, filters, and forms with restrained status labels; no oversized summary cards or decorative admin icon grid.
Shared visual system: apply the complete Master Prompt, exact palette, Measured Momentum primitives with higher operational density, and desktop shell.
Korean label rule: Korean current admin labels and exact statuses; brand text exactly “Cubing Hub”.
Rendering target: a realistic production Admin screenshot feasible with current React/CSS and ADMIN routes.
Negative constraints: apply every Master negative constraint unchanged; no generic admin KPI or permission/workflow redesign.
~~~

#### Admin Feedback Detail Desktop

~~~text
SCREEN: Admin Feedback Detail Desktop — CURRENT-SAFE, ADMIN, 1440×900.
Screen goal: inspect one current feedback submission, update its answer, and change its visibility.
Allowed features: submitter nickname, type, reply email, title/content, notification status and attempt count, created/answered/published timestamps, answer form, PRIVATE/PUBLIC visibility control, save actions, and back navigation.
Forbidden/invented features: assignee, priority, SLA, internal chat, user profile analytics, audit timeline not present in API, bulk action, or moderation score.
Information hierarchy: submission identity/status → content → answer form → visibility and save → operational timestamps.
Desktop layout: dense two-region detail/form composition with clear status and destructive/publication consequences, minimal decoration.
Shared visual system: apply the full Master Prompt, exact palette, operational Measured Momentum surfaces, current form/status primitives, and desktop shell.
Korean label rule: Korean current field/status labels; brand text exactly “Cubing Hub”; do not rename visibility or notification semantics.
Rendering target: a realistic production Admin detail screenshot implementable with current React/CSS/API behavior.
Negative constraints: apply every Master negative constraint unchanged; no invented workflow, analytics, user-management, or role control.
~~~

#### Admin Mobile Operations

~~~text
SCREEN: Admin Mobile Operations — CURRENT-SAFE, ADMIN, 390×844.
Screen goal: preserve the core current feedback or memo processing state on mobile without turning every row into a decorative card.
Allowed features: one selected current admin section, its current filters/status fields/list or detail form, pagination, and route navigation.
Forbidden/invented features: KPI dashboard, traffic/user chart, moderation queue, user management, role controls, deployment/system health, or bulk workflow.
Information hierarchy: selected operation → compact filter/status → list rows or detail/form → pagination/save.
Mobile layout: single operational task at a time, horizontal overflow avoided through prioritized current fields, accessible actions, no public-user bottom navigation if the current shell differs.
Shared visual system: apply the complete Master Prompt, exact palette, high-density operational primitives, restrained status color, and responsive shell.
Korean label rule: Korean current admin labels/statuses and exact `Cubing Hub` brand text.
Rendering target: a plausible production mobile Admin screenshot feasible with current React/CSS and permissions.
Negative constraints: apply every Master negative constraint unchanged; no generic dashboard metric, new permission, or unsupported operation.
~~~

## Image generation sequence

한 단계에서 responsive rule과 capability safety가 승인되기 전에는 다음 단계로 넘어가지 않는다. 기존 exploration image도 이 contract를 통과하지 않았다면 Approved Target으로 취급하지 않는다.

```text
ANCHOR — APPROVED
Timer Desktop Normal
Timer Desktop Focus
Timer Mobile Portrait
Timer Mobile Landscape Focus

CORE CURRENT-SAFE
Home Desktop
Home Mobile

Rankings Desktop
Rankings Mobile

MyPage Records Desktop
MyPage Records Mobile

V2.2 TARGET PRESENTATION
My Growth Desktop
My Growth Mobile

CONTENT SYSTEM
Community List Desktop
Community List Mobile
Community Detail Desktop
Community Detail Mobile
Community Write Desktop
Community responsive rule approval

Q&A List Desktop
Q&A Detail Desktop
Q&A Mobile Core

Learning Desktop
Learning Mobile

AUTH / UTILITY
Login Desktop
Login Mobile
Signup / Verification Desktop
Signup / Verification Mobile
Password Reset Desktop
Password Reset Mobile
Feedback Desktop
Feedback Mobile
Admin Operations Desktop
Admin Feedback Detail Desktop
Admin Mobile Operations
```

Timer 네 화면은 새로 생성하는 첫 단계가 아니라 외부 승인 anchor를 repository에 import하기 전 확인하는 기준이다. Home과 Rankings의 이전 exploration도 current-safe capability 검토와 새 target 승인을 통과해야 한다.

## Approved Target storage policy

### Exploration

다음과 같은 중간 image는 repository에 commit하지 않는다.

```text
variant-a
variant-b
wrong-feature version
revision 1
revision 2
```

잘못된 기능이 들어간 결과, 비교용 variation, correction 중간본, 선택되지 않은 desktop/mobile 결과는 외부 작업 공간에서만 관리한다.

### Approved Target

화면별 최종 승인이 끝난 PNG만 다음 stable path에 저장한다.

```text
docs/assets/ui-targets/
├─ timer/
│  ├─ desktop.png
│  ├─ desktop-focus.png
│  ├─ mobile-portrait.png
│  └─ mobile-landscape.png
├─ home/
│  ├─ desktop.png
│  └─ mobile.png
├─ rankings/
│  ├─ desktop.png
│  └─ mobile.png
├─ mypage/
│  ├─ desktop.png
│  └─ mobile.png
├─ growth/
│  ├─ desktop.png
│  └─ mobile.png
├─ community/
│  ├─ list/
│  │  ├─ desktop.png
│  │  └─ mobile.png
│  ├─ detail/
│  │  ├─ desktop.png
│  │  └─ mobile.png
│  └─ write/
│     └─ desktop.png
├─ qna/
│  ├─ list/
│  │  └─ desktop.png
│  └─ detail/
│     ├─ desktop.png
│     └─ mobile-core.png
├─ learning/
│  ├─ desktop.png
│  └─ mobile.png
├─ auth/
│  ├─ login/
│  │  ├─ desktop.png
│  │  └─ mobile.png
│  ├─ signup/
│  │  ├─ desktop.png
│  │  └─ mobile.png
│  └─ password-reset/
│     ├─ desktop.png
│     └─ mobile.png
├─ feedback/
│  ├─ desktop.png
│  └─ mobile.png
└─ admin/
   ├─ desktop.png
   ├─ feedback-detail-desktop.png
   └─ mobile.png
```

PNG를 사용해 text와 edge fidelity를 우선한다. 기본 파일명은 `desktop.png`, `mobile.png`처럼 역할이 고정된 이름을 사용하고 variant가 실제 승인 target으로 분리된 경우에만 `desktop-focus.png`처럼 stable state suffix를 쓴다.

```text
final.png
final-v2.png
approved-final.png
really-final.png
```

위 이름은 사용하지 않는다. version은 Git history로 관리한다. directory나 placeholder file은 target 승인 전에 만들지 않는다.

## Mockup approval gate

다음 단계는 서로 독립적이다.

```text
exploration 생성
→ 선택
→ 수정
→ target 승인
→ approved target 저장
→ code implementation
```

이미지가 생성됐거나 visually plausible하다는 이유만으로 Approved Target이 되지 않는다. target 승인 전 repository import를 금지하고, target 저장 승인이 code 구현 승인까지 포함하지 않는다.

승인 검토에서는 최소 다음을 확인한다.

- screen classification과 허용 capability만 사용했는가
- 금지된 feature, field, badge, status, navigation을 만들지 않았는가
- Desktop/Mobile이 같은 기능 계약과 visual system을 공유하는가
- hierarchy, density, spacing, surface, palette, type proportion이 의도와 맞는가
- image text·number의 hallucination을 기능 요구사항으로 해석하지 않았는가

## Visual and functional Source of Truth

Approved Target Mockup이 결정하는 범위:

```text
composition
layout
visual hierarchy
density
relative spacing
surface treatment
palette balance
type hierarchy
major component proportion
responsive visual intent
```

Repository code, docs와 test가 결정하는 범위:

```text
actual text
actual data
functionality
API
auth
Timer state
Record lifecycle
permissions
routing
keyboard
touch
focus
accessibility
loading
error
responsive functional behavior
```

이미지의 오탈자, fake number, hallucinated text, 끊긴 control, 비현실적인 geometry는 구현하지 않는다. Approved Target이 current functional contract를 바꾸지 않는다.

## Implementation handoff contract

실제 화면 구현 prompt에는 최소 다음 입력이 필요하다.

```text
Functional Source of Truth
+
Screen Contract
+
Approved desktop target
+
Approved mobile target
+
Design System
```

Approved target이 아직 없는 화면은 code implementation gate를 통과하지 못한다. 구현은 image의 pixel을 복제하는 작업이 아니며 다음 visual intent를 맞춘다.

```text
primary focus
layout hierarchy
relative spacing
palette
surface hierarchy
type hierarchy
density
major proportions
navigation structure
```

mockup과 accessibility 또는 usability가 충돌하면 functional/accessibility contract를 우선한다. responsive breakpoint에서 기능을 삭제하거나 image에 보인다는 이유로 새 기능을 추가하지 않는다.

## Contract maintenance

- current code/API가 바뀌면 관련 capability row와 screen prompt를 같은 변경에서 갱신한다.
- capability state가 바뀌면 route, component, API, test와 migration evidence를 다시 대조한 뒤 `CURRENT` classification과 관련 prompt를 같은 변경에서 갱신한다.
- 새 screen target은 capability classification과 prompt가 먼저 승인된 뒤 exploration을 시작한다.
- prompt 수정으로 허용 기능이 늘어나면 product/requirement 승인부터 다시 확인한다.
- 새 Approved Target을 import할 때 image file뿐 아니라 이 문서의 repository state와 generation sequence 상태를 갱신한다.
