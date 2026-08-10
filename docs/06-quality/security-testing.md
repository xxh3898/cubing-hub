---
doc_type: quality
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/auth-security.md
  - docs/06-quality/acceptance-criteria.md
---
# Security Testing

## Authentication

- login credential 실패가 account 존재 여부를 과도하게 노출하지 않는지
- access·refresh JWT 유효성, 만료, type, signature
- refresh Redis 일치와 rotation
- 재사용 의심 시 refresh family 제거
- logout blacklist와 cookie 만료
- concurrent 401에서 refresh storm 방지
- malformed cookie recovery가 다른 mutation을 수행하지 않는지

## Authorization

- public, authenticated, ADMIN endpoint matrix
- 다른 사용자의 record, post, comment 변경 거부
- ADMIN feedback·memo operation의 role 검증
- frontend route guard 우회에도 server가 거부하는지

## Input과 Output

- DTO boundary, page·size, nickname 검색 길이
- upload MIME, 확장자, size, count, object key path
- error에서 token, password, filesystem, webhook 정보 비노출
- stored content의 rendering과 XSS 위험

## Infrastructure

- database와 Redis port 비공개
- API·Web read-only filesystem과 no-new-privileges
- Web만 edge network 연결, API outbound 분리
- forced-command SSH allowlist
- immutable image·runtime config artifact

## 비자동 검증

실제 secret rotation, Cloudflare policy, public TLS, operational account 권한은 repository test만으로 완전히 증명할 수 없다. production 점검은 별도 운영 승인과 최소 read-only 범위에서 수행한다.
