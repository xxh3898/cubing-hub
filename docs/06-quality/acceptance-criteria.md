---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-16
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/00-product/prd.md
  - docs/02-requirements/non-functional-requirements.md
  - docs/02-requirements/features/timer.md
  - docs/06-quality/test-strategy.md
  - docs/06-quality/v2-2-growth-release-evidence.md
---
# Acceptance Criteria

## 공통

- 요구한 사용자 흐름의 normal·failure 상태가 구분된다.
- validation, authentication, authorization, ownership이 server에서 검증된다.
- public contract가 바뀌면 REST Docs test와 consumer를 갱신한다.
- schema·storage 변경은 data migration과 rollback 한계를 설명한다.
- secret, debug bypass, dead code, 중복 Source of Truth가 남지 않는다.

## Auth

- 유효 login, 잘못된 credential, refresh rotation, token reuse, logout을 검증한다.
- access token은 persistent browser storage에 남지 않는다.
- cookie path·Secure·SameSite와 recovery 경로를 검증한다.

## Solve와 Ranking

- NONE, PLUS_TWO, DNF와 PB 재계산을 검증한다.
- 저장·penalty 변경·삭제 뒤 MySQL과 Redis 결과가 일치한다.
- Redis 미준비와 nickname 검색은 MySQL fallback을 사용한다.
- tie-break와 pagination에서 누락·중복이 없다.

## V2.1 Timer / Record Foundation

- `performance.now()` elapsed는 stop에서 한 번 integer millisecond로 정규화된다.
- 정지 이후 화면, create payload, Record raw time이 같은 canonical value다.
- Keyboard와 Touch가 같은 Timer Core를 사용하며 Input Method를 구분한다.
- legacy 또는 미지정 Input Method는 UNKNOWN 의미를 안전하게 유지한다.
- unknown Input Method wire value를 UNKNOWN으로 silently downgrade하지 않고 400으로 거절한다.
- Input Method를 Verification Level로 해석하지 않는다.
- Updated Timer는 stop에서 UUID v4 clientSubmissionId를 한 번 만들고 retry에서 유지한다.
- 같은 user·identity·payload replay는 같은 201 canonical Record를 반환하고 duplicate Record를 만들지 않는다.
- 같은 user·identity·다른 payload는 409이며 concurrent duplicate는 DB unique constraint로 방어한다.
- 최초 normalized payload fingerprint는 이후 penalty PATCH와 무관하게 conflict 판정에 사용된다.
- single pending authenticated solve는 credential을 저장하지 않고 같은 userId 범위에서만 복구된다.
- pending reload는 자동 submit하지 않고 retry·discard를 제공하며 이미 저장된 solve는 idempotent replay 뒤 정리된다.
- create response는 server-authoritative Record 표현을 제공하면서 기존 consumer와 additive compatibility를 유지한다.
- DNF create response의 effectiveTimeMs는 null이고 createdAt은 server 값이다.
- WCA_333만 V2.1 Practice Timer·Scramble·Record·Ranking을 지원하며 다른 known EventType은 400이다.
- event-filtered history와 `created_at DESC, id DESC` tie-break pagination이 정확한 최근 Record를 반환한다.
- rolling Ao5/Ao12가 PLUS_TWO, DNF 1개, DNF 2개 이상, best/worst 제거 규칙과 일치한다.
- idempotent create 뒤 PB, `user_pbs`, Redis Ranking이 한 번만 갱신된다.
- Event Result Kind와 Practice Timer·Scramble·Ranking capability가 구분된다.

## Migration Compatibility

- 이미 적용된 migration 파일을 수정하지 않는다.
- 실제 기존 schema에 신규 forward-only migration을 적용한다.
- 대표 기존 row, PB FK와 legacy nullable value를 보존한다.
- input_method, client submission identity·payload hash column과 named index를 검증한다.
- 이전 application과 새 application의 expand-and-contract compatibility를 검토한다.
- clean `create-drop` schema 성공만으로 migration upgrade를 완료했다고 판단하지 않는다.
- migration이 application rollback으로 자동 복구되지 않음을 명시한다.

## V2.2 Growth & Profile

- Growth summary, trend와 PB progression은 authenticated owner에게만 제공한다.
- public Growth capability는 WCA_333만 지원하며 known unsupported event는 400으로 거절한다.
- `NONE`, `PLUS_TWO`, `DNF`, numeric, insufficient와 DNF-only state를 구분한다.
- 30-day activity와 completed 7-day comparison은 Asia/Seoul calendar boundary와 `todayPartial` 의미를 유지한다.
- current PB는 current retained Record에서 재구성한 PB progression의 newest point와 일치한다.
- Growth response는 bounded aggregate와 minimal PB milestone만 제공하고 scramble, provenance와 raw full Record history를 노출하지 않는다.
- Record History는 1-based server pagination과 page size 10을 사용하며 Growth 계산을 위해 bulk fetch하지 않는다.
- MyPage와 Home은 legacy all-event/all-time arithmetic mean을 Growth metric으로 사용하지 않는다.
- penalty 변경과 delete 뒤 Growth summary, trend, PB progression과 current Record History가 갱신되며 Profile을 불필요하게 refetch하지 않는다.
- trend, Activity와 PB chart의 핵심 정보는 접근 가능한 text alternative로도 제공한다.
- release 전 isolated runtime smoke, browser interaction과 mobile layout evidence를 [V2.2 Growth Release Evidence](v2-2-growth-release-evidence.md)에 기록한다.
- V2.2 Growth는 새 Flyway migration, Redis model 또는 snapshot table을 추가하지 않는다.

## Community와 Upload

- JSON·multipart create와 update, 유지·삭제 image를 검증한다.
- type·size·count, 소유권, not-found를 검증한다.
- DB object_key와 실제 file lifecycle을 확인한다.

## Deployment와 Backup

- exact SHA와 configuration digest 검증, one-shot migration, public smoke를 통과한다.
- 실패 시 이전 verified pair 복구가 가능하다.
- MySQL dump와 image snapshot, manifest, record·file 정합성을 확인한다.
- migration이 자동 rollback되지 않음을 명시한다.

기능별 세부 기준은 [Requirements](../02-requirements/)와 함께 읽는다.
