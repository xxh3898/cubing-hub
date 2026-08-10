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
researched_at: 2026-08-10
---
# csTimer Research

## 서비스 개요

csTimer는 browser에서 동작하는 open-source speedcubing timer와 training toolkit이다.

## 핵심 사용자

다양한 puzzle과 training mode, 상세 통계, hardware input을 원하는 연습 중심 큐버다.

## 해결하는 문제

한 도구에서 scramble 생성, 측정, session 관리, 분석, 전문 training utility를 제공한다.

## 핵심 기능

- 모든 WCA event와 다수 training scramble
- 통계, session, solver와 보조 도구
- keyboard, touch, StackMat, Bluetooth cube 입력
- file·server·Google storage backup 또는 export
- PWA와 offline 사용

## Core Loop

scramble 선택 → solve 측정 → session 저장 → 통계·분석 확인 → 다음 solve 또는 training으로 반복한다.

## 강점

- 확인된 사실: 넓은 scramble·tool·input 지원과 open-source 코드
- 해석: power user가 원하는 timer 깊이와 customization이 매우 강하다

## 약점

- 확인된 사실: browser 중심의 높은 기능 밀도와 local storage 사용
- 추론: 입문자에게 설정과 화면 정보량이 진입 장벽일 수 있고 local data 관리 책임이 커질 수 있다

## 수익모델 또는 운영모델

GPLv3 open source이며 공식 화면과 repository에 donation 경로가 있다. 공개 정보만으로 별도 subscription 사업은 확인하지 못했다.

## Cubing Hub와 겹치는 영역

timer, scramble, solve history, statistics, event 선택이 겹친다.

## Cubing Hub가 참고할 점

- timer의 keyboard·touch 신뢰성
- penalty, session, import·export와 portability
- offline 또는 network failure에서 기록을 잃지 않는 경험
- 전문 기능을 기본 화면에서 단계적으로 드러내는 방식

## Cubing Hub가 따라하지 않을 점

기능 수와 설정 수를 그대로 복제하거나 csTimer를 대체하는 것을 목표로 삼지 않는다.

## 차별화 가능 영역

한국어 중심 onboarding, learning·community·profile과 기록의 연결, server 운영 기반 참여 흐름은 추가 검증할 수 있다.

## 확인된 사실

위 기능·storage·license 정보는 공식 Web UI와 GitHub README·source 설명에서 확인했다.

## 추론/가설

csTimer 사용자가 timer를 바꿀 의향보다 timer 이후 여러 서비스로 이동하는 불편이 있는지를 인터뷰해야 한다.

## 출처

- [csTimer official](https://www.cstimer.net/new/?lang=en-us)
- [csTimer GitHub](https://github.com/cs0x7f/cstimer)
