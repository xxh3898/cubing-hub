# Development Log - 2026-03-30

프로젝트: Cubing Hub

---

## 오늘 작업

- 인증(Auth) 도메인 핵심 기능 및 보안 아키텍처 완성
- Redis 기반 블랙리스트 서비스 및 토큰 만료 기능 구현
- 전역 예외 처리(Global Exception Handler) 고도화 및 공통 응답 구조 마련
- REST Docs 자동화 복구 및 Gradle 순환 참조 이슈 최종 해결

---

## 구현 기능

- **JWT 보안 아키텍처**: HttpOnly 쿠키 기반 인증 방식을 도입하여 보안성을 높이고 세션 관리를 최적화했습니다.
- **블랙리스트 기능**: Redis를 활용한 블랙리스트 검증을 적용하여 로그아웃된 토큰의 재사용을 차단했습니다.
- **REST Docs CI 해결**: `processResources` 태스크에서 `static/docs` 폴더를 제외함으로써 Gradle 8+ 환경의 순환 의존성 문제를 해결했습니다.
- **공통 에러 응답**: `GlobalExceptionHandler`를 통해 모든 예외 상황에 대한 일관된 JSON 응답 구조를 정의했습니다.

---

## 사용 기술

- Spring Security
- Spring Data Redis
- Spring REST Docs
- JUnit5 & MockMvc

---

## 코드

```gradle
// REST Docs 자동화 충돌 방지를 위한 설정
tasks.named('processResources') {
	exclude('static/docs/**')
}

// 빌드 시 항상 최신 문서를 소스 트리에 덮어씌움
tasks.named('build') {
	dependsOn copyDocument
}
```

---

## 문제

- **문제**: Gradle 8.x에서 REST Docs 생성 결과물을 소스 디렉토리(`src/main/resources`)로 복사할 때, 리소스 처리 태스크와의 순환 의존성으로 인해 CI 빌드가 실패하는 문제가 발생했습니다.
- **해결**: `processResources` 태스크에서 해당 문서를 처리 대상에서 제외(`exclude`)함으로써 기술적 제약 사항을 우회하고 자동화 기능을 유지했습니다.

---

## 다음 작업

- 사용 기록(Records) 도메인 설계 및 JPA 엔티티 매핑
- 마이페이지 정보 조회 및 수정 API 구현
- 사용자별 개인 최고 기록(PB) 자동 갱신 로직 구현