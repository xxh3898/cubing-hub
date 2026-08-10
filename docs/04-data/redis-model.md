---
doc_type: data
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/auth-security.md
  - docs/03-architecture/ranking-architecture.md
---
# Redis Model

Redis는 단일 역할이 아니라 auth temporary state와 ranking Read Model을 함께 보유한다.

## Authentication keys

| Pattern | Value | Lifecycle |
| --- | --- | --- |
| refresh:{email}:{jti} | refresh JWT | refresh 만료 TTL, rotation·logout 시 삭제 |
| blacklist:{accessToken} | logout marker | access token 남은 수명 TTL |
| auth:email-verification:code:{email} | verification code | code TTL |
| auth:email-verification:cooldown:{email} | true | resend cooldown TTL |
| auth:email-verification:verified:{email} | true | signup 허용 TTL |
| auth:password-reset:code:{email} | reset code | code TTL |
| auth:password-reset:cooldown:{email} | true | resend cooldown TTL |

key나 token 원문을 운영 문서·log에 복제하지 않는다.

## Ranking keys

event마다 다음 ranking:v2:{EventType} prefix를 사용한다.

| Suffix | Type | 역할 |
| --- | --- | --- |
| :ready | String | event Read Model이 완전히 준비됐다는 marker |
| :zset | ZSET | effective time score와 안정 정렬 member |
| :nicknames | Hash | user id → nickname |
| :members | Hash | user id → 현재 ZSET member |

member는 PB record created_at epoch millis, record id, user id를 고정 폭으로 직렬화한다.

## 복구 특성

ranking keys는 MySQL user_pbs에서 rebuild할 수 있다. auth keys 손실은 active session, logout blacklist, 진행 중 verification을 무효화할 수 있으므로 Redis 전체를 단순 cache로 표현하지 않는다.

## 변경 규칙

key version, serialization, TTL 또는 rebuild mode를 바꾸면 backward compatibility, rollout 순서, fallback, test와 운영 runbook을 함께 갱신한다.
