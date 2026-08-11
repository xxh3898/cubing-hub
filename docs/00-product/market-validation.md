---
doc_type: product
status: draft
created: 2026-08-10
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/vision.md
  - docs/00-product/roadmap.md
  - docs/00-product/research/cstimer.md
  - docs/00-product/research/cubedesk.md
  - docs/00-product/research/cubingtime.md
  - docs/00-product/research/cubeast.md
  - docs/00-product/research/cubing-contests-recordranks.md
  - docs/00-product/research/wca-wca-live.md
---
# Market Validation

## 문서 상태와 목적

공개 서비스 조사에서 확인한 사실, 제품 방향, 앞으로 검증할 가설을 분리한다. 제품 방향이 정해졌다고 시장 수요 검증이 완료된 것은 아니다.

## Research에서 확인한 패턴

- pure timer와 개인 기록 분석에는 csTimer, CubeDesk처럼 강한 기존 도구가 있다.
- solve 이후 social, online competition, training insight로 이어지는 서비스 패턴이 존재한다.
- Smart Cube data와 분석의 결합은 timer와 다른 improvement 가치를 제공할 가능성을 보여 준다.
- WCA와 WCA Live는 공식 competition 규정·운영·결과 권위의 기준이며 Cubing Hub 내부 활동과 구분해야 한다.
- competition management는 scramble, 역할, result correction, audit와 governance 비용을 동반한다.

세부 조사 근거는 [research 문서](research/)에서 관리한다. 위 사실만으로 Cubing Hub의 기능 우선순위나 시장 수요가 자동 확정되지는 않는다.

## 제품 방향

- Cubing Hub는 Cuber-first 큐빙 활동 플랫폼으로 간다.
- Primary User는 일상적으로 반복 연습하며 기록 단축과 성장에 관심 있는 큐버다.
- 제품 흐름은 Practice → Record → Improve → Participate → Profile → Practice다.
- solve를 단순 기록으로 끝내지 않고 성장·비교·참여·장기 활동 이력으로 연결한다.
- Competition은 advanced participation 영역으로 두고 제품 전체 정체성으로 삼지 않는다.
- Daily Challenge는 Participation 가치를 확인할 미래 검증 후보로 둔다.
- V2.1 Timer / Record Foundation을 Growth, Daily Challenge, Verified Record보다 먼저 정비한다.

제품 표현은 [Vision](vision.md), 구현 범위와 선행 gate는 [PRD](prd.md), 단계 순서는 [Roadmap](roadmap.md)이 기준이다.

## 아직 검증할 가설

- 한국 큐버가 연습·기록·학습·참여 도구 사이의 단절을 실제로 강하게 느끼는가
- Growth와 Profile이 반복 연습과 장기 retention에 실질적인 가치를 주는가
- Daily Challenge가 반복 참여와 비교 동기를 높이는가
- Verified Record에 evidence 제출과 review 비용을 감수할 수요가 있는가
- Competition과 Organizer 문제를 Cubing Hub가 운영 가능한 방식으로 해결할 수 있는가
- Partner·Brand가 Cuber 가치와 독립 운영을 해치지 않는 value를 제공하는가

## 검증 Backlog

1. 현재 또는 잠재 사용자 5~10명의 연습·기록·성장·참여 흐름을 인터뷰한다.
2. 기존 timer를 대체할 이유보다 여러 도구와 활동 사이의 끊김을 확인한다.
3. V1 Timer 저장 이후 사용자가 실제로 수행하는 다음 행동을 관찰한다.
4. Growth/Profile concept과 Daily Challenge prototype의 행동 변화를 검증한다.
5. Verified Record가 필요한 상황, 허용 가능한 evidence와 review 시간을 조사한다.
6. Organizer의 반복 비용과 실패 위험을 확인하되 Competition 범위를 먼저 확정하지 않는다.
7. Partner 후보와 협업 가치를 논의할 때 운영권·사용자 data·공식 권위 경계를 함께 확인한다.

## 반증 조건

- 사용자가 현재 도구 조합에서 의미 있는 단절이나 불편을 느끼지 않는다.
- Foundation 이후의 후보 기능이 Core Loop를 강화하지 않는다.
- evidence·moderation·competition 운영 비용이 사용자 가치보다 크다.
- 협업이 독립 운영, 사용자 data 보호 또는 공식 권위 구분과 양립하지 않는다.
