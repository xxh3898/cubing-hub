---
doc_type: product
status: draft
created: 2026-08-11
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/ui-mockup-contract.md
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
---
# UI Visual Direction

## Status

이 문서는 Cubing Hub UI/UX redesign의 Design Gate proposal이다. 제품 기능, Timer·Record 계약과 V2.2 Growth metric을 변경하지 않는다. visual direction, Target Mockup과 screen hierarchy가 승인되기 전에는 구현 계약으로 사용하지 않는다. 화면별 capability와 image-generation input은 [UI Mockup Screen Contract](ui-mockup-contract.md)를 따른다.

Cubing Hub는 generic dashboard가 아니라 다음 경험을 연결하는 큐빙 활동 제품이다.

```text
Practice
→ Record
→ Improve
→ Participate
→ Profile
→ Practice
```

UI는 precision timing tool, sports performance product, personal growth tracker의 성격을 먼저 보여 준다. Participation은 현재 기능과 future gate를 구분하고, 아직 제공하지 않는 기능을 navigation에 노출하지 않는다.

## Current UI audit

Current source와 repository의 V1 historical screenshot을 함께 살폈다. screenshot은 과거 visual evidence이며 current 화면으로 간주하지 않는다. Current 판단은 `frontend/src`의 route, component와 CSS를 기준으로 한다.

### 공통 문제

1. 큰 panel, rounded card, pale tint, shadow가 page와 data unit에 반복돼 hierarchy가 border에 의존한다.
2. blue tint와 background gradient가 모든 화면의 기본 인상이어서 precision sports identity가 약하다.
3. icon box, badge와 metric card가 의미보다 장식 단위로 반복된다.
4. Home, MyPage와 Timer recent area가 비슷한 summary를 각자 보여 줘 화면 역할이 겹친다.
5. mobile 대응은 desktop grid를 한 열로 접거나 table row를 card로 바꾸는 방식이 많다. 핵심 행동 순서는 그대로 재설계되지 않는다.
6. Timer 숫자와 통계 숫자가 일반 UI typography를 공유해 빠른 판독과 숫자 폭 안정성을 별도로 보장하지 않는다.
7. loading, empty, error, confirmation과 form feedback이 page별 pattern으로 흩어져 있다.
8. page별 CSS와 one-off class가 많아 같은 interaction도 화면마다 밀도, radius, shadow와 상태 표현이 달라진다.

### 화면별 역할과 우선순위

| 화면 | 역할 | Primary action | Secondary action | 현재 UX·visual 문제 | Mobile 문제 | Redesign priority |
| --- | --- | --- | --- | --- | --- | --- |
| Home | 다음 행동 결정 | Practice 계속하기 | Growth·content로 이동 | scramble, 통계, community와 records가 같은 무게로 이어져 MyPage와 중복된다. | 긴 dashboard stack으로 변한다. | High |
| Timer | Practice와 Record 저장 | solve 측정 | penalty·recent solve 관리 | Timer stage가 scramble·recent card와 같은 panel hierarchy에 놓인다. | portrait scroll이 길고 landscape 전용 구성이 없다. | Critical |
| Rankings | 현재 PB 비교 | 순위 탐색 | event 선택·nickname 검색 | podium이 비교보다 장식에 가까워질 수 있고 table과 밀도 차이가 크다. | top 3가 긴 card stack이 된다. | High |
| MyPage | private history·account | 기록 확인·관리 | profile·password 관리 | profile, legacy summary, raw trend, records와 account modal이 한 화면에 섞인다. | 핵심 정보까지 긴 scroll이 필요하다. | Critical |
| Learning | 학습 콘텐츠 탐색 | case 학습 | curriculum tab 전환 | 실제 content card와 page panel의 구분이 약하다. | tab과 case 비교가 단순 1열로 축소된다. | Medium |
| Community | 게시글 탐색·참여 | 글 읽기·작성 | category·검색 | filter, search, list와 metadata가 one-off pattern으로 구성된다. | desktop table과 별도 card hierarchy가 생긴다. | Medium |
| Post detail/write/edit | 읽기·댓글·작성 | 콘텐츠 소비·입력 | edit·delete·comment | reading width, metadata, form과 action hierarchy가 통일되지 않았다. | action이 full-width 또는 horizontal overflow로만 대응한다. | Medium |
| Login | 인증 | 로그인 | Signup·password reset 이동 | functional form보다 decorative shell 비중이 크다. | desktop column을 접는 수준이다. | Medium |
| Signup·verification | 계정 생성 | 단계 완료 | resend·Login 이동 | form 단계는 있으나 Login과 shell·feedback을 중복한다. | mobile keyboard와 submit visibility 기준이 없다. | Medium |
| Password reset | 계정 복구 | 비밀번호 변경 | Login 이동 | Auth 상태·오류 pattern을 별도로 반복한다. | form focus와 오류 이동 기준이 없다. | Medium |
| Feedback·Q&A | 지원 접점 | 질문·의견 전달 | 상태·답변 확인 | Community와 유사한 list/form/status를 별도 style로 만든다. | action이 한 열로만 변한다. | Low |
| Admin | 운영 관리 | feedback·memo 처리 | filter·detail 탐색 | public visual과 같은 card·badge 문법이 operational density를 낮춘다. | 긴 card stack이 된다. | Low |

Current source 경로와 세부 component 분류는 [Frontend Design System](../03-architecture/frontend-design-system.md)에서 관리한다.

## Design principles

### Practice first

Timer 진입과 다음 Practice가 가장 빠르게 보여야 한다. Home은 기능 directory가 아니라 다음 행동을 고르는 시작점이다.

### Data before decoration

시간, trend, sample과 상태를 먼저 읽을 수 있어야 한다. section은 spacing, typography, divider와 surface 차이로 구분하고 모든 metric을 card로 만들지 않는다.

### Calm precision

정확성과 속도는 과도한 glow나 animation이 아니라 안정된 숫자, 일관된 alignment, 분명한 state와 짧은 feedback으로 표현한다.

### Subtle cubing identity

Cube 6색 전체를 main palette로 사용하지 않는다. 단일 primary accent, PB signal, 3×3 geometry와 scramble notation을 필요한 지점에만 사용한다.

### One system, different focus

Timer는 집중 도구, Growth는 해석 도구, Ranking은 비교 도구, Community와 Learning은 content 도구다. 같은 token과 primitive를 사용하되 모든 화면을 같은 dashboard layout으로 만들지 않는다.

## Visual Direction 3안

| 항목 | A. Precision Bench | B. Measured Momentum | C. Arena Signal |
| --- | --- | --- | --- |
| 한 줄 concept | 교정된 timing 장비처럼 정확하고 절제된 작업면 | 연습의 흐름과 성장 방향을 빠르게 읽는 performance journal | 경쟁 직전의 집중과 순위를 강조하는 high-contrast sports interface |
| 제품 분위기 | technical, quiet, exact | focused, progressive, grounded | intense, competitive, immediate |
| Reference category | professional timing equipment, developer-grade precision tool | sports performance application, editorial/data product | competitive sports interface, event timing display |
| Color philosophy | cold neutral과 cyan signal 하나 | warm neutral, deep green primary, amber PB | charcoal 기반, bright cyan과 amber signal |
| Typography | condensed UI와 monospace 숫자 비중이 큼 | 자연스러운 sans UI와 안정된 monospace 숫자 분리 | 굵은 condensed heading과 큰 scoreboard 숫자 |
| Surface | flat white/gray workbench | warm background 위 flat section과 필요한 raised surface | dark layered surface와 강한 contrast plane |
| Border | 1px hairline 중심 | subtle border와 divider 중심 | strong border와 state strip 중심 |
| Radius | 0~6px | 4~12px | 4~8px |
| Shadow | overlay 외 사용하지 않음 | shell·overlay에만 제한 | raised competition module에 제한 |
| Spacing·density | compact | medium-dense | compact, large focal number |
| Iconography | 작은 technical outline | 의미 있는 action·status에만 outline | 높은 contrast의 minimal outline/filled signal |
| Motion | 즉각적인 100~160ms state change | 120~240ms selection·panel transition | 짧은 score/state reveal |
| Chart | grid와 label이 정밀한 analytical chart | 설명 문장과 함께 읽는 quiet chart | current point와 delta가 강한 chart |
| Timer | 중심 장비처럼 가장 강함 | 집중 stage와 옆 performance rail | dark scoreboard와 competition 긴장감 |
| Growth | dense analysis table에 가까움 | 지금→방향→안정성→장기→활동 narrative | delta와 PB를 크게 강조 |
| Mobile | compact tool tray | core action 순서 중심의 bottom navigation | full-screen focus와 bold status |
| Runtime AI Asset | 거의 사용하지 않음 | optional key visual·empty-state에 제한 | campaign/achievement visual에 비교적 적극적 |
| 장점 | Timer 신뢰와 정보 밀도가 높다. | Core Loop 전체, Growth와 content 화면을 한 system으로 연결하기 쉽다. | Timer와 Ranking의 존재감이 강하다. |
| 위험 | 차갑고 developer tool처럼 보일 수 있다. Community·Learning 확장이 약하다. | 구현이 평범해지면 sports identity가 희미해질 수 있다. | competition이 아직 중심이 아닌 제품을 gamer app처럼 보이게 할 수 있다. Dark QA 비용도 크다. |
| Cubing Hub 적합도 | 4/5 | 5/5 | 3/5 |

## Recommended direction: Measured Momentum

`Measured Momentum`을 Design Gate 기본안으로 둔다. Practice의 집중, Growth의 해석, Ranking의 비교와 Community·Learning의 읽기 경험을 한 방향에서 다룰 수 있다. Timer에는 `Precision Bench`의 numeric discipline과 집중 stage를 가져오되 별도 theme처럼 보이지 않게 같은 color, type와 spacing token을 사용한다.

이 방향은 다음 인상을 목표로 한다.

- 시간과 상태가 정확해 보인다.
- 연습 직후 다음 정보를 빠르게 찾을 수 있다.
- 성장은 chart 수가 아니라 방향과 근거로 이해된다.
- cube identity는 3×3 geometry, scramble notation과 제한된 signal color에서 드러난다.
- content와 support 화면도 같은 제품 안에 있지만 Practice보다 앞에 나오지 않는다.

Measured Momentum은 semantic visual direction이다. exact spacing, component proportion과 surface 빈도는 Approved Target Mockup을 선택한 뒤 implementation-ready detail로 확정한다.

### Light / Dark proposal

V2.2까지는 light-first로 구현한다. semantic token은 future theme mapping이 가능하게 설계하지만 dark theme toggle과 dark visual regression matrix는 만들지 않는다. 야간 사용 선호를 뒷받침하는 현재 근거가 없고, 두 theme을 동시에 first-class로 만들면 component와 chart QA 범위가 두 배로 늘어난다.

Timer의 dark `focus stage`는 full dark theme이 아니다. 같은 light shell 안에서 timing 영역만 주변 정보와 분리하는 surface다. 실제 dark theme은 Timer 사용 환경과 사용자 반응을 확인한 뒤 별도 gate로 연다.

## App Shell and navigation

Generic sidebar는 사용하지 않는다. Current top navigation과 mobile bottom navigation의 장점을 유지하면서 Core Loop 순서에 맞게 destination을 재배치한다.

### Desktop

```text
[Cubing Hub]
Home  Timer  My Page  Rankings  Explore ▾
                                      Learning
                                      Community
                                      Q&A
                           [Account ▾]
```

- Home, Timer, My Page와 Rankings가 primary destination이다.
- V2.2 My Growth 출시 전에는 `/mypage`를 `My Page`로 표시한다. Growth가 구현된 뒤 같은 route를 `My Growth`로 승격한다.
- Learning, Community와 Q&A는 `Explore`에 모으되 direct route와 deep link를 유지한다.
- Feedback, account settings와 logout은 account menu에 둔다.
- Admin은 ADMIN account menu에만 노출한다.
- Daily Challenge는 승인 전 빈 slot이나 disabled item으로 노출하지 않는다. 출시가 확정되면 primary navigation 또는 Explore에 추가할 수 있는 data-driven nav model을 사용한다.

### Mobile

```text
Home | Timer | My Page | Rankings | More
```

- Timer는 중앙 destination이지만 floating action처럼 shell을 깨지 않는다. active indicator와 label weight로 우선순위를 높인다.
- More에는 Learning, Community, Q&A, Feedback와 account utility를 둔다.
- top bar는 brand/context와 account action만 남긴다.
- bottom navigation은 safe area를 포함하고 44×44px 이상의 touch target을 유지한다.

## Timer UX

Timer는 ordinary page card가 아니라 viewport의 중심 practice stage다.

### Content hierarchy

```text
Event · connection/context
Scramble notation · scramble visual
Timer stage · time · state
Stopped result · penalty · save/recovery action
Ao5 · Ao12 · recent solves
```

Desktop target은 이 정보 순서를 유지한다. 실제 placement는 Center Stage, Instrument Bench, Focus Canvas 중 선택된 Variant에서 확정한다. Timer redesign PR은 V2.1의 Ao5/Ao12와 recent solves를 보존하며 Timer UI에 PB를 새로 추가하지 않는다.

### State contract

| State | Primary presentation | Required action·message |
| --- | --- | --- |
| idle | neutral stage, stable `00.000`, concise keyboard/touch hint | press and hold affordance |
| holding | amber outline와 `계속 누르세요` text | release 전에는 시작하지 않음 |
| ready | green outline와 `놓으면 시작` text | color 없이 label로도 구분 |
| running | 숫자 외 decoration과 lower rail을 visually recede | continuous animation 없음 |
| stopped | canonical integer millisecond를 가장 강하게 표시 | penalty와 save status를 숫자 가까이에 배치 |
| pending recovery | stage 안의 persistent recovery notice | Retry를 primary, Discard를 explicit destructive action으로 제공 |
| error | 원인과 recovery action을 같은 영역에 표시 | retry 가능 여부를 구분 |
| next scramble loading | 이전 solve와 새 scramble 사이 lock를 표시 | fresh response가 pending state를 덮어쓰지 않음 |

Timer state machine, `KEYBOARD`/`TOUCH` provenance, canonical integer millisecond, pending snapshot, account isolation, Retry/Discard, scramble consistency, next-solve lock, Record save, penalty와 Ao5/Ao12 계산은 바꾸지 않는다.

### Responsive behavior

- iPhone portrait: scramble은 stage 상단에서 2~3줄까지 허용하고 VisualCube는 접을 수 있는 보조 정보로 둔다. 숫자는 `clamp()` 기반으로 viewport width에 맞추고 recent solves는 stage 아래 compact list 또는 drawer로 이동한다.
- Timer landscape: top/footer navigation을 축소하고 scramble을 한 줄 context bar로 둔다. 숫자를 중앙, recent/Ao rail을 오른쪽 또는 하단 얇은 rail로 배치한다. full-screen API는 사용하지 않는다.
- Desktop: selected target이 performance data를 rail, compact strip 또는 collapsible edge region에 배치한다. outer card는 두지 않는다.
- holding, ready와 running 동안 nonessential content의 contrast를 낮추지만 DOM에서 제거하거나 focus 순서를 바꾸지 않는다.

별도 distraction-free fullscreen toggle은 V2.2 기본 범위에 넣지 않는다. state-based focus만 제공하고 실제 수요와 mobile browser behavior를 확인한 뒤 검토한다.

## Growth UX

`/mypage`의 기본 section을 private My Growth로 확장하는 proposal을 유지한다. 정보는 metric card 모음이 아니라 다음 질문 순서로 배치한다.

```text
지금 어느 정도인가
Current PB · Recent Ao5 · Recent Ao12

최근 방향이 어떤가
최근 완료 7일 vs 직전 7일 median · 30-day daily median

안정성이 어떤가
Latest-12 IQR · DNF · +2 · sample count

장기적으로 어떻게 성장했나
PB progression

얼마나 연습했나
7/30-day count · total · daily activity

다음 Practice
Timer CTA
```

- PB, Ao5와 Ao12는 하나의 performance strip으로 묶는다.
- 기간 비교는 숫자와 `빨라짐/느려짐/비교 불가` 문장을 함께 보여 준다.
- IQR, DNF와 +2는 하나의 consistency section에서 sample 수와 함께 읽는다.
- chart는 title, concise interpretation, chart, text alternative 순으로 둔다.
- `현재 남아 있는 기록 기준`, `기록된 활동`, `Asia/Seoul` 같은 canonical 의미는 필요한 위치에서 짧게 설명한다.
- insufficient sample은 0이나 flat chart로 대체하지 않는다. 필요한 solve 수와 다음 Practice CTA를 보여 준다.

### Chart contract

| Chart | Axis·label | Tooltip | Missing·DNF | Mobile | Text alternative |
| --- | --- | --- | --- | --- | --- |
| 30-day daily median | x: Asia/Seoul calendar date, y: completed solve seconds | date, median, completed sample, DNF, +2 | missing day는 gap, DNF-only day는 numeric point 없이 상태 표시 | x label은 주 단위 4~5개, horizontal scroll 없음 | 최근/이전 방향, best/worst median day와 sample summary |
| PB progression | x: `createdAt`, y: effective seconds, lower is better | date, effective time, penalty, Record id link candidate | current retained Record 기준으로 point 재계산, DNF point 없음 | 최근 milestone 우선, older pagination | milestone을 시간순 list로 제공 |
| Daily activity | x: Asia/Seoul date, y: solve count integer | date, total count, completed/DNF count | 기록 없는 날은 0, DNF도 activity count에는 포함 | 30 bars 유지, 날짜 label은 주 단위 | 7/30-day count, active days와 daily count list |

Recharts 3.8.1로 세 chart를 구현할 수 있다. Design Gate에서는 새 chart library를 추가하지 않는다.

## Home, Rankings and MyPage

### Home

Home은 `다음에 무엇을 할지`를 결정하는 화면이다.

1. Continue Practice와 current scramble을 primary action으로 둔다.
2. 인증 사용자는 current Home API의 nickname, main event, total solve count, PB와 전체 DNF 제외 평균만 compact summary로 사용한다.
3. 최근 Record는 최대 5건의 compact preview로 제한하고 full Record table을 반복하지 않는다.
4. Guest Home에서만 current 최근 Community feed와 current route 안내를 사용하며 recommendation이나 activity metric으로 확장하지 않는다.
5. Guest는 Timer 체험과 제품 loop를 설명하되 빈 개인 통계 placeholder를 보여 주지 않는다.

### Rankings

- current-safe target은 WCA_333만 지원 event로 보여 주고 nickname search를 compact toolbar에 둔다.
- top 3는 compact leading row로 유지하되 큰 podium illustration은 사용하지 않는다.
- 내 순위는 list 안 highlight와 상단 jump link를 함께 제공한다.
- current user는 `내 순위` label, left rule와 text weight로 구분하고 color만 사용하지 않는다.
- mobile row는 rank, nickname, PB를 한 줄에서 비교한다. 선택 event는 toolbar에 있으므로 각 row에서 반복하지 않는다.
- loading은 row skeleton, empty는 search/event 조건과 recovery action을 보여 준다.

### MyPage

```text
CURRENT-SAFE: Records | Account utility
V2.2 TARGET: My Growth | Records
                              Account menu
```

- current-safe MyPage target은 Records를 중심으로 두고 My Growth navigation이나 placeholder를 만들지 않는다.
- V2.2 target에서는 My Growth를 기본 section으로 둘 수 있다.
- Records는 history, pagination, penalty와 delete를 소유한다.
- Account는 profile과 password를 account menu의 dialog 또는 drawer에서 다룬다.
- 신규 Public Profile route/API와 visibility setting은 V2.2에 포함하지 않는다.
- legacy `averageTimeMs` card는 V2.2 UI에서 제거하고 API field deprecation 계약은 Growth 문서를 따른다.

## Community, Learning and Auth consistency

### Community and Q&A

- Content list, filter toolbar, metadata row, author, pagination과 empty/loading/error를 공통화한다.
- post detail은 약 70ch reading width를 사용하고 이미지, 본문, metadata와 comment hierarchy를 분리한다.
- write/edit은 같은 form primitive와 validation placement를 사용한다.
- category와 status에만 Badge를 쓰고 모든 metadata를 pill로 만들지 않는다.

### Learning

- notation, beginner와 CFOP navigation은 Tabs를 사용한다.
- Learning case는 실제 반복 content unit이므로 card를 유지할 수 있다. page와 section까지 중첩 card로 감싸지 않는다.
- cube image, case name과 algorithm을 같은 scan order로 정렬한다.
- mobile에서는 한 case 안의 image와 algorithm을 유지하고 case 사이 divider로 density를 확보한다.

### Auth

- Login, Signup/verification과 Password Reset은 같은 AuthShell, Field, InlineError와 submit feedback을 사용한다.
- form이 화면의 primary content다. wide layout에서도 illustration은 필수가 아니다.
- mobile keyboard가 열려도 current field error와 submit action에 도달할 수 있어야 한다.
- 인증 실패 뒤 첫 오류로 focus를 이동하고 label, helper와 error를 programmatically 연결한다.

### Feedback and Admin

Feedback은 같은 form primitive를 사용한다. Admin은 public primary navigation에서 분리하고 compact filter, table/list와 operational status를 우선한다. redesign은 permission, route와 workflow를 바꾸지 않는다.

## AI UI Screen Mockup workflow

V2.2 UI redesign proposal은 repository의 functional contract를 먼저 유지하고 AI UI Screen Mockup으로 visual decision을 진행한다.

~~~text
Product / UX contract
→ Visual Direction
→ AI UI Screen Mockup 생성
→ 여러 시안 비교
→ 선택 및 수정
→ Desktop / Mobile Target Mockup 승인
→ approved mockup에서 visual rule 추출
→ Design System implementation detail 확정
→ React/CSS 구현
→ 구현 screenshot
→ Target Mockup 비교
→ visual gap 수정
~~~

### AI UI Screen Mockup

AI UI Screen Mockup은 디자인 결정을 위한 visual reference다. 실제 application bundle에 삽입하지 않는다.

- layout과 composition
- visual hierarchy와 information density
- spacing proportion, surface와 color balance
- typography hierarchy
- navigation appearance와 major component proportion
- desktop, mobile portrait와 Timer landscape의 responsive visual intent

### Runtime AI Asset

Runtime AI Asset은 실제 제품이 선택적으로 로드할 수 있는 이미지다. Guest Home key visual, OG/social image, optional illustration과 optional empty state가 여기에 속한다. Runtime AI Asset은 redesign workflow의 핵심 산출물이 아니며 UI 구현을 막지 않는다.

### Functional source of truth

Approved Target Mockup은 visual reference이며 기능 Source of Truth가 아니다. 실제 text/copy, Timer state machine, canonical timing, keyboard/touch 처리, Record lifecycle, API, auth, permissions, routing, accessibility, focus order, loading과 error contract는 repository의 requirement, code와 test를 따른다.

생성 이미지에 잘못된 text, fake number 또는 존재하지 않는 control이 있어도 구현하지 않는다. accessibility 또는 usability requirement와 mockup이 충돌하면 requirement가 우선한다.

### Approval gates

다음 단계는 서로 별도 승인이다.

1. mockup 생성
2. mockup 선택
3. mockup 수정
4. Target Mockup 승인
5. React/CSS code implementation

Target approved 상태가 되어도 code implementation은 자동으로 시작하지 않는다.

### Screen rollout and target approval

각 화면은 해당 target mockup이 승인되기 전 production UI 구현을 시작하지 않는다.

~~~text
Phase A — Timer
Desktop Variant A
Desktop Variant B
Desktop Variant C
→ 하나 선택
→ 수정
→ Desktop Target 승인
→ Mobile Portrait Target
→ Mobile Landscape Target
→ 승인

Phase B — Core
Home Desktop/Mobile
Rankings Desktop/Mobile
MyPage Records Desktop/Mobile

Phase C — My Growth
My Growth Desktop/Mobile

Phase D
Community
Learning
Auth
Q&A
Feedback
Admin
~~~

### Timer desktop exploration

Timer Desktop 시안은 같은 Measured Momentum language 안에서 실제 layout을 다르게 비교한다. 색상만 바꾼 변형은 만들지 않는다.

| Variant | Layout | 확인할 판단 |
| --- | --- | --- |
| A. Center Stage | scramble을 상단 context로 두고 큰 중앙 Timer stage를 배치한다. 오른쪽 performance rail에 Ao와 compact recent solves를 둔다. | Timer와 secondary performance data의 균형 |
| B. Instrument Bench | scramble → timer → stopped result를 강한 수직축으로 배치한다. Ao와 recent solves는 하단 compact strip으로 모은다. | solve flow가 가장 직접적으로 읽히는지 |
| C. Focus Canvas | Timer가 viewport 대부분을 차지한다. scramble은 얇은 상단 context로 두고 secondary data는 edge rail 또는 접히는 영역으로 보낸다. | running 상태에서 distraction을 얼마나 줄일 수 있는지 |

### Screenshot evidence and target storage

Current Baseline Screenshot은 기존 실제 UI를, Approved Target Mockup은 AI image generation으로 선택·수정해 승인한 목표 UI를, Actual Implementation Screenshot은 React/CSS 구현 결과를 뜻한다.

구현 PR은 가능한 경우 세 이미지를 함께 비교한다. pixel-perfect 복제보다 primary focus, layout hierarchy, relative spacing, palette, surface hierarchy, typography hierarchy, density, major proportion과 navigation structure의 일치를 확인한다.

exploration mockup은 repository에 저장하지 않는다. implementation reference가 필요한 최종 approved target만 versioned 보관한다. exact path, stable filename, PNG format과 approval gate는 [UI Mockup Screen Contract](ui-mockup-contract.md)에서 관리한다.

## UI Screen Mockup Prompt Pack

Master Prompt, repository-grounded capability classification, screen contract, detailed desktop/mobile prompt, generation order와 target approval/storage policy는 [UI Mockup Screen Contract](ui-mockup-contract.md)에서 관리한다. 이 문서는 screen prompt를 복제하지 않고 approved visual direction만 유지한다.

## Runtime AI Asset Strategy

Runtime AI Asset은 product structure를 설명하거나 functional control을 대신하지 않는다. UI Screen Mockup과 달리 실제 application에서 optional image로 사용될 수 있다.

| Asset | 필요성 | Purpose·screen | Format·crop | Theme·cost | Decision proposal |
| --- | --- | --- | --- | --- | --- |
| Cubing Hub key visual | Optional | Guest Home 또는 OG/social에서 precision practice identity 전달 | 16:9 master, 4:5 center-safe crop | light-first, AVIF/WebP fallback과 size budget 필요 | core UI 구조 안정 뒤 별도 승인 시 생성 |
| Auth visual | Low | wide AuthShell의 비어 있는 보조 영역 | 4:5, mobile에서는 숨김 | light surface 전용, lazy load | V2.2에서는 만들지 않음 |
| Empty Practice | Low | 저장된 solve가 없는 recent area | transparent 3:2, action을 침범하지 않음 | 작은 asset만 허용 | CSS/SVG geometry 우선 |
| Empty Growth | Optional | metric sample이 없는 My Growth | transparent 3:2, mobile center crop | lazy load, text alternative 불필요한 decorative 처리 가능 | foundation 뒤 검토 |
| PB achievement | Low | PB 저장 직후 짧은 feedback | transparent 1:1 | reduced motion 대응, 작은 용량 | token·geometry motion 우선, raster 미사용 |
| Subtle background pattern | Optional | Guest Home/OG background | seamless tile 또는 wide 16:9 | light/dark 별도 생성보다 CSS/SVG 유리 | CSS/SVG 우선 |

Button, navigation, form, chart, timer digit, table, metric과 UI text는 이미지로 만들지 않는다. Cube geometry를 code-native SVG/CSS로 충분히 표현할 수 있으면 raster asset을 추가하지 않는다.

## Runtime Asset Prompt Candidates

Runtime AI Asset 생성은 별도 승인 뒤 수행한다. 모든 prompt는 Measured Momentum palette와 safe crop을 기준으로 하며 특정 작가나 브랜드의 visual style을 복제하지 않는다.

### 1. Cubing Hub key visual

- Purpose: Guest Home과 OG/social에서 precision practice와 measured growth를 한 장면에 표현
- Aspect ratio intent: 16:9 master, 중앙 60%는 4:5 mobile crop에서도 유지

```text
Create a refined editorial key visual for a precision cubing practice and performance product. Compose an abstract 3x3 cubie geometry slightly off center, built from matte graphite, warm off-white, deep performance green, and one restrained amber milestone accent. Show a subtle sequence from calibrated pieces to an aligned form, suggesting repeated practice and measurable improvement without depicting a dashboard. Use precise edges, tactile polymer and anodized metal materials, soft directional studio lighting, fine paper-like background texture, generous but purposeful negative space, and a clear focal hierarchy around the central cube geometry. Keep important geometry inside the central 60 percent for a 4:5 mobile crop. No people, no childish toy treatment, no rainbow six-color palette, no neon glow, no glassmorphism, no text, no logo text, no UI screenshot, no fake button, no fake dashboard. Wide 16:9 composition.
```

### 2. Auth visual

- Purpose: wide AuthShell의 보조 영역에서 차분한 brand cue 제공
- Aspect ratio intent: 4:5, mobile에서는 asset 없이 form만 표시

```text
Create a quiet vertical brand illustration for an authentication screen of a serious cubing practice product. Arrange a small set of precise 3x3 cubie modules along a measured vertical rhythm, with matte warm-white surfaces, graphite seams, deep green accents, and a single amber checkpoint. Use soft side lighting, subtle technical paper texture, restrained shadows, and ample empty space so the functional form remains visually dominant beside the image. The cube representation should feel like calibrated sports equipment, not a toy. No people, no gradients, no rainbow palette, no decorative icons, no text, no logo text, no UI screenshot, no fake button, no fake dashboard. Vertical 4:5 composition with a center-safe crop.
```

### 3. Empty Practice

- Purpose: 아직 저장된 solve가 없는 recent Practice 영역의 보조 visual
- Aspect ratio intent: transparent 3:2, 320px mobile에서도 식별 가능

```text
Create a small transparent-background empty-state illustration for a cubing practice timer before the first saved solve. Show one precise unsolved 3x3 cubie outline and a subtle starting marker, using graphite lines, warm-white faces, and one deep green signal. Keep the composition compact, calm, and readable at small size, with minimal material detail and no scenery. Leave clear space below for real product copy and a real action button. No person, no confetti, no rainbow cube, no childish expression, no text, no logo text, no UI screenshot, no fake button, no fake dashboard. Transparent 3:2 asset with center-safe mobile crop.
```

### 4. Empty Growth

- Purpose: Growth sample이 부족할 때 반복 Practice가 data로 이어진다는 의미 보조
- Aspect ratio intent: transparent 3:2, central composition

```text
Create a subtle transparent-background empty-state illustration for a personal cubing growth view with insufficient practice data. Use three small calibrated cubie forms progressing from scattered to aligned, connected only by understated spatial rhythm rather than a literal chart. Materials are matte graphite, warm off-white, deep green, and one restrained amber detail. Keep the image secondary to surrounding explanation and the next-practice action. No graph axes, no fake metrics, no trophies, no confetti, no rainbow palette, no text, no logo text, no UI screenshot, no fake button, no fake dashboard. Transparent 3:2 composition, centered for narrow mobile crop.
```

### 5. PB achievement

- Purpose: PB 순간에 사용할 수 있는 작은 celebratory asset 후보
- Aspect ratio intent: transparent 1:1, short-lived overlay 또는 inline placement

```text
Create a restrained personal-best achievement symbol for a precision cubing performance product. Center a compact 3x3 geometric mark with one amber milestone face emerging from matte graphite and deep green layers. Use crisp construction, subtle radial separation, controlled studio highlights, and a premium sports-equipment feel. Celebration should feel earned and quiet, without confetti or spectacle. The symbol must remain clear at 96 pixels and work on a warm light background. No medal text, no trophy, no rainbow cube, no glow burst, no text, no logo text, no UI screenshot, no fake button, no fake dashboard. Transparent square 1:1 composition.
```

### 6. Subtle background pattern

- Purpose: Guest Home 또는 brand collateral의 low-contrast background
- Aspect ratio intent: seamless tile과 16:9 crop 모두 가능한 반복 구조

```text
Create a seamless low-contrast geometric background pattern inspired by the grid and turning layers of a 3x3 cube. Use thin graphite-gray lines on a warm off-white field with very sparse deep green intersections and an extremely rare amber point. Keep contrast low, spacing generous, geometry precise, and texture lightly tactile so foreground content remains dominant. Avoid literal full cubes and avoid visual noise near the center-safe content area. No gradients, no glow, no rainbow palette, no text, no logo text, no UI screenshot, no fake button, no fake dashboard. Seamless wide 16:9 pattern with mobile-safe central quiet zone.
```

## Decision Matrix

Design Gate 승인 대상만 정리한다. `Default`는 별도 선호가 없을 때 proposal이 따르는 값이다.

| Decision | Options | Recommendation | Reason | Risk | Default | Blocks implementation? |
| --- | --- | --- | --- | --- | --- | --- |
| Visual direction | Precision Bench / Measured Momentum / Arena Signal | Measured Momentum | Core Loop 전체와 Growth·content를 같은 system으로 연결한다. | 평범한 wellness UI로 흐르지 않도록 numeric discipline이 필요하다. | Measured Momentum | Yes |
| Light/Dark | Light-first / Dark-first / both first-class | Light-first, theme-ready token | current light UI에서 migration 범위와 chart QA를 통제한다. | dark 사용 수요를 바로 충족하지 못한다. | Light-first | Yes |
| Navigation | top / sidebar / desktop top + mobile bottom | desktop top + mobile bottom | current route를 보존하면서 mobile core action 순서를 개선한다. | More 안으로 이동한 content destination 발견성이 낮아질 수 있다. | Hybrid | Yes |
| MyPage/Growth IA | 한 화면 / 별도 Growth route / `/mypage` internal sections | current-safe: Records + Account utility, V2.2 target: My Growth + Records + Account utility | private Growth proposal과 current route를 섞지 않고 단계별로 보존한다. | section state와 deep link 기준이 필요하다. | Internal sections | Yes |
| UI design workflow | contract-first / mockup-first / code-first | AI visual mockup-first + repository functional contract | functional contract를 보존하면서 screen hierarchy와 visual detail을 먼저 비교한다. | mockup을 기능 명세로 오해할 수 있다. | Mockup-first | Yes |
| Design System timing | 모든 visual value 선확정 / semantic foundation 후 target 확정 | semantic foundation 먼저, visual detail은 Approved Target Mockup 뒤 확정 | token 의미는 일관되게 유지하고 실제 layout에 맞는 value만 고정한다. | target approval 전 implementation이 지연된다. | Semantic first | Yes |
| Runtime AI Asset | 없음 / optional / 적극 사용 | optional | visual reference와 runtime bundle을 분리한다. | 생성 품질과 bundle cost가 불확실하다. | 생성하지 않음 | No |
| Timer distraction-free | 없음 / state-based focus / fullscreen toggle | state-based focus | 기존 interaction과 browser lifecycle을 바꾸지 않고 집중도를 높인다. | 일부 사용자는 explicit fullscreen을 원할 수 있다. | State-based focus | No |
| Screenshot strategy | manual / Playwright / Storybook+Chromatic | fixed viewport baseline / target / implementation 비교, automation은 구조 안정 뒤 재평가 | current visual infra가 없고 초기 churn이 크다. | pixel regression을 자동 차단하지 못한다. | Manual evidence | Yes, before first screen migration |

## Current, Proposal and Out of Scope

### Current

- React SPA, desktop top navigation, mobile bottom navigation
- Recharts 3.8.1, Lucide, React Toastify
- V2.1 Timer/Record behavior와 current routes
- light-only CSS token과 page-specific styles

### Design Gate proposal

- `Measured Momentum`, light-first semantic token
- Core Loop 중심 App Shell
- Timer focus stage와 private My Growth hierarchy
- AI UI Screen Mockup exploration, Target Mockup approval과 manual visual evidence
- optional Runtime AI Asset

### Future candidate

- first-class dark theme
- Playwright screenshot gate
- user-validated fullscreen Timer mode
- optional key visual과 empty-state asset

### Out of scope

- production frontend implementation와 dependency 설치
- V2.2 backend/API 구현
- new Public Profile
- Daily Challenge, Verified Record, Competition과 future event UI
- AI image generation
- product requirement, Growth metric와 Roadmap 변경
