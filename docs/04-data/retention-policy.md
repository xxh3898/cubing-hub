---
doc_type: data
status: draft
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/07-operations/backup-restore.md
  - docs/07-operations/disaster-recovery.md
---
# Retention Policy

## 확정된 운영 backup 기준

정상으로 검증된 snapshot은 최신 3개를 보존한다. 새 snapshot 검증 전이나 backup 실패 시 이전 정상본과 retention 대상을 삭제하지 않는다.

정상 snapshot에는 SUCCESS marker, manifest, engine·version, record·file count와 필요한 checksum이 있어야 한다.

## 미확정 application data

다음 business data의 보존·삭제 기간은 아직 정책으로 확정되지 않았다.

- 탈퇴 또는 DELETED account
- solve와 PB history
- 게시글, 댓글, image
- feedback, 공개 Q&A, admin memo
- Discord notification error
- 향후 verified record evidence와 competition data

## 임시 Redis data

auth code, cooldown, refresh token, blacklist는 기능별 TTL을 갖는다. 구체 값은 configuration이 기준이며 policy 변경 시 security 영향과 함께 검토한다.

## 결정 기준

- 서비스 제공 목적과 사용자 기대
- 법적 의무와 개인정보 최소화
- 사용자의 export·삭제 권리
- 분쟁·감사에 필요한 기간
- backup에서 삭제가 전파되는 방식
- 복구 가능성과 영구 삭제의 차이

## Open Questions

- account 삭제가 soft delete인지 anonymization인지
- community·feedback 삭제와 audit 보존 범위
- backup에서 삭제된 data를 언제 제거할지
- future evidence의 지역·연령별 동의와 retention
