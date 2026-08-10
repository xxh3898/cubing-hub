---
doc_type: product
status: draft
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/vision.md
  - docs/00-product/research/cstimer.md
  - docs/00-product/research/cubedesk.md
  - docs/00-product/research/cubingtime.md
  - docs/00-product/research/cubeast.md
  - docs/00-product/research/cubing-contests-recordranks.md
  - docs/00-product/research/wca-wca-live.md
---
# Market Validation

## 목적

공개 서비스 조사에서 확인한 패턴을 제품 가설로 변환한다. 이 문서는 최종 Vision이나 roadmap 결론이 아니다.

## 조사 종합

- timer와 개인 기록 분석은 csTimer, CubeDesk처럼 이미 강한 전문 도구가 존재한다.
- training insight는 Cubeast처럼 smart cube data와 분석을 결합할 때 별도 가치가 생길 수 있다.
- 실시간 교류와 online competition은 CubingTime이 다른 사용 동기를 보여 준다.
- 대회 탐색·운영·rank aggregation은 Cubing Contests와 RecordRanks가 공식 WCA 경험 주변의 빈틈을 다룬다.
- WCA와 WCA Live는 공식 규정·결과 권위와 competition live operation의 기준점이다.

위 사실은 Cubing Hub가 어떤 포지션을 선택해야 하는지 자동으로 결정하지 않는다.

## 현재 가설

- 단순 timer 기능만으로는 차별화 설명이 어렵다.
- Cubing Hub의 현재 기록, ranking, learning, community를 하나의 반복 흐름으로 연결할 여지가 있다.
- verified activity와 competition은 신뢰·운영 책임이 크므로 feature desirability만으로 결정할 수 없다.
- 한국어 중심 경험, 지역 community, 파트너 연계는 가능성이 있지만 사용자 검증이 필요하다.

## 검증 Backlog

1. 현재 또는 잠재 사용자 5~10명에게 최근 연습·기록·학습·대회 준비 과정을 인터뷰한다.
2. csTimer 등 기존 도구를 바꾸려는 이유가 아니라 여러 도구 사이의 끊김을 확인한다.
3. V1 사용 흐름에서 timer 이후 실제 다음 행동을 관찰한다.
4. organizer에게 참가 접수, 진행, 결과 공유의 반복 비용과 실패 위험을 묻는다.
5. verified record가 필요한 상황과 허용 가능한 증거·review 시간을 조사한다.
6. 코리아보드게임즈 같은 파트너 후보와 협업 가치를 논의하되 운영권·데이터 경계를 먼저 확인한다.

## 반증 조건

- 사용자가 현재 도구 조합에서 의미 있는 불편을 느끼지 않는다.
- 후보 기능의 운영 비용이 사용자 가치보다 크다.
- 신뢰에 필요한 증거 수집이 사용자나 운영자에게 과도하다.
- 협업이 독립 운영 또는 사용자 신뢰와 양립하지 않는다.

## 다음 결정

조사 결과와 사용자 인터뷰가 쌓인 뒤 핵심 사용자, 문제, Core Loop 선택지를 비교한다. 그 전에는 [Vision](vision.md), [PRD](prd.md), [Roadmap](roadmap.md)을 draft로 유지한다.
