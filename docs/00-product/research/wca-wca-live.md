---
doc_type: research
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/market-validation.md
  - docs/01-domain/competition-rules.md
researched_at: 2026-08-10
---
# WCA and WCA Live Research

## 서비스 개요

World Cube Association은 공식 twisty puzzle competition을 관장하는 volunteer-led nonprofit이다. WCA Live는 공식 competition administration과 live result presentation을 지원하는 open-source application이다.

## 핵심 사용자

competitor, delegate, organizer, score taker, staff와 공식 결과를 보는 관람자다.

## 해결하는 문제

전 세계 competition에 공통 규정·역할·결과 권위를 제공하고, 현장에서 round와 score를 관리해 공식 WCA data와 동기화한다.

## 핵심 기능

- WCA 공식 규정과 competition·result
- delegate·organizer governance
- WCA Live round management와 score entry
- ranking, advancement, record, podium live display
- WCA OAuth2 권한 확인
- WCIF 기반 WCA website 양방향 synchronization

## Core Loop

공식 competition 준비 → 역할·schedule·scramble 운영 → solve·penalty score entry → 검토·advancement → WCA Source of Truth에 결과 반영한다.

## 강점

- 확인된 사실: 규정, 역할, data exchange, 공식 publish가 하나의 governance chain을 이룬다
- 해석: 공식 기록의 신뢰는 timer UI보다 process와 권한에서 나온다

## 약점

- 확인된 사실: WCA Live는 WCA competition과 WCIF를 전제로 한다
- 추론: 비공식 community event가 그대로 도입하기에는 역할·절차가 무거울 수 있다

## 수익모델 또는 운영모델

WCA는 volunteer-led nonprofit으로 운영된다. WCA Live는 official GitHub repository에 공개된 open-source software다.

## Cubing Hub와 겹치는 영역

event code, scramble·penalty 개념, ranking·result, future competition과 verified record가 접한다.

## Cubing Hub가 참고할 점

- official authority와 external Source of Truth 구분
- role, incident decision, advancement, publish 단계
- versioned rule과 data synchronization
- result correction과 audit 가능성

## Cubing Hub가 따라하지 않을 점

WCA 규정을 복제해 독자적으로 공식 권위를 주장하거나, Cubing Hub self-reported record를 WCA result처럼 표시하지 않는다.

## 차별화 가능 영역

공식 대회를 대체하지 않고 연습, learning, community, 비공식 활동 또는 공식 대회 준비 주변에서 보완 가치를 찾을 수 있다.

## 확인된 사실

조사일 현재 Regulations 페이지는 2026-04-01 version을 current로 표시한다. 번역은 편의용이며 영문 current version이 공식 기준이다. WCA Live README는 WCA website를 Source of Truth로 설명한다.

## 추론/가설

future verified·competition 기능은 evidence뿐 아니라 역할·incident·publish·appeal 정책을 함께 설계해야 한다.

## 출처

- [WCA About](https://www.worldcubeassociation.org/about)
- [WCA Regulations](https://www.worldcubeassociation.org/regulations/)
- [WCA Regulation Translations](https://www.worldcubeassociation.org/regulations/translations/)
- [WCA Live GitHub](https://github.com/thewca/wca-live)
