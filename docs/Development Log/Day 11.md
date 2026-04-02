# Development Log - 2026-04-02

프로젝트: Cubing Hub

---

## 오늘 작업

- 게시판 CRUD API(`POST`, `GET`, `PUT`, `DELETE /api/posts`) 구현
- QueryDSL 기반 게시글 목록 검색(`keyword`, `author`) 및 공개 조회 정책 반영
- 게시판 API 통합 테스트 및 Spring REST Docs 문서화 추가

---

## 구현 기능

- **게시판 CRUD API**: 게시글 생성, 목록 조회, 상세 조회, 수정, 삭제 API를 구현했습니다.
- **QueryDSL 검색 로직**: `keyword`로 제목/본문, `author`로 작성자 닉네임을 검색할 수 있는 동적 조회 로직을 추가했습니다.
- **권한 제어**: 게시글 수정과 삭제는 작성자 본인 또는 `ROLE_ADMIN`만 가능하도록 서비스 계층에서 권한 검사를 적용했습니다.
- **공개 조회 및 조회수 증가**: `GET /api/posts`, `GET /api/posts/{id}`를 공개 API로 열고, 상세 조회 시 `viewCount`가 증가하도록 구현했습니다.
- **통합 테스트 및 문서화**: 게시판 API 동작을 검증하는 통합 테스트를 추가하고 `post/*` 스니펫을 REST Docs에 연결했습니다.

---

## 사용 기술

- Java 17, Spring Boot 3.x
- Spring Data JPA, QueryDSL
- Spring Security
- Spring REST Docs
- JUnit 5, MockMvc

---

## 코드

```java
private void validateOwnershipOrAdmin(Post post, User currentUser) {
    if (currentUser.getRole() == UserRole.ROLE_ADMIN) {
        return;
    }

    if (!post.getUser().getId().equals(currentUser.getId())) {
        throw new CustomApiException("게시글 수정/삭제 권한이 없습니다.", HttpStatus.FORBIDDEN);
    }
}
```

---

## 문제

- **문제**: 게시글 목록과 상세 조회는 공개로 제공해야 했지만, 수정과 삭제는 작성자 본인 또는 관리자만 허용해야 해서 동일 리소스에 대해 공개 조회와 보호된 쓰기 권한을 함께 만족시키는 보안 정책 정리가 필요했음
- **해결**: `SecurityConfig`에서 `GET /api/posts`, `GET /api/posts/{id}`만 `permitAll`로 열고, 수정/삭제는 인증을 유지한 뒤 서비스 계층에서 작성자 또는 `ROLE_ADMIN` 여부를 추가로 검사하도록 분리함

---

## 다음 작업

- 프론트엔드에서 게시판 목록/상세/작성 페이지 연동
- 댓글 API 및 게시글-댓글 연계 기능 확장
- 이후 부하 테스트와 Redis 기반 최적화 작업 준비
