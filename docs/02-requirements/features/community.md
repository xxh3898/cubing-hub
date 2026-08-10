---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/03-architecture/storage-architecture.md
---
# Community

## 현재 사용자 가치

사용자는 공지·정보·경험을 게시글과 댓글로 공유하고 image를 첨부할 수 있다.

## 현재 동작

- 공개 게시글 목록, 검색, pagination, 상세
- 로그인 사용자의 JSON 또는 multipart 글 작성
- 작성자의 글 수정·삭제
- 다중 image 첨부·유지·삭제
- 로그인 사용자의 댓글 작성과 작성자 삭제
- 상세 조회수 기록

## 요구사항

- 글·댓글 수정 또는 삭제는 server에서 소유권을 확인한다.
- upload type, size, count를 검증하고 허용되지 않은 path를 만들지 않는다.
- post_attachments metadata와 실제 binary lifecycle이 일치해야 한다.
- 글 갱신 실패 시 기존 image를 불완전하게 잃지 않아야 한다.
- 삭제된 또는 존재하지 않는 글을 성공으로 표시하지 않는다.
- 공개 image URL은 Web의 read-only mount 계약과 일치해야 한다.

저장 경계는 [Storage Architecture](../../03-architecture/storage-architecture.md)를 따른다.
