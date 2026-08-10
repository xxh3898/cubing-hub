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
# Cubeast Research

## 서비스 개요

Cubeast는 Bluetooth smart cube의 move data를 기록하고 solve를 phase·execution 관점에서 분석하는 training service다.

## 핵심 사용자

3x3 solve의 세부 구간과 move execution을 데이터로 분석하려는 사용자다.

## 해결하는 문제

최종 time만으로 알기 어려운 recognition, execution, pause, TPS와 method별 약점을 보여 준다.

## 핵심 기능

- Bluetooth cube solve recording
- phase recognition·execution time
- inspection, pickup·put-down, TPS
- method별 분석
- solve 공유 link
- StackMat 연동
- skill-specific Academy exercise

## Core Loop

smart cube 연결 → solve → 자동 phase 분석 → 약점 확인 → 관련 exercise → 다시 solve한다.

## 강점

- 확인된 사실: raw time을 넘어 move-level training feedback을 제공한다
- 해석: 분석이 다음 연습 행동으로 이어지는 Core Loop가 명확하다

## 약점

- 확인된 사실: smart cube 연결이 핵심 입력이다
- 추론: hardware 비용, model compatibility, pairing 안정성이 adoption 장벽일 수 있다

## 수익모델 또는 운영모델

조사일 현재 공식 공개 landing page에서 가격과 구체 수익모델을 확인하지 못했다.

## Cubing Hub와 겹치는 영역

solve history, performance analysis, learning·training이 겹친다.

## Cubing Hub가 참고할 점

- 단순 chart가 아니라 개선할 phase와 exercise를 연결하는 방식
- solve 공유와 coaching 가능성
- metric이 사용자 행동으로 이어지는지 검증하는 관점

## Cubing Hub가 따라하지 않을 점

hardware integration을 제품 방향 검증 전에 전제하거나, 측정 가능한 모든 data를 수집하지 않는다.

## 차별화 가능 영역

smart cube 없이도 사용자가 다음 학습 행동을 선택하도록 timer·history·learning을 연결할 수 있는지 검증한다.

## 확인된 사실

공식 제품 페이지의 기능 설명과 supported device 주장을 사실 출처로 사용했다.

## 추론/가설

Bluetooth data가 없는 다수 사용자에게도 충분한 coaching value를 제공할 수 있는지는 별도 사용자 연구가 필요하다.

## 출처

- [Cubeast](https://www.cubeast.com/)
