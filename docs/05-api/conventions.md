---
doc_type: api
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/05-api/README.md
  - docs/03-architecture/auth-security.md
---
# API Conventions

## Response envelope

일반 JSON 응답은 status, message, data를 갖는 ApiResponse 구조를 사용한다. 실패 응답에서 data는 null이며 HTTP status와 body status가 일치해야 한다.

204 No Content처럼 body가 없는 endpoint는 generated REST Docs가 개별 계약의 기준이다.

## Authentication

- access token은 Authorization: Bearer header로 전달한다.
- refresh token은 HttpOnly cookie로 전달한다.
- browser credential과 CORS 설정은 허용 origin 경계를 지킨다.
- 인증, 권한 부족, 소유권 부족을 같은 성공 응답으로 숨기지 않는다.

## Validation과 error

- DTO validation과 domain validation 실패는 일관된 error envelope로 반환한다.
- 존재하지 않는 resource, 권한 부족, 인증 실패, conflict를 적절한 HTTP status로 구분한다.
- 내부 exception, secret, filesystem path, webhook 결과를 public message로 노출하지 않는다.

## Time

시간 응답은 UTC instant 의미를 유지한다. client가 표시 timezone으로 변환하며, legacy local time을 의미 확인 없이 일괄 보정하지 않는다.

## Pagination

현재 page는 1-based다. 응답은 page, size, totalElements, totalPages, hasNext, hasPrevious 같은 navigation 정보를 domain별 DTO로 제공한다. page size 상한은 endpoint validation과 REST Docs를 따른다.

## Multipart

community image request는 multipart boundary를 client가 설정하게 한다. JSON metadata part와 file part, type·size·count 제한은 generated 계약과 storage 요구사항을 따른다.

## Naming

- JSON field는 현재 DTO의 camelCase를 따른다.
- enum 값은 server enum 문자열을 사용한다.
- endpoint별 구체 field와 optional 여부는 Spring REST Docs만 복제 없이 관리한다.
