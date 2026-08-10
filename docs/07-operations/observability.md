---
doc_type: operation
status: review-needed
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/07-operations/incident-response.md
---
# Observability

## Repository에서 확인된 구성

- Spring Actuator health
- production management exposure 기본값: health
- local profile의 Prometheus endpoint와 Prometheus·Grafana helper
- container json-file log rotation
- deploy·backup script의 HomeOps event reporting
- public deployment smoke
- feedback Discord notification 내부 상태

## 확인이 필요한 실제 운영 상태

- production metric 수집과 dashboard 연결
- alert rule, notification route, on-call owner
- SLO·SLI와 error budget
- log 보존·검색 방식
- ranking fallback·rebuild와 image mismatch에 대한 alert
- public synthetic check 범위

repository 설정이 존재한다는 사실을 실제 dashboard·alert가 동작한다는 사실로 표현하지 않는다.

## 최소 signal 후보

- Web·API health와 public latency
- 5xx·auth failure 추세
- MySQL·Redis 연결과 resource pressure
- ranking Redis ready·fallback·sync failure
- post image read/write와 metadata mismatch
- backup result와 마지막 정상 snapshot
- deploy state와 rollback result

실제 monitoring 구성을 확인한 뒤 owner, threshold, link를 채우고 active로 전환한다.
