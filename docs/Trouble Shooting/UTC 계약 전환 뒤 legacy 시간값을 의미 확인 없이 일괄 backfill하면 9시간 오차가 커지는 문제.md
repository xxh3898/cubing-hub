# UTC 계약으로 바꾼 뒤 legacy 시간 데이터를 의미 확인 없이 일괄 backfill하면 9시간 오차가 커지는 문제

## Summary

- 시간 저장과 응답 계약을 `Instant + UTC`로 바로잡은 뒤, 과거 운영 데이터까지 한 번에 `-9시간` 보정하고 싶어지는 상황이 생겼다.
- 하지만 기존 행이 UTC 의미인지 KST 벽시계 의미인지 섞여 있을 수 있어, 확인 없는 일괄 backfill은 정상 데이터까지 망가뜨릴 수 있었다.
- 해결은 새 코드 계약을 먼저 고정하고, legacy 행은 샘플 확인 전까지 보정하지 않는 것이었다.

## Environment

- Java `Instant`
- Spring Boot + JPA/Hibernate
- MySQL timestamp/datetime columns
- Frontend `Asia/Seoul` datetime rendering

## Symptom

- 새 코드 적용 뒤 화면 시간이 어떤 행은 정확해지고, 어떤 행은 9시간 밀려 보일 수 있었다.
- 사용자는 “고치기 전 답변 시각”이라고 기억하는데 화면은 다음 날 새벽으로 보이는 사례가 생겼다.
- 이때 코드를 고친 직후라서 DB 전체에 `-9시간` 보정을 적용하고 싶어지지만, 실제로는 일부 행만 문제일 가능성이 있었다.

## Reproduction

1. 기존 시스템에서 timezone 없는 `LocalDateTime` 성격의 값이 여러 방식으로 저장돼 있다.
2. 새 코드에서 저장/API 계약을 `Instant + UTC`로 바꾸고, 화면은 `Asia/Seoul`로 렌더링한다.
3. legacy 행의 실제 의미를 확인하지 않은 채 일괄 `-9시간` backfill을 적용하면, 이미 UTC 의미였던 정상 행까지 함께 틀어진다.

## Expected

- 새로 생성되는 시간값은 UTC instant로 저장되고 API는 `Z` suffix를 포함해 응답해야 한다.
- 기존 행은 실제 저장 의미를 확인한 뒤, 필요한 범위만 제한적으로 보정해야 한다.

## Actual

- 새 코드만 보면 시간 계약은 더 명확해졌지만, 과거 행이 어떤 의미로 저장됐는지는 코드만으로 확정할 수 없었다.
- 그래서 성급한 일괄 backfill은 “표시 오류를 고치려다 다른 정상 데이터까지 다시 깨는” 위험을 만들었다.

## Root Cause

- 문제의 핵심은 timezone 포맷이 아니라 legacy 데이터의 의미 혼재다.
- 어떤 행은 UTC 의미로 저장됐고, 어떤 행은 KST 벽시계 의미로 저장됐을 수 있다.
- 이 상태에서 코드 계약 정리와 데이터 보정을 한 번에 처리하면, 저장 의미 확인이라는 별도 판단 단계를 건너뛰게 된다.

## Fix

- 먼저 새 저장/API 계약을 `Instant + UTC`, 화면 표시를 `Asia/Seoul`로 분리해 고정한다.
- legacy 데이터는 즉시 수정하지 않고, 실제 사람이 기억하는 시각과 DB 값을 비교할 수 있는 샘플 행부터 확인한다.
- 보정이 필요하면 테이블 전체가 아니라 특정 행 ID 또는 특정 배포 이전 범위처럼 좁은 단위로 자른다.
- `answered_at`만 보지 말고 같은 흐름의 `published_at`, `created_at` 같은 연관 컬럼도 함께 본다.

## Verification

- backend 시간 타입을 `Instant`로 바꾸고 `hibernate.jdbc.time_zone=UTC`를 적용한 뒤 전체 test/build와 frontend lint/test/build를 통과시켰다.
- 별도 backfill 작업에서는 운영 DB를 직접 수정하지 않고, 실제 사례를 기준으로 “보정 대상일 수도 있고 아닐 수도 있다”는 판단 기준을 문서로 정리했다.
- 따라서 이번 해결의 핵심 검증은 “성급한 일괄 보정을 하지 않았다”는 점에 있다.

## Prevention

- 시간 계약 전환 작업과 legacy data backfill을 같은 작업으로 묶지 않는다.
- 화면에서 9시간 차이가 보이면 곧바로 offset SQL부터 쓰지 말고, 그 행이 UTC 의미인지 KST 의미인지 먼저 증명한다.
- 운영 샘플 행, 배포 시각, 연관 컬럼을 확인하기 전에는 테이블 전체 일괄 보정을 기본값으로 두지 않는다.

## Related

- [2026-04-27 - Daily Log](../Retrospectives/2026/04%EC%9B%94/2026-04-27%20-%20Daily%20Log.md)
- [2026-04-27 - TIL](../Retrospectives/2026/04%EC%9B%94/2026-04-27%20-%20TIL.md)
- [DB, API, UI 시간 표현을 언제 UTC instant로 고정하고, 언제 KST로 변환해야 하는가](../DevQ&A/DB,%20API,%20UI%20%EC%8B%9C%EA%B0%84%20%ED%91%9C%ED%98%84%EC%9D%84%20%EC%96%B8%EC%A0%9C%20UTC%20instant%EB%A1%9C%20%EA%B3%A0%EC%A0%95%ED%95%98%EA%B3%A0,%20%EC%96%B8%EC%A0%9C%20KST%EB%A1%9C%20%EB%B3%80%ED%99%98%ED%95%B4%EC%95%BC%20%ED%95%98%EB%8A%94%EA%B0%80.md)

## Internal Links

- [[Archive/Projects/Cubing Hub/Cubing Hub]]
- [[AI/Inbox/cubing-hub/20260427/02-time-contract/review-time-contract]]
- [[AI/Inbox/cubing-hub/20260427/03-time-backfill/review-time-backfill]]
