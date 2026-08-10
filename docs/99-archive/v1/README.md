---
doc_type: archive
status: deprecated
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/README.md
---

# V1 Archive

이 영역은 현재 Source of Truth가 아닌 V1 역사 자료다. 당시의 AWS, S3, Docker Hub, self-hosted runner, 일정, 성능 수치와 운영 가정은 현재 사실로 사용하지 않는다. 현재 문서는 [docs entrypoint](../../README.md)에서 시작한다.

## 보존 범위

- [Legacy 설계 문서](legacy-docs/)
- [Project schedule](schedules/project-schedule.md)
- [Development Logs 32일과 index](development-logs/README.md)
- [Troubleshooting](troubleshooting/)
- [과거 배포·migration 전환 기록](operations/)
- V1 화면 자산은 [assets/screenshots/v1](../../assets/screenshots/v1/)에 보존한다.

tracked repository에 portfolio 원본이 없어 별도 portfolio archive는 만들지 않았다. 과거 문서에 언급된 외부 PKM path는 provenance text로만 남긴다.

## Migration Ledger

| 기존 문서 | 분류 | 현재 처리 |
| --- | --- | --- |
| README.md | REWRITE | project entrypoint로 축소·재작성 |
| Project Overview.md | REWRITE + ARCHIVE | product·requirements·architecture로 분해, 원본 보존 |
| Screen Specification.md | REWRITE + ARCHIVE | user flow와 feature requirements로 분해 |
| System Architecture.md | REWRITE + ARCHIVE | 03-architecture로 분해 |
| Database Design.md | REWRITE + ARCHIVE | ERD, data dictionary, Redis model로 분해 |
| Authentication & Authorization Design.md | REWRITE + ARCHIVE | auth requirement와 auth-security로 분해 |
| Deployment & Infrastructure Design.md | REWRITE + ARCHIVE | deployment architecture와 operations gateway로 분해 |
| DEVELOPMENT-DEPLOYMENT-BACKUP.md | MERGE + ARCHIVE | active homeserver runbook과 07-operations에 통합 |
| API Specification.md | ARCHIVE | endpoint 표는 폐기, 정책은 05-api로 이관 |
| Feature Backlog.md | ARCHIVE | 현재 기능과 미래 candidate 문서의 근거로만 사용 |
| Project Schedule.md | ARCHIVE | 완료된 V1 일정 보존 |
| dev-log.md | MOVE | development-logs/README.md |
| Development Log/Day 01~32.md | MOVE | development-logs/day-01~32.md |
| Trouble Shooting 6개 | MERGE 또는 ARCHIVE | 현재 원칙은 active 문서에 이관하고 원문 보존 |
| performance/runbook.md | ARCHIVE | historical benchmark runbook 보존 |
| performance Markdown 4개 | MOVE | 06-quality/performance/benchmarks로 이동 |
| performance JSON·HTML 8개 | MOVE | raw benchmark evidence로 이동 |
| performance Grafana image 4개 | MOVE | assets/screenshots/performance로 이동 |
| images/readme 7개 | MOVE | assets/screenshots/v1로 이동 |
| homeserver current analysis·migration·Flyway·DNS 기록 4개 | MERGE + ARCHIVE | 현재 운영 원칙 이관, 당시 기록 보존 |
| homeserver active runbook 3개 | KEEP | exact path 유지, metadata와 중앙 link만 추가 |

논리적 DELETE는 없다. generated file과 binary asset에는 YAML frontmatter를 적용하지 않는다.

## 현재 문서로 승격한 역사 교훈

- malformed refresh cookie recovery → [Auth and Security](../../03-architecture/auth-security.md)
- UTC instant 계약 → [API Conventions](../../05-api/conventions.md)
- timer Space scroll → [Timer Requirements](../../02-requirements/features/timer.md)
- image upload 계약 불일치 → [Storage Architecture](../../03-architecture/storage-architecture.md)
- ranking benchmark → [Performance Evidence](../../06-quality/performance/)
- deployment·backup·rollback → [Operations](../../07-operations/)
