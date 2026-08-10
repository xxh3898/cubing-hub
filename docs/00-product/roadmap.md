---
doc_type: product
status: draft
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/00-product/market-validation.md
---
# Roadmap

## 상태

개발 순서와 일정은 확정되지 않았다. 따라서 이 문서는 날짜형 roadmap이 아니라 의사결정 gate를 관리한다.

## 현재 유지 트랙

- V1 기능의 정확성, 보안, 데이터 정합성, 배포·복구 가능성 유지
- generated REST Docs와 실제 endpoint 계약의 일치
- 문서와 코드가 함께 갱신되는 체계 유지

## Discovery 트랙

1. 참고 서비스 research의 사실을 주기적으로 갱신한다.
2. Cubing Hub 사용자 또는 잠재 사용자 인터뷰로 문제 강도를 확인한다.
3. 현재 V1 사용 흐름에서 이탈과 반복 사용 동기를 확인한다.
4. 후보별 최소 검증 방법을 정한다.
5. Vision과 PRD를 별도 논의로 확정한다.

## 후보 트랙

아래 순서는 우선순위가 아니다.

- Daily Challenge
- Verified Record
- Competition
- Organizer
- 기존 timer, ranking, learning, community의 강화

각 후보는 문제, 사용자, 성공 조건, 운영 부담을 검증한 뒤에만 delivery 단계로 이동한다.

## Decision Gates

- Gate A: 핵심 사용자와 문제가 증거로 설명되는가
- Gate B: 후보가 기존 Core Loop를 강화하는가
- Gate C: 법적·운영·데이터 책임을 감당할 수 있는가
- Gate D: acceptance criteria와 rollback 범위가 정의됐는가

## Open Questions

- 어떤 discovery를 먼저 실행할 것인가
- 제품 분석을 위한 최소 event와 개인정보 경계는 무엇인가
- 파트너 인터뷰와 최종 사용자 인터뷰의 순서를 어떻게 둘 것인가
