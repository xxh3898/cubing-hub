## Goal

<!-- 이 PR이 해결하는 문제와 완료 조건을 짧게 적는다. -->

## Changes

<!-- 핵심 변경사항만 적는다. 구현 세부 전체를 나열하지 않는다. -->

## Source of Truth

<!-- 관련 Requirement / Architecture / ADR / API docs를 적는다. 없으면 N/A와 이유를 적는다. -->

-

## Documentation Impact

<!-- 실제 상황에 맞는 항목만 하나 선택한다. -->

- [ ] 관련 Source of Truth / 운영 문서를 구현과 함께 갱신했다.
- [ ] 문서 변경이 필요하지 않으며 아래에 이유를 기록했다.

Documentation impact:

<!--
예:
- growth.md: Record mutation lifecycle 반영
- growth-architecture.md: pagination boundary 반영

또는:
N/A — test-only 변경이며 application contract 변화 없음.
-->

## API / Data

<!-- 각 그룹에서 실제 상황에 맞는 항목만 하나 선택하고 근거를 적는다. -->

### API Contract

- [ ] 변경 없음
- [ ] 변경 있음 — REST Docs와 consumer를 함께 갱신함

Evidence / details:

### Database / Flyway

- [ ] 변경 없음
- [ ] 변경 있음 — forward migration과 rollback 한계를 문서화함

Evidence / details:

### Redis / Runtime Configuration

- [ ] 변경 없음
- [ ] 변경 있음 — runtime/operations 영향을 문서화함

Evidence / details:

## Validation

<!-- 실제 수행한 검증만 체크한다. 실행하지 않은 항목은 Evidence에 이유를 적는다. -->

- [ ] Focused tests
- [ ] Relevant full test suite
- [ ] Build
- [ ] CI

Evidence:

```text
commands / test counts / workflow run
```

## Compatibility

<!-- 실제 상황에 맞는 항목만 하나 선택한다. -->

- [ ] 기존 consumer / stored data와 호환된다.
- [ ] 호환성 영향이 있으며 아래에 명시했다.

Compatibility impact:

## Operations

<!-- 실제 상황에 맞는 항목만 하나 선택한다. secret, credential, production data, migration, runtime config 영향은 반드시 적는다. -->

- [ ] production/runtime 영향 없음
- [ ] production/runtime 영향 있음 — deploy/rollback 경계를 아래에 기록함

Operational impact:

## Out of Scope

<!-- 의도적으로 이번 PR에서 하지 않는 것 -->

-

## Review Focus

<!-- reviewer가 특히 확인해야 할 correctness 또는 risk point -->

-

## Production Changes

<!-- production 영향이 있으면 아래 '없음'을 실제 내용으로 교체한다. -->

```text
없음
```
