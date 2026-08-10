---
doc_type: requirement
status: active
created: 2026-08-10
updated: 2026-08-10
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/05-api/README.md
---
# User Flows

## 공개 탐색

- 홈에서 오늘의 3x3 scramble, 최근 게시글, 로그인 상태에 따른 개인 요약을 확인한다.
- timer, ranking, learning, community 목록·상세, 공개 Q&A를 탐색한다.
- 보호된 작업을 시도하면 login으로 이동한다.

## 가입과 계정 회복

1. 이메일 인증번호를 요청하고 확인한다.
2. 인증 완료 상태에서 가입한다.
3. login 후 access token과 refresh cookie로 session을 유지한다.
4. 비밀번호 분실 시 이메일 인증을 거쳐 재설정한다.
5. malformed refresh cookie가 login bootstrap을 막을 때 공개 recovery 경로로 cookie를 제거할 수 있다.

## Solve와 Ranking

1. event를 고르고 scramble을 생성한다.
2. keyboard 또는 touch timer로 시간을 측정한다.
3. 로그인 사용자는 penalty와 scramble을 포함해 solve를 저장한다.
4. 저장된 solve의 penalty를 바꾸거나 삭제할 수 있다.
5. MyPage에서 history·summary를 보고 ranking에서 event별 PB 순위를 확인한다.

## Community

1. 누구나 게시글 목록과 상세를 읽는다.
2. 로그인 사용자는 글을 작성하고 선택적으로 image를 첨부한다.
3. 작성자는 자신의 글을 수정·삭제한다.
4. 로그인 사용자는 댓글을 작성하고 자신의 댓글을 삭제한다.

## Feedback와 운영

1. 로그인 사용자가 feedback을 제출한다.
2. 공개 처리된 답변은 Q&A 목록·상세에서 볼 수 있다.
3. ADMIN은 feedback 답변·공개 여부와 내부 memo를 관리한다.

화면 route는 [frontend architecture](../03-architecture/frontend-architecture.md), endpoint 계약은 generated [Spring REST Docs](../05-api/README.md)가 기준이다.
