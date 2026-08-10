---
doc_type: domain
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/solve-model.md
  - docs/01-domain/ranking-rules.md
---
# Glossary

| 용어 | 현재 의미 |
| --- | --- |
| Solve | 사용자가 특정 event의 scramble을 수행해 측정하고 저장한 한 번의 시도 |
| Record | records table에 저장된 self-reported solve. 공식 또는 검증 완료 기록을 뜻하지 않음 |
| Raw time | penalty 적용 전 millisecond 단위 측정값 |
| Effective time | NONE은 raw time, PLUS_TWO는 raw time + 2000ms, DNF는 산출하지 않음 |
| PB | 사용자와 event별 가장 좋은 rankable solve를 가리키는 Personal Best |
| Ranking | 각 사용자의 PB를 비교해 부여하는 Cubing Hub 내부 순위 |
| Event | EventType enum이 표현하는 WCA 종목 코드 집합 |
| Scramble | solve 시작 조건을 나타내는 문자열. 현재 generator 지원 범위와 WCA 공식 scramble은 동일 개념이 아님 |
| Verified Record | 증거와 review 정책을 통과한 기록 후보 개념. 현재 구현되지 않음 |
| WCA official result | WCA가 규정과 대회 절차에 따라 관리하는 외부 공식 결과 |
| Source of Truth | 정합성 판단의 최종 기준 데이터 또는 문서 |
| Read Model | 조회를 빠르게 하기 위해 Source of Truth로부터 재생성 가능한 표현 |
| Organizer | 대회 또는 행사를 준비·운영하는 사용자 후보 역할. 현재 구현되지 않음 |

## 구분 원칙

Cubing Hub의 Record와 Ranking은 self-reported 내부 데이터다. WCA official result나 미래 Verified Record와 같은 권위를 암시해서는 안 된다.
