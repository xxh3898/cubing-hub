---
doc_type: api
status: draft
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/05-api/README.md
  - docs/04-data/migration-policy.md
---
# API Compatibility Policy

## 상태

공식 API versioning, public consumer support window, deprecation 기간은 아직 확정되지 않았다.

## 현재 안전 원칙

- frontend와 backend는 같은 repository에서 함께 변경하더라도 배포 중 구·신 revision이 잠시 공존할 가능성을 검토한다.
- 기존 field 제거, 의미 변경, enum 축소, status 변경은 breaking change로 취급한다.
- additive optional field는 consumer와 generated docs를 함께 검토한다.
- schema change와 API change의 rollout 순서를 분리해 생각한다.
- API/Web image는 같은 commit SHA로 release하지만 browser cache에 이전 asset이 남을 수 있다.

## 변경 분류 후보

| 분류 | 예 | 기본 처리 |
| --- | --- | --- |
| Additive | optional response field, 새 endpoint | test·docs 추가 |
| Behavior change | 정렬, validation, 권한 변경 | migration note와 consumer test |
| Breaking | 필수 field, path, enum 제거 | versioning 또는 단계적 전환 필요 |
| Security fix | auth·exposure 수정 | 공개 범위와 긴급 rollout 별도 판단 |

## Open Questions

- external API consumer를 지원할지
- URL 또는 media type versioning을 사용할지
- 최소 deprecation notice 기간
- mobile·third-party client compatibility 기준
- compatibility test와 changelog 위치

이 결정 전에는 breaking change를 암묵적으로 허용하지 않고 PR 단위에서 명시적으로 검토한다.
