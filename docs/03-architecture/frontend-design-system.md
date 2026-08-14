---
doc_type: architecture
status: draft
created: 2026-08-11
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/ui-mockup-contract.md
  - docs/00-product/ui-visual-direction.md
  - docs/01-domain/growth-metrics.md
  - docs/02-requirements/features/timer.md
  - docs/02-requirements/features/growth.md
  - docs/02-requirements/features/profile.md
  - docs/03-architecture/frontend-architecture.md
  - docs/03-architecture/growth-architecture.md
  - docs/06-quality/test-strategy.md
  - docs/06-quality/quality-gates.md
  - docs/08-decisions/adr-0007-canonical-timer-time-input-provenance.md
  - docs/08-decisions/adr-0008-record-submission-idempotency.md
  - docs/08-decisions/adr-0010-current-record-growth-read-contract.md
---
# Frontend Design System

## Status and responsibility

이 문서는 [UI Visual Direction](../00-product/ui-visual-direction.md)을 React frontend에 적용하기 위한 architecture proposal이다. semantic token, primitive, layout, App Shell, responsive, accessibility, visual validation과 구현 순서를 다룬다. 화면별 capability와 image-generation input은 [UI Mockup Screen Contract](../00-product/ui-mockup-contract.md)를 따른다.

Current implementation 설명은 [Frontend Architecture](frontend-architecture.md), Timer 요구사항은 [Timer](../02-requirements/features/timer.md), V2.2 Growth metric과 API proposal은 [Growth Metrics](../01-domain/growth-metrics.md)와 [Growth Architecture](growth-architecture.md)가 Source of Truth다. 이 문서가 기능·API 계약을 다시 정의하지 않는다.

## Design System decision timing

현재 Design Gate는 semantic foundation을 정한다. Measured Momentum, warm neutral canvas, deep green primary, amber PB accent, light-first, Timer dark focus stage, accessibility invariant와 semantic token은 이 단계에서 유지한다.

Approved Target Mockup 뒤에는 implementation-ready visual detail을 확정한다. mockup은 visual reference일 뿐이며 functional contract나 accessibility contract를 바꾸지 않는다.

| Decision layer | 확정 범위 |
| --- | --- |
| Semantic foundation | color의 domain 의미, typography 역할, light-first boundary, Timer focus surface, accessibility invariant, component의 semantic 책임 |
| Target-dependent visual detail | exact spacing, radius frequency, border frequency, navigation height, content width, typography scale, component proportion, Timer stage proportion, chart density, surface treatment |

Target-dependent detail은 selected target의 hierarchy와 responsive intent를 읽어 token value와 component geometry로 옮긴다. target approval 전에는 visual value를 production implementation 계약으로 고정하지 않는다.

## Current frontend inventory

| Area | Current | Design implication |
| --- | --- | --- |
| Route and shell | `frontend/src/App.jsx`가 lazy route, auth guard, top navigation, mobile tab과 footer를 소유 | route/guard를 보존하고 nav model과 shell presentation을 분리한다. |
| Global style | `frontend/src/styles/base.css`, `responsive.css`와 9개 page CSS를 전역 import | semantic token과 primitive style을 먼저 만들고 page를 하나씩 migration한다. |
| Shared component | `frontend/src/components/GroupedPagination.jsx` | behavior는 재사용하고 visual primitive로 정리한다. |
| Timer | `TimerPage.jsx`, `useCubeTimer`, `timerMachine`, input adapter와 인접 test | state machine과 browser orchestration은 유지하고 presentation component만 분리한다. |
| MyPage | `MyPage.jsx`가 profile, summary, chart, Record 관리와 account modal을 소유 | `/mypage` section layout과 domain component를 분리한다. |
| Chart | Recharts 3.8.1 | Growth chart에 재사용한다. 새 chart dependency는 추가하지 않는다. |
| Icon | Lucide React | outline icon을 유지하고 size/stroke/semantic usage를 제한한다. |
| Feedback | React Toastify, inline message, native confirm | Toast, InlineAlert, ConfirmDialog의 역할을 구분한다. |
| Test | Vitest, Testing Library, page/component test | interaction regression은 유지한다. screenshot test infrastructure는 없다. |
| Asset | `CUBINGHUB.png`, VisualCube URLs | functional cube diagram은 VisualCube를 유지하고 brand asset은 별도 gate를 거친다. |

Current source에는 4,309줄의 CSS와 881줄 `TimerPage.jsx`, 927줄 `MyPage.jsx`가 있다. 숫자는 redesign 필요성을 증명하는 품질 지표가 아니라 migration risk를 설명하는 inventory다.

## Foundation tokens

Token name은 semantic purpose를 나타낸다. component가 hex, arbitrary spacing, radius 또는 shadow를 직접 선택하지 않는다. 아래 값은 Measured Momentum proposal의 light-first starting point다. semantic 의미는 유지하고 exact value와 component geometry는 Approved Target Mockup 뒤에 확정한다. contrast는 implementation gate에서 다시 확인한다.

### Color

```css
--color-background: #f3f5f2;
--color-surface: #fafbf9;
--color-surface-raised: #ffffff;
--color-surface-subtle: #e9eeea;

--color-text-primary: #111a1f;
--color-text-secondary: #3a474d;
--color-text-muted: #667277;

--color-border: #d5ddd8;
--color-border-strong: #a8b4ad;

--color-primary: #136b57;
--color-primary-hover: #0f5a49;
--color-primary-active: #0b493c;

--color-success: #18744b;
--color-warning: #a55f05;
--color-danger: #b42318;

--color-pb: #c27100;
--color-plus-two: #a55f05;
--color-dnf: #b42318;

--color-timer-idle: #66736d;
--color-timer-holding: #a86100;
--color-timer-ready: #0f7a5b;
--color-timer-running: #155e75;
--color-timer-stopped: #1b252b;

--color-timer-stage: #10191f;
--color-timer-stage-text: #f7faf8;
```

| Token group | Semantic purpose |
| --- | --- |
| background | application canvas. content surface와 분리하되 gradient를 사용하지 않는다. |
| surface | ordinary section과 content region |
| surface-raised | modal, popover, sticky control처럼 elevation이 필요한 요소 |
| surface-subtle | grouped data, selected row와 quiet control background |
| text-primary/secondary/muted | heading/data, explanatory copy, metadata 순서. muted도 contrast gate를 통과해야 한다. |
| border/border-strong | ordinary separation과 selected/focus-independent emphasis |
| primary states | primary action과 selected navigation. decoration에는 사용하지 않는다. |
| success/warning/danger | outcome과 actionable status. color와 label/icon을 함께 사용한다. |
| pb/plus-two/dnf | 큐빙 결과의 domain signal. success/warning/danger와 목적을 섞지 않는다. |
| timer state | Timer 상태의 accent. 전체 화면을 색으로 채우지 않고 label, outline와 indicator에 적용한다. |
| timer stage | light shell 안의 집중 surface. full dark theme token이 아니다. |

Chart는 primary, PB, activity와 neutral grid token을 위 semantic color에서 파생한다. six-face cube color를 chart series palette로 사용하지 않는다.

V2.2는 WCA_333만 지원하므로 event별 accent를 만들지 않는다. `eventType` dimension은 data와 component API에 유지하고, 실제 event가 늘어날 때 의미와 contrast를 검증한 뒤 accent mapping을 추가한다.

### Light / Dark boundary

- V2.2 implementation은 light token map 하나를 제공한다.
- component는 semantic token만 사용해 future dark map을 막지 않는다.
- `prefers-color-scheme`만으로 검증되지 않은 dark theme을 자동 활성화하지 않는다.
- Timer focus stage는 독립 surface이며 global theme switch가 아니다.

### Typography

새 webfont를 먼저 설치하지 않는다. 초기 foundation은 current system font를 정리해 loading, license와 Korean fallback 비용을 만들지 않는다.

```css
--font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
--font-numeric: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
```

| Role | Size proposal | Weight | Rules |
| --- | --- | --- | --- |
| Timer display digits | `clamp(4.5rem, 18vw, 10rem)` | 700 | `tabular-nums`, `lining-nums`, stable decimal alignment, no slashed zero |
| Large statistic | `clamp(2rem, 5vw, 3rem)` | 700 | numeric font, tabular digits |
| Page heading | 1.75rem desktop / 1.5rem mobile | 700 | 한 화면에 하나 |
| Section heading | 1.125~1.25rem | 700 | icon box 없이 text hierarchy 우선 |
| Body | 1rem | 450~500 | 1.55~1.65 line height |
| Label | 0.875rem | 650 | control과 metric 의미 |
| Metadata | 0.75~0.8125rem | 500~600 | muted, uppercase 남발 금지 |
| Table/list numeric | 0.875~1rem | 600 | right alignment, tabular digits |

System monospace의 platform 차이는 desktop Safari, iPhone Safari와 CI browser screenshot에서 확인한다. 숫자 폭이나 Korean UI 조화가 불충분하면 self-hosted font를 별도 dependency decision으로 검토한다.

### Spacing and density

```text
space-1  4px
space-2  8px
space-3  12px
space-4  16px
space-6  24px
space-8  32px
space-12 48px
space-16 64px
```

- control 내부는 8/12/16px, data row는 12/16px, section 사이는 32/48px를 기본으로 한다.
- touch target은 density와 무관하게 최소 44×44px를 유지한다.
- page hierarchy는 `Page → Section → data grouping`이다. grouping마다 surface와 border를 모두 추가하지 않는다.

### Layout

| Token | Proposal | Purpose |
| --- | --- | --- |
| app max width | 1,280px | Home, Growth, Ranking과 content shell |
| reading measure | 70ch~74ch | post, Q&A, help와 long-form content |
| Timer max width | 1,440px 또는 viewport | practice stage와 side rail |
| mobile gutter | 16px | safe-area 별도 포함 |
| tablet gutter | 24px | 600~899px |
| desktop gutter | 32px | 900px 이상 |
| grid | 4 / 8 / 12 columns | mobile / tablet / desktop |
| section rhythm | 32px mobile / 48px desktop | card padding이 아닌 page rhythm |

Breakpoints는 content-driven `600px`, `900px`, `1200px` 세 구간과 Timer landscape media query를 기준으로 한다. Current 520/720/900/1080 media query는 screen migration마다 옮기며 한 번에 formatting하지 않는다.

### Radius, border and shadow

```text
radius-0    0
radius-sm   4px
radius-md   8px
radius-lg   12px
radius-full 999px

border-default 1px
border-strong  2px
```

- control은 8px, top-level raised surface는 최대 12px를 사용한다.
- data row와 chart container는 radius 0~4px 또는 divider만 사용할 수 있다.
- `radius-full`은 status, avatar와 compact segmented selection에만 사용한다.
- shadow는 sticky shell, popover, modal, drawer와 toast에만 둔다.
- card hover lift와 arbitrary colored shadow는 사용하지 않는다.

### Motion and z-index

| Motion token | Value | Use |
| --- | --- | --- |
| fast | 100ms | pressed, state indicator |
| base | 160ms | selected navigation, tooltip |
| slow | 240ms | drawer, modal, short PB reveal |
| easing | `cubic-bezier(0.2, 0, 0, 1)` | enter/selection |

Running Timer, background, gradient와 ordinary card에는 animation을 적용하지 않는다. `prefers-reduced-motion: reduce`에서는 nonessential transition과 chart animation을 제거한다.

```text
base 0
sticky shell 100
mobile navigation 200
popover/drawer overlay 400
modal 500
toast 600
```

새 stacking context를 page CSS에 임의로 추가하지 않는다.

## App Shell architecture

`App.jsx`의 route와 guard behavior는 유지하고 다음 책임을 분리한다.

```text
App
├─ RouteStateBoundary
├─ AppShell
│  ├─ DesktopTopNav
│  ├─ MobileContextBar
│  ├─ MobileBottomNav
│  └─ AccountMenu
└─ Routes
```

Navigation item은 label, path, icon, visibility와 placement를 가진 data model로 관리한다. 인증 상태, ADMIN role과 Growth capability에 따라 item을 만들되 미구현 route를 placeholder로 노출하지 않는다.

### Destination rollout

| Phase | Desktop primary | Mobile bottom | Utility |
| --- | --- | --- | --- |
| existing screen migration | Home, Timer, My Page, Rankings, Explore | Home, Timer, My Page, Rankings, More | Account, Feedback, Admin |
| V2.2 My Growth release | Home, Timer, My Growth, Rankings, Explore | Home, Timer, Growth, Rankings, More | Account, Feedback, Admin |

Explore/More는 Learning, Community와 Q&A를 소유한다. Future Daily Challenge는 별도 제품 승인이 있기 전 data model에도 노출 item을 추가하지 않는다.

`/mypage`는 route를 유지하고 internal section을 query로 deep-link할 수 있게 한다. Existing-screen migration에서는 `/mypage?section=records`를 제공하되 `/mypage`의 current behavior를 유지한다. My Growth 출시 뒤 `/mypage`와 `?section=growth`를 Growth 기본 진입으로 사용한다. 미구현 또는 알 수 없는 section 값은 fake Growth 화면을 만들지 않고 해당 release의 기본 section으로 돌아간다. Account dialog/drawer는 section이 아니며 account menu에서 연다.

## Component architecture

Component는 CSS 표현을 감추는 목적이 아니라 반복되는 semantic behavior와 accessibility를 한곳에서 보장할 때 만든다. Primitive는 첫 실제 consumer와 함께 추가하며 목록 전체를 선구현하지 않는다.

### Foundation primitives

| Group | Components | Contract |
| --- | --- | --- |
| Action | `Button`, `IconButton` | primary/secondary/quiet/danger, loading, disabled, 44px touch target |
| Field | `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio` | label, helper, error id, required와 focus 연결 |
| Selection | `Tabs`, `SegmentedControl` | keyboard selection과 route/section state 구분 |
| Status | `Badge`, `InlineAlert`, `Toast` | Badge는 category/status, Alert는 persistent state, Toast는 transient confirmation |
| Overlay | `Tooltip`, `Popover`, `Modal`, `Drawer`, `ConfirmDialog` | focus trap, escape, return focus, mobile presentation |
| Data | `Table`, `DataList`, `MetricValue`, `Skeleton`, `EmptyState` | numeric alignment, responsive column priority, text alternative |
| Navigation | `Pagination` | current `GroupedPagination` behavior 보존 |

`Tooltip`, `Popover`, `Checkbox`, `Radio`와 `SegmentedControl`은 consumer가 생길 때 추가한다. primitive catalog 완성이 목표가 아니다.

### Layout components

```text
AppShell
Page
PageHeader
Section
Stack
Cluster
ResponsiveGrid
ReadingColumn
DataGroup
```

- `Page`는 width와 gutter를, `Section`은 heading/description/action 관계를 관리한다.
- `DataGroup`은 divider와 density를 제공하며 rounded card를 강제하지 않는다.
- `ResponsiveGrid`는 column count만 바꾸지 않고 slot priority와 named area를 지원한다.

### Domain components

```text
TimerDisplay
ScramblePanel
TimerStateMessage
PendingSolveRecovery
SolveRow
AverageMetric
PBIndicator
LeaderboardRow
GrowthSummary
PeriodComparison
TrendChart
ConsistencySummary
PBProgression
PracticeActivity
NextPracticeCTA
```

Domain component는 formatter나 API shape를 새로 정의하지 않는다. domain utility와 server response를 받아 presentation과 accessible label을 제공한다.

### Reuse, refactor, replace and delete candidates

| Action | Current target | Direction |
| --- | --- | --- |
| Reuse | `timerMachine`, `useCubeTimer`, input adapters | state와 canonical time 계약을 그대로 사용 |
| Reuse | AuthContext, route guards, API modules | shell 분리 뒤에도 authorization과 redirect behavior 유지 |
| Reuse | Recharts 3.8.1 | Growth 세 chart와 current chart migration에 사용 |
| Reuse | Lucide React | outline icon, 16/20/24px, stroke 1.75~2 범위 |
| Reuse | VisualCube | scramble과 Learning functional image 유지 |
| Refactor | `App.jsx` | route와 App Shell/navigation model 분리 |
| Refactor | `GroupedPagination` | behavior 유지, `Pagination` primitive로 style 통합 |
| Refactor | `TimerPage.jsx` | orchestration을 남기고 stage, state, result와 recent rail presentation 분리 |
| Refactor | `MyPage.jsx` | Growth, Records와 Account section 책임 분리 |
| Refactor | record/ranking/community table | `Table`과 mobile-priority `DataList`로 같은 information hierarchy 유지 |
| Replace | `.panel`, `.dashboard-card`, page header icon box | `Page`, `Section`, `DataGroup`, typography/divider hierarchy |
| Replace | page별 button, field, tab, badge, toast markup | semantic primitive |
| Replace | native destructive `window.confirm` | accessible `ConfirmDialog`, destructive behavior 자체는 유지 |
| Delete candidate | duplicated `*-header-icon`, `*-input-shell`, `*-status-chip`, hover-lift style | 마지막 consumer migration 뒤 제거 |
| Delete candidate | MyPage legacy average card와 raw recent trend | V2.2 Growth UI와 deprecation contract 적용 뒤 제거 |

Delete candidate는 사용처와 test가 모두 migration된 뒤 삭제한다. current functionality를 CSS cleanup과 함께 제거하지 않는다.

## Timer composition and regression boundary

```text
TimerPage orchestration
├─ PracticeContextBar
├─ ScramblePanel
├─ TimerStage
│  ├─ TimerDisplay
│  ├─ TimerStateMessage
│  ├─ TimerResultActions
│  └─ PendingSolveRecovery
└─ PracticeSecondaryData
   ├─ AverageMetric Ao5/Ao12
   └─ SolveList
```

PracticeSecondaryData의 desktop placement는 selected Timer target에 따라 rail, compact strip 또는 collapsible edge region으로 결정한다.

### Presentation priority

1. pending recovery/error가 있으면 일반 idle helper보다 먼저 알린다.
2. holding/ready/running 상태는 save action과 penalty control을 노출하지 않는다.
3. stopped result와 penalty/save 상태는 같은 visual group에 둔다.
4. next scramble loading은 새로운 solve input을 잠그고 이유를 text로 알린다.
5. recent solve action은 Timer touch surface와 event propagation이 충돌하지 않아야 한다.

### Functional regression contract

- reducer state transition과 hold threshold
- monotonic clock과 stop 시 `Math.round()` canonical integer ms
- `KEYBOARD`와 `TOUCH` provenance
- guest history와 authenticated Record create
- user-scoped single pending solve와 account isolation
- Retry는 같은 submission identity, Discard는 explicit action
- malformed pending recovery와 next-solve lock
- exact scramble과 new scramble lifecycle
- penalty PATCH, delete, PB, Ao5/Ao12와 recent history

Visual component는 Timer Core command를 재해석하거나 browser global을 직접 읽지 않는다.

## Growth composition

```text
MyPageLayout
├─ MyPageSectionNav
├─ MyGrowth
│  ├─ GrowthSummary
│  ├─ PeriodComparison + TrendChart
│  ├─ ConsistencySummary
│  ├─ PBProgression
│  ├─ PracticeActivity
│  └─ NextPracticeCTA
├─ Records
│  └─ SolveList / RecordManagement
└─ AccountMenu
   └─ AccountDialog / Drawer
```

Growth component는 full Record history를 내려받아 metric을 계산하지 않는다. ADR-0010 accepted 뒤 dedicated summary, trend와 paginated progression response를 사용한다.

### Chart implementation

| Chart | Recharts composition | DNF·missing | Responsive | Accessible alternative |
| --- | --- | --- | --- | --- |
| Daily median | `ResponsiveContainer`, `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip` | missing date `null`과 `connectNulls=false`; DNF-only는 numeric point 없음 | 4~5 x ticks mobile, 7~10 desktop; fixed aspect/min height | summary sentence와 visually hidden/expandable daily list |
| PB progression | step-after `LineChart` 또는 `Area` 없는 `Line` | DNF 제외, current retained Record 기준 notice | latest milestone focus, older page link | chronological milestone list |
| Activity | `BarChart`, `Bar` | missing day 0; DNF도 total count 포함 | 30 bars, weekly label, tooltip touch target | total, active days와 daily count list |

Chart tooltip에만 정보를 두지 않는다. keyboard 또는 touch로 point를 탐색하기 어려우면 chart 아래 compact data list를 제공한다. y-axis는 seconds label을 표시하고 lower-is-better 해석을 heading copy에서 명시한다.

## Responsive strategy

Priority는 iPhone portrait, desktop/laptop, tablet, Timer landscape 순이다.

| Area | iPhone portrait | Desktop/laptop | Tablet | Timer landscape |
| --- | --- | --- | --- | --- |
| Navigation | 5-item bottom nav + compact top context | top nav + Explore + account | bottom 또는 compact top은 900px content fit으로 결정 | Timer에서 shell 최소화, safe-area 유지 |
| Timer digits | width 기반 clamp, 한 줄 고정 | stage 중심 최대 size | stage와 rail 1~2 column 전환 | height 기반 clamp |
| Scramble | 2~3줄, VisualCube 접기 가능 | notation + visual two-column | visual size 축소 | single context line, overflow wrap |
| Recent solves | compact list/drawer | side rail | lower rail | right rail 또는 접힌 panel |
| Growth chart | full width, sparse axis label, data summary | section width와 explanatory copy 병렬 가능 | single chart column | 해당 없음 |
| Rankings | rank/nickname/PB compact rows | dense table, current-user row | prioritized columns | 해당 없음 |
| Modal | full-height Drawer 우선 | centered Modal | width에 따라 Modal/Drawer | Timer interaction 종료 뒤만 표시 |

Mobile을 desktop column stack으로만 만들지 않는다. 각 screen은 DOM 순서, visible metadata, sticky action과 collapse behavior를 acceptance criterion으로 가진다.

## Accessibility contract

- 모든 interactive element는 keyboard로 도달하고 visible focus를 가진다.
- minimum touch target은 44×44px다.
- normal text는 4.5:1, large text와 meaningful UI boundary는 3:1 이상을 implementation gate에서 측정한다.
- Timer holding/ready/running/stopped, PB, +2, DNF와 error는 color 외 text 또는 icon label로 구분한다.
- form label, helper와 error는 `id`, `aria-describedby`, `aria-invalid`로 연결한다.
- modal/drawer는 focus trap, Escape close, initial focus와 trigger return focus를 제공한다.
- toast에만 recovery action이나 필수 오류를 두지 않는다.
- chart는 summary와 data alternative를 제공하고 tooltip만으로 값을 숨기지 않는다.
- Timer keyboard interaction은 global shortcut과 focused form/control을 구분하는 current behavior를 유지한다.
- screen reader용 Timer status는 매 frame announce하지 않고 state transition과 stopped result만 알린다.
- `prefers-reduced-motion`에서 chart reveal, PB effect와 overlay transition을 줄이거나 제거한다.

## Iconography and assets

Lucide outline icon을 유지한다.

- size는 16px inline, 20px control, 24px empty/status focal point를 기본으로 한다.
- stroke width는 1.75~2로 제한한다.
- icon-only action은 accessible name과 Tooltip을 제공한다.
- selected/disabled/error를 icon만으로 표현하지 않는다.
- decorative header icon box와 모든 card의 leading icon은 제거 후보로 둔다.
- functional cube diagram은 VisualCube를 사용한다. AI image로 대체하지 않는다.

AI UI Screen Mockup은 visual reference이며 runtime asset이 아니다. mockup의 layout과 proportion은 Approved Target Mockup 뒤 implementation detail로 옮기고, functional cube diagram이나 control은 image로 대체하지 않는다.

Runtime AI Asset의 허용 범위와 prompt는 [UI Visual Direction](../00-product/ui-visual-direction.md)이 관리한다. Runtime asset을 실제로 추가하는 PR은 explicit width/height, lazy loading, responsive source와 format/size budget을 implementation acceptance에 포함한다.

## Loading, empty, error and feedback

| State | Component | Rule |
| --- | --- | --- |
| route/auth loading | `PageSkeleton` 또는 compact status | layout shift를 줄이고 decorative spinner card를 반복하지 않는다. |
| local data loading | row/chart skeleton | final density와 같은 geometry를 유지한다. |
| empty | `EmptyState` | 이유, scope와 가능한 next action을 제공한다. image는 optional이다. |
| insufficient Growth | metric-specific state | 0으로 표시하지 않고 required sample과 next Practice를 설명한다. |
| recoverable error | `InlineAlert` | affected region과 Retry를 함께 둔다. |
| destructive confirmation | `ConfirmDialog` | target, consequence, cancel과 destructive action을 명시한다. |
| success | inline state 또는 Toast | 다음 interaction에 필요한 정보는 inline으로 유지한다. |

## Screenshot and visual regression strategy

Current repository에는 executable visual regression infrastructure가 없다. Storybook, Chromatic과 Playwright를 Design Gate prerequisite로 추가하지 않는다.

### Baseline, target and implementation evidence

Target Mockup approval과 Design System implementation value 확정 뒤, 첫 UI implementation PR을 시작하기 전에 implementation base commit의 Current Baseline Screenshot을 캡처한다.

| Screen | State | Viewport |
| --- | --- | --- |
| Home | guest, authenticated | 1440×900, 390×844 |
| Timer | idle, stopped, pending recovery | 1440×900, 390×844; landscape 844×390 추가 |
| Rankings | populated, current user visible | 1440×900, 390×844 |
| MyPage | populated records | 1440×900, 390×844 |
| Auth | login default, validation error | 1440×900, 390×844 |

- production data를 사용하지 않고 isolated development/test fixture를 사용한다.
- screenshot에는 base commit, route, viewport와 state를 기록한다.
- Approved Target Mockup은 같은 route와 viewport의 visual reference로 둔다. Actual Implementation Screenshot은 같은 fixture로 캡처한다.
- implementation PR evidence는 Current Baseline Screenshot, Approved Target Mockup과 Actual Implementation Screenshot을 가능한 경우 함께 비교한다.
- primary focus, layout hierarchy, relative spacing, palette, surface hierarchy, typography hierarchy, density, major proportion과 navigation structure를 확인한다. pixel-perfect 복제는 요구하지 않는다.
- functional requirement, accessibility와 usability는 Target Mockup보다 우선한다.
- binary를 repository에 무조건 commit하지 않는다. implementation reference가 필요한 최종 target만 UI Visual Direction의 target storage policy를 따른다.
- dynamic date, nickname와 network state를 고정할 수 없으면 pixel comparison 근거로 사용하지 않는다.

### Tool comparison

| Option | Cost | Value | Proposal |
| --- | --- | --- | --- |
| Manual baseline/target/implementation | dependency 없음, 사람이 state를 준비 | 초기 방향과 responsive review에 충분 | 지금 사용 |
| Playwright screenshot | browser/config/mock API와 baseline 관리 필요 | stable screen의 repeatable regression | shell과 2개 핵심 화면이 안정된 뒤 재평가 |
| Storybook | component story와 state fixture 작성 필요 | primitive catalog와 isolated QA | component 수요가 늘 때 검토 |
| Chromatic | external service와 snapshot lifecycle 필요 | hosted review·diff | 현재 규모에서는 사용하지 않음 |

Manual matrix가 반복 누락되거나 cross-page shell regression이 두 번 이상 발생하면 targeted Playwright 도입을 별도 PR로 연다. 도입 시 AppShell, Timer state와 Growth empty/populated처럼 deterministic state만 먼저 포함한다.

## Test strategy

### Unit and component

- primitive variant, keyboard, disabled/loading, focus return과 accessible name
- navigation item visibility, active route, auth/admin guard와 return path
- responsive semantic behavior는 DOM order와 visible label을 component test로 검증
- Timer presentation state가 existing core command와 save/recovery action을 그대로 호출하는지 검증
- Growth formatter는 backend response를 표시하고 metric을 재계산하지 않는지 검증
- chart summary, empty, insufficient, DNF-only와 missing-day fixture

### Integration and build

- page별 current loading, error, auth와 interaction test 유지
- frontend lint, Vitest, Vite build
- Growth backend PR은 domain fixture, repository/query integration, MockMvc와 REST Docs를 별도 수행

### Manual checks

- iPhone portrait Safari 기준 touch, keyboard, safe area, modal/drawer와 scroll
- desktop keyboard-only navigation과 visible focus
- Timer keyboard, touch, pending Retry/Discard, penalty, delete와 scramble lifecycle
- mobile landscape Timer
- contrast와 200% zoom, reduced motion
- fixed viewport baseline/target/implementation screenshot evidence

## Implementation sequence

V2.2 Growth frontend를 current UI로 먼저 만들지 않는다. Growth backend는 별도 승인 뒤 core UI mockup과 병렬로 진행할 수 있다. My Growth frontend는 Growth API contract와 My Growth target approval 뒤에 연결한다.

~~~text
Design Gate
→ Timer mockup exploration
→ Timer desktop/mobile approval
→ Core screen mockups
→ Visual language approval
→ Design System implementation values 확정
→ Current baseline capture
→ PR 1 Tokens + primitives
→ PR 2 App Shell
→ PR 3 Timer
→ PR 4 Home
→ PR 5 Ranking
→ PR 6 MyPage
~~~

Mockup 생성, 선택, 수정, target 승인과 code implementation은 별도 gate다. 각 screen migration PR은 해당 Desktop/Mobile Target Mockup이 승인된 뒤에만 시작한다.

### PR 1 — Design tokens and core primitives

- Goal/scope: semantic color/type/spacing/radius/shadow/motion token과 Button, Field, Select, InlineAlert, Skeleton, EmptyState의 first consumers
- Main files: `frontend/src/styles` foundation, new shared primitives와 focused tests
- Dependency: Design Gate 승인, visual language approval, Design System implementation value 확정, Current Baseline Screenshot capture
- Functional boundary: page behavior와 route 변경 없음
- Visual acceptance: arbitrary gradient/shadow를 새 primitive에 넣지 않고 focus, touch target과 state가 token으로 표현됨
- Tests/manual: primitive interaction/accessibility, lint/test/build, sample states desktop/mobile
- Risk/rollback: global token leak가 가장 큰 위험이다. page migration 전 compatibility alias를 유지하고 PR revert로 복구한다.

### PR 2 — App Shell and navigation

- Goal/scope: AppShell, desktop top nav, mobile context/bottom nav, Explore/More와 account menu
- Main files: `App.jsx`, shell/navigation components, base/responsive style와 route tests
- Dependency: PR 1
- Functional boundary: current path, lazy route, auth/guest/admin guard와 return path 유지
- Visual acceptance: 320px에서 overflow 없음, mobile 5 destinations와 safe area, desktop primary/utility 구분
- Tests/manual: active route, auth/admin visibility, keyboard menu, 1440×900·390×844 screenshot
- Risk/rollback: route 접근성과 destination 발견성이 위험이다. old shell을 한 commit 경계에서 복원할 수 있게 한다.

### PR 3 — Timer redesign

- Goal/scope: focus stage, scramble/context, result/recovery action과 recent performance rail
- Main files: `TimerPage.jsx`, presentation components, `timer.css`, existing Timer tests
- Dependency: PR 1~2, Timer Desktop Target approved, Timer Mobile Portrait Target approved, Timer Mobile Landscape Target approved, Current Baseline Screenshot capture
- Functional boundary: Timer Core, canonical time, provenance, pending solve, Retry/Discard, scramble, Record/Ao 계약 변경 없음. Timer PB display를 추가하지 않는다.
- Visual acceptance: digits 안정성, 상태를 text+accent로 구분, portrait/landscape/desktop hierarchy와 running distraction 제거
- Tests/manual: current Timer focused tests 전체, keyboard/touch/device viewport, pending/error/next-scramble screenshot
- Risk/rollback: event propagation과 state presentation drift가 높다. core 파일은 수정하지 않고 presentation commit을 revert한다.

### PR 4 — Home action hierarchy

- Goal/scope: Continue Practice 중심 Home, current summary와 recent Record preview, Guest의 current Community feed
- Main files: `HomePage.jsx`, `home.css`, shared summary/list component와 tests
- Dependency: PR 1~2, Timer route 유지, Home Desktop Target approved, Home Mobile Target approved
- Functional boundary: current API call과 guest/auth 분기 유지
- Visual acceptance: 하나의 primary action, MyPage full summary/history 중복 제거, guest empty metric 미노출
- Tests/manual: guest/member/loading/error, CTA route, portrait/desktop screenshot
- Risk/rollback: 정보 제거로 보일 수 있다. 상세 destination link를 확인하고 Home page만 revert한다.

### PR 5 — Ranking leaderboard

- Goal/scope: compact top 3, my-rank highlight, dense desktop table와 mobile row
- Main files: `RankingsPage.jsx`, `rankings.css`, data list/table primitives와 tests
- Dependency: PR 1~2, Rankings Desktop Target approved, Rankings Mobile Target approved
- Functional boundary: search, pagination, event capability, Redis/MySQL response 의미 변경 없음
- Visual acceptance: mobile에서 rank/nickname/PB 한 줄 비교, current user를 color 외 label로 식별
- Tests/manual: search, page, empty/loading/error, long nickname, 390px screenshot
- Risk/rollback: responsive column 누락이 위험이다. current table markup을 migration commit 단위로 복구한다.

### PR 6 — MyPage current UX migration

- Goal/scope: `/mypage` section navigation, Records 관리와 Account dialog/drawer 분리. Growth placeholder를 구현하지 않음
- Main files: `MyPage.jsx`, MyPage layout/components, `mypage.css`, tests
- Dependency: PR 1~2, MyPage Records Desktop Target approved, MyPage Records Mobile Target approved
- Functional boundary: profile/password, logout, penalty/delete, history pagination 유지
- Visual acceptance: Records와 Account 책임 분리, 미구현 Growth metric을 fake empty로 노출하지 않음
- Tests/manual: account modal/drawer focus, penalty/delete/logout, mobile keyboard와 record list
- Risk/rollback: monolithic page 분리 중 state coupling이 위험이다. data/action hook을 유지하고 section presentation만 revert 가능하게 나눈다.

### PR 7 — V2.2 Growth backend/domain/API

- Goal/scope: approved metric calculator, dedicated summary/trend/progression API와 query
- Main files: backend domain/repository/service/controller, REST Docs와 tests
- Dependency: ADR-0010와 MUST metric 승인, 별도 implementation 승인. Core UI mockup 과정과 병렬 가능
- Functional boundary: current Record correction/delete, WCA_333, Asia/Seoul와 no-migration proposal 유지
- Visual acceptance: 해당 없음. frontend fixture에 필요한 canonical response 제공
- Tests/manual: DNF/+2/median/IQR/Ao/PB/time boundary fixture, MySQL integration, REST Docs, query release gate
- Risk/rollback: metric drift와 query cost가 위험이다. endpoint는 additive이며 application revert로 제거한다. schema rollback은 없다.

### PR 8 — V2.2 My Growth frontend

- Goal/scope: Growth summary, period comparison, charts, consistency, PB progression, activity와 Next Practice
- Main files: `/mypage` Growth components, API client, Recharts composition와 tests
- Dependency: PR 1~2, PR 6~7, Growth API contract available, My Growth Desktop Target approved, My Growth Mobile Target approved
- Functional boundary: backend metric을 표시하며 frontend 재계산과 신규 Public Profile을 추가하지 않음
- Visual acceptance: question-order hierarchy, metric card 남용 없음, insufficient/DNF/missing-day와 text alternative
- Tests/manual: empty/insufficient/populated/API error, chart summary, iPhone/desktop screenshot
- Risk/rollback: chart가 의미를 과장할 위험이 있다. Growth section을 feature boundary로 revert하고 Records/Account를 유지한다.

### PR 9 — Community and Q&A consistency

- Goal/scope: content list, filter, metadata, reading column, comment/form과 pagination primitive 적용
- Main files: Community/Q&A pages, `community.css`, shared content components와 tests
- Dependency: PR 1~2, Community and Q&A Desktop/Mobile Target Mockup 승인
- Functional boundary: authorization, image, post/comment CRUD와 Q&A workflow 유지
- Visual acceptance: desktop/mobile information hierarchy 일치, badge는 category/status에만 사용
- Tests/manual: list/detail/write/edit/comment, empty/error, long content와 mobile actions
- Risk/rollback: 여러 route의 shared style 영향이 위험이다. Community와 Q&A migration commit을 분리하거나 route별 revert가 가능해야 한다.

### PR 10 — Learning content system

- Goal/scope: Learning tabs, case list/grid와 notation/algorithm hierarchy
- Main files: `LearningPage.jsx`, `learning.css`, static data consumers와 tests
- Dependency: PR 1~2, Learning Desktop/Mobile Target Mockup 승인
- Functional boundary: case data, algorithm과 VisualCube mapping 유지
- Visual acceptance: content card만 유지하고 page/card nesting 제거, mobile에서 image와 algorithm scan order 보존
- Tests/manual: tab keyboard, case rendering, image fallback, portrait/desktop screenshot
- Risk/rollback: static content mapping 회귀가 위험이다. data file은 변경하지 않고 page presentation을 revert한다.

### PR 11 — Auth consistency

- Goal/scope: Login, Signup/verification, Password Reset의 AuthShell, Field와 feedback 통합
- Main files: auth pages, `auth.css`, shared form components와 tests
- Dependency: PR 1~2, Auth Desktop/Mobile Target Mockup 승인
- Functional boundary: token, redirect, email verification와 password reset API 흐름 유지
- Visual acceptance: form-first, wide visual optional, mobile keyboard에서 error/submit 접근 가능
- Tests/manual: normal/error/loading/redirect, keyboard-only, 390px viewport
- Risk/rollback: shared form state와 autofill이 위험이다. route별 migration으로 rollback한다.

### PR 12 — Feedback, Admin and common-state polish

- Goal/scope: Feedback/Admin/NotFound/route loading을 common form, data list, status와 overlay pattern으로 migration하고 전체 accessibility audit 수행
- Main files: Feedback/Admin/NotFound pages, admin/feedback CSS, shared feedback components와 tests
- Dependency: PR 1~2, 앞선 primitive 안정화, Feedback/Admin Desktop/Mobile Target Mockup 승인
- Functional boundary: ADMIN authorization, feedback/memo behavior와 route loading 유지
- Visual acceptance: operational density, consistent loading/empty/error, no decorative hover lift
- Tests/manual: role guard, filter, memo/feedback action, focus/contrast/reduced-motion audit
- Risk/rollback: lower-use route regression이 늦게 발견될 수 있다. public/core PR과 분리해 revert한다.

### Optional PR — Approved Runtime AI Assets

Key visual 또는 empty-state Runtime AI Asset이 별도 승인되고 UI 구조가 안정된 경우에만 연다. generated source, crop, license/usage record, format, width/height, size budget, lazy loading과 light surface QA를 포함한다. Runtime asset이 없더라도 core redesign은 완료할 수 있다.

## Release gates

각 screen migration PR은 다음을 통과해야 한다.

- 해당 Desktop/Mobile Target Mockup approval과 implementation dependency 충족
- 관련 current behavior test와 newly introduced primitive test
- frontend lint, Vitest와 Vite build
- application route/API/schema 변경 범위 확인
- 390×844와 1440×900 baseline/target/implementation screenshot review
- Timer PR의 844×390 landscape와 keyboard/touch manual regression
- visible focus, 200% zoom, contrast와 reduced-motion focused check
- unresolved functional change는 UI PR에서 분리

Growth frontend release는 ADR-0010 acceptance, Growth backend contract, query release gate와 My Growth Desktop/Mobile Target Mockup approval을 추가로 요구한다. Design Gate 승인이나 mockup 생성만으로 production implementation 또는 release를 시작하지 않는다.
