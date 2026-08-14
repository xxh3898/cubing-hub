---
doc_type: index
status: active
created: 2026-08-10
updated: 2026-08-11
owner: xxh3898
project: cubing-hub
tags: []
related:
  - backend/src/docs/asciidoc/index.adoc
  - docs/05-api/conventions.md
  - docs/05-api/compatibility-policy.md
---
# API Documentation

## Source of Truth

실제 endpoint의 method, path, request, response, cookie, header 계약은 backend REST Docs test와 [Asciidoc index](../../backend/src/docs/asciidoc/index.adoc)가 Source of Truth다.

이 디렉터리는 endpoint 전체를 수동으로 복제하지 않고 공통 설계 규칙과 compatibility 정책만 관리한다.

## 생성 흐름

1. backend test가 build/generated-snippets에 snippet을 만든다.
2. asciidoctor가 snippets와 index.adoc을 조합한다.
3. 결과는 backend/build/docs/asciidoc에 생성되고 bootJar의 static/docs에도 포함된다.
4. build는 copyDocument를 통해 local static docs 경로도 갱신한다.

정확한 task dependency는 [backend/build.gradle](../../backend/build.gradle)을 따른다.

## 현재 알려진 문서 gap

- 게시글 수정 preload snippet post/detail-edit는 test에 존재하며 index에 연결했다.
- DELETE /api/admin/memos/{memoId}는 controller와 integration test에 존재하지만 REST Docs test·snippet이 없다.
- admin memo delete 항목은 REST Docs contract가 없으므로 Known Gap으로 관리한다.

## 변경 규칙

- endpoint 계약 변경은 production code, REST Docs test, index를 같은 변경 단위에서 갱신한다.
- Markdown에 request·response 예시 전체를 복제하지 않는다.
- 공통 envelope, pagination, auth 원칙은 [Conventions](conventions.md)에 둔다.
- versioning과 deprecation 미확정 사항은 [Compatibility Policy](compatibility-policy.md)에 둔다.

과거 수동 API 표는 [V1 archive](../99-archive/v1/legacy-docs/api-specification.md)에 역사 자료로 보존한다.
