---
doc_type: domain
status: draft
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/01-domain/solve-model.md
  - docs/02-requirements/features/verified-record.md
---
# Record Verification

## 현재 상태

현재 저장되는 Record는 사용자가 직접 측정·입력한 solve이며 검증 완료를 의미하지 않는다. 별도 evidence, reviewer, verification status, appeal 절차는 구현돼 있지 않다.

## 용어 경계

- self-reported record: 현재 Cubing Hub 기록
- verified record: 미래 정책에 따라 증거와 review를 통과한 기록 후보
- WCA official result: WCA가 공식 대회 규정으로 관리하는 외부 결과

Verified Record가 도입되더라도 WCA official result라는 표현을 사용해서는 안 된다.

## 가설

검증은 community 신뢰, 비공식 challenge, online competition에 가치를 줄 수 있다. 그러나 video 보관, 개인정보, 부정행위 판단, 이의제기와 운영 부담이 발생한다.

## 결정 전 필요한 정책

- 어떤 기록과 event를 검증 대상으로 할지
- 허용 evidence와 촬영 요건
- 자동 검사와 사람 review의 경계
- reviewer 권한, 이해상충, audit log
- 반려 사유, 재제출, 이의제기
- evidence retention, 다운로드, 삭제
- 미성년자와 개인정보 보호
- WCA 규정 참조 범위와 독자 규칙 표시

## 비목표

이 문서에서는 DB table, endpoint, moderation architecture, 출시 일정을 설계하지 않는다.
