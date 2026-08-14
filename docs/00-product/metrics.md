---
doc_type: product
status: draft
created: 2026-08-10
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/02-requirements/features/growth.md
---
# Metrics

## 원칙

현재 target 수치와 North Star Metric은 확정되지 않았다. repository에 제품 분석 event 계약도 정의돼 있지 않으므로, 아래는 측정 후보이며 성과 사실이 아니다.

## 사용자 가치 후보

- 첫 유효 solve 저장까지 도달한 가입 사용자 비율
- 주간 solve 저장 사용자와 사용자당 solve 수
- timer → 기록 검토 → ranking 또는 학습으로 이어지는 비율
- 학습 콘텐츠 재방문과 단계 탐색
- 게시글·댓글·Q&A의 건전한 참여
- 향후 검증형 활동이 도입될 경우 제출 대비 검증 완료 비율

## V2.2 Growth validation 후보

V2.2는 숫자를 많이 노출하는 것보다 `Record → Improve → Profile → Practice`가 실제 행동으로 이어지는지 검증한다.

- Record 저장 사용자의 My Growth 도달 비율
- 첫 Growth 조회 뒤 7일 이내 재방문
- Timer에서 Growth로 이동한 비율
- Growth의 Next Practice action에서 Timer로 돌아간 비율
- PB progression timeline/chart 확인
- Growth 조회 전후 Practice Record 저장 빈도. 관찰 cohort 차이를 인과로 표현하지 않음

최소 analytics event property와 사용자 인터뷰 질문은 [Growth 요구사항](../02-requirements/features/growth.md#product-validation)이 관리한다. Analytics infrastructure, target 수치와 retention 정책은 V2.2 application scope에 자동 포함하지 않는다.

## 품질·운영 지표

- API 오류율과 주요 흐름 성공률
- ranking Read Model 동기화 실패와 MySQL fallback 발생
- 배포 후 public smoke 성공
- backup snapshot 성공, restore drill 성공, 복구 소요 시간
- 게시글 image metadata와 binary 불일치

## Guardrail 후보

- 인증 실패와 비정상 token 재사용
- 신고·moderation 처리 시간
- 개인정보 또는 기록 증거의 불필요한 보존
- 운영자가 수동으로 처리해야 하는 건수

## 미확정 사항

- North Star Metric
- metric별 정의, 집계 기간, 목표값
- analytics 도구와 event schema
- consent, retention, 삭제 정책
- 내부 운영 지표와 외부 공개 지표의 경계

target을 정하기 전에 현재 baseline을 측정하고 표본 수와 수집 품질을 함께 기록한다.
