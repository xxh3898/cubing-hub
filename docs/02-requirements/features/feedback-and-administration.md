---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related: []
---
# Feedback and Administration

## 현재 사용자 가치

사용자는 service feedback이나 질문을 제출하고, 공개된 답변을 Q&A에서 확인한다. 운영자는 feedback과 내부 memo를 관리한다.

## 현재 동작

- 인증 사용자의 feedback 제출
- 공개 Q&A 목록·상세
- ADMIN의 feedback 목록·상세, 답변, 공개 여부 변경
- Discord 운영 알림 결과의 내부 추적
- ADMIN의 memo 생성·조회·수정·삭제

## 요구사항

- 일반 사용자 응답은 Discord 내부 전송 세부를 노출하지 않는다.
- 공개 Q&A에는 공개 승인된 내용만 나타나야 한다.
- 답변, visibility, memo 변경은 ADMIN만 수행한다.
- 내부 memo와 운영 오류 정보가 public API에 섞이지 않아야 한다.
- 알림 실패가 feedback 원본의 DB 보존 여부와 혼동되지 않아야 한다.

Admin memo 삭제 endpoint는 구현·integration test가 있으나 generated REST Docs에는 현재 누락돼 있다. 이 gap은 [API 안내](../../05-api/README.md)에서 추적한다.
