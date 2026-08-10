---
doc_type: operation
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/07-operations/observability.md
  - homeserver/docs/home-server-runbook.md
---
# Incident Response

## 원칙

alert와 unhealthy는 조사 시작 신호이며 자동 restart 권한이 아니다. 환경과 exact service를 확인하고 read-only evidence를 수집한 뒤 영향 범위와 복구 방법을 결정한다.

## 초기 분류

- public Web 또는 SPA asset
- API health·authentication
- MySQL·Redis
- post image read/write
- deployment·runtime config transaction
- backup·restore
- shared edge·Cloudflare dependency
- outbound SMTP·Discord dependency

## 조사 순서

1. incident 시작 시각, 사용자 영향, 최근 변경을 기록한다.
2. exact production Compose와 service 상태를 확인한다.
3. 필요한 service의 최근 log만 읽고 secret을 마스킹한다.
4. application revision과 runtime config digest, pending transaction을 확인한다.
5. data 손실 가능성이 있으면 write를 중단하기 전에 backup과 복구 경계를 확인한다.
6. 설정 변경·restart·rollback은 별도 승인 후 canonical runbook으로 수행한다.

## 종료 조건

사용자 흐름과 data 정합성이 회복되고 원인·조치·미검증·후속 작업이 기록돼야 한다. health만 돌아온 상태를 완전 복구로 표현하지 않는다.

command는 [Mac mini 운영 Runbook](../../homeserver/docs/home-server-runbook.md)을 따른다.
