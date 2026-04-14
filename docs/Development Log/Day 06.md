# Development Log - 2026-03-28

프로젝트: Cubing Hub

---

## 오늘 작업

- JWT 기반 보안 및 인증 인프라 전면 구축
- Redis를 활용한 Refresh Token 관리 로직 구현 및 TTL 설정
- Stateless 인증 필터 최적화 (불필요한 DB 조회 제거)
- Spring Boot 3.4.1 및 Spring Security 6.4 통합 및 예외 처리 강화

---

## 구현 기능

- **JwtTokenProvider**: Access/Refresh 토큰 발급 및 파싱, JJWT 0.12.6 기반의 서명 검증 로직
- **JwtAuthenticationFilter**: Stateless 방식의 인증 구현으로 매 요청마다 토큰 클레임에서 UserDetails 생성
- **RefreshTokenService**: Redis(`StringRedisTemplate`)를 사용한 토큰 저장 및 유효성 검증
- **SecurityConfig**: `/api/auth/**` 및 `/error` 경로 설정, 401 Unauthorized 커스텀 응답 처리

---

## 사용 기술

- Spring Boot 3.4.1 (Spring Security 6.4)
- JJWT 0.12.6
- Spring Data Redis
- Testcontainers (MySQL, Redis)

---

## 코드

```java
// JwtAuthenticationFilter.java - Stateless 인증 로직
@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
    String token = resolveToken(request);

    if (token != null && jwtTokenProvider.validateToken(token)) {
        // 토큰 내 Claims에서 직접 정보를 추출하여 DB 조회 없이 Authentication 객체 생성 (성능 최적화)
        Authentication authentication = jwtTokenProvider.getAuthentication(token);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    filterChain.doFilter(request, response);
}
```

---

## 문제

- **SignatureException 미처리**: 위변조된 토큰 유입 시 서버 에러 로그가 남는 문제를 `validateToken` 내 예외 처리 강화로 해결
- **성능 오버헤드**: 필터에서 매번 `CustomUserDetailsService`를 통해 DB를 조회하던 무상태성 위반 로직을 토큰 클레임 활용 방식으로 리팩토링하여 최적화
- **404 에러 시 필터 블로킹**: 존재하지 않는 경로 접근 시 `/error`로 리다이렉트되는데, 이때 인증 필터가 동작하여 결과를 가리는 문제를 `permitAll` 설정으로 해결

---

## 다음 작업

- 회원가입/로그인 API 구현 (`/api/auth/signup`, `/api/auth/login`)
- 토큰 재발급 API 기능 완성
- Spring Rest Docs를 활용한 인증 API 명세서 작성