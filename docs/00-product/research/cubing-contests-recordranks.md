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
  - docs/02-requirements/features/organizer.md
researched_at: 2026-08-10
---
# Cubing Contests and RecordRanks Research

## 서비스 개요

Cubing Contests는 RecordRanks software를 사용해 unofficial cubing competition과 meetup, submitted result를 운영한다. RecordRanks는 여러 performance-based sport를 위한 competition·ranking platform을 제공한다.

## 핵심 사용자

competition 참가자, moderator, admin, organizer와 white-label event platform이 필요한 조직이다.

## 해결하는 문제

대회 생성·승인, schedule·round, 현장 score entry, 결과 publish, ranking 반영과 public result 공유를 일관된 workflow로 만든다.

## 핵심 기능

- unofficial competition과 meetup
- moderator 권한과 admin 승인
- event·round·schedule
- keyboard 중심 result entry
- publish gate와 ranking 반영
- live result, record, public API, export·backup
- RecordRanks premium white-label, custom domain, separate database

## Core Loop

organizer 신청·승인 → competition 구성 → 참가·현장 result entry → 검토·publish → record·ranking 탐색 → 다음 competition을 운영한다.

## 강점

- 확인된 사실: participant 화면보다 moderator·publish·data ownership까지 운영 lifecycle을 공개한다
- 해석: competition의 핵심이 score 화면이 아니라 governance라는 점을 보여 준다

## 약점

- 확인된 사실: volunteer admin review에 의존하는 영역이 있고 tournament bracket은 coming soon이다
- 추론: 운영자 onboarding과 moderation capacity가 확장 병목일 수 있다

## 수익모델 또는 운영모델

Cubing Contests는 volunteer admin team과 Ko-fi contribution을 공개한다. RecordRanks는 free start와 premium white-label, dedicated infrastructure, custom domain, separate database, direct data access를 공개한다.

## Cubing Hub와 겹치는 영역

future competition·organizer, ranking, result publication, community activity가 겹친다.

## Cubing Hub가 참고할 점

- organizer role과 admin approval 분리
- draft result와 published result 경계
- 현장 keyboard data entry와 장애 대응
- export, backup, data ownership
- unofficial과 official WCA 관계의 명확한 표기

## Cubing Hub가 따라하지 않을 점

coming soon feature를 현재 기능으로 표현하거나, organizer interview 없이 full management suite를 선설계하지 않는다.

## 차별화 가능 영역

국내 지역 행사와 비공인 event의 실제 반복 업무, 한국어 운영 지원, 파트너 협업 범위를 조사할 수 있다.

## 확인된 사실

서비스 About, moderator instructions, features와 운영모델 페이지에 공개된 내용이다.

## 추론/가설

Cubing Hub는 WCA 대체보다 국내 미충족 organizer workflow를 찾는 편이 신뢰 경계를 명확히 할 가능성이 있다.

## 출처

- [Cubing Contests](https://cubingcontests.com/)
- [Cubing Contests About](https://cubingcontests.com/about)
- [Moderator Instructions](https://cubingcontests.com/moderator-instructions)
- [RecordRanks](https://recordranks.com/)
- [RecordRanks Features](https://recordranks.com/features)
- [RecordRanks About](https://recordranks.com/about)
