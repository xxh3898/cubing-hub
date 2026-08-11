---
doc_type: domain
status: draft
created: 2026-08-10
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/solve-model.md
  - docs/02-requirements/features/verified-record.md
  - docs/08-decisions/adr-0006-practice-record-future-lifecycle-boundary.md
  - docs/08-decisions/adr-0007-canonical-timer-time-input-provenance.md
---
# Record Verification

## 현재 상태

현재 Cubing Hub Record는 completed Practice solve이며 검증 완료를 의미하지 않는다. 현재 public Timer의 실제 입력은 keyboard와 touch·pen이고, 별도 evidence, reviewer, verification status, audit, appeal 절차는 구현돼 있지 않다.

## 핵심 원칙

```text
Verified Record
=
Input
+
Evidence
+
Verification Process
```

Practice 여부, Input Method, Verification Level은 서로 다른 축이다.

- Keyboard나 Touch는 현재 Input Method다.
- Stackmat이나 Smart Timer에서 시간을 자동 수신해도 그 사실만으로 Verified가 되지 않는다.
- Smart Cube는 input, analysis, evidence 후보가 될 수 있지만 verification을 자동 보장하지 않는다.
- `records.verified BOOLEAN` 하나로 verification lifecycle을 표현하지 않는다.

## 용어 경계

- Practice Record: Input Method와 무관하게 완료된 Practice solve
- self-reported activity: 별도 verification process를 거치지 않은 현재 활동 수준
- verified record: future policy에 따라 evidence와 review를 통과한 기록 후보
- WCA Official Result: WCA가 공식 대회 규정과 시스템으로 관리하는 외부 결과

Verified Record가 도입되더라도 Cubing Hub 내부 결과를 WCA Official Result라고 표현하지 않는다.

## Future lifecycle 후보

Verification을 구현하게 되면 다음 책임을 별도 lifecycle로 검토한다.

```text
Attempt
Evidence
Verification Case
Review
Verification Status
Audit / Appeal
```

Practice Record와의 연결 방식, 승인 뒤 Profile·Ranking 반영 여부는 future policy에서 결정한다. V2.1은 위 schema나 endpoint를 만들지 않는다.

## 초기 PoC 가설

향후 사용자 검증을 통과한 뒤 다음 조합을 제한된 PoC 후보로 검토할 수 있다.

```text
server-issued scramble
+
physical timer
+
one-take video
+
manual review
```

이는 구현 계약이나 출시 범위가 아니다. device 지원, evidence format, 촬영 요건, 판정 규칙을 미리 확정하지 않는다.

## 가설과 비용

Verification은 community 신뢰, 비공식 challenge, online competition에 가치를 줄 수 있다. 반면 video 보관, 개인정보, 부정행위 판단, reviewer 운영, 이의제기와 법적·운영 부담이 발생한다.

Smart Cube telemetry를 evidence로 사용하려면 Practice data, improvement data, verification evidence의 목적과 retention을 분리해야 한다. 원본 move sequence, TPS, pause, video를 `records` 컬럼에 저장하지 않는다.

## 결정 전 필요한 정책

- 어떤 사용자 문제와 event를 검증 대상으로 할지
- 허용 evidence와 촬영 요건
- server-issued scramble과 attempt 시작·종료 규칙
- 자동 검사와 사람 review의 경계
- reviewer 권한, 이해상충, audit log
- 반려 사유, 재제출, 이의제기
- evidence retention, 다운로드, 삭제
- 미성년자와 개인정보 보호
- WCA 규정 참조 범위와 독자 규칙 표시

## 비목표

DB table, endpoint, moderation architecture, device protocol, 출시 일정을 확정하지 않는다.
