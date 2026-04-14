# Development Log - 2026-03-24

프로젝트: Cubing Hub

---

## 오늘 작업

- Testcontainers를 활용한 통합 테스트 환경 구축
- 모든 통합 테스트의 기반이 되는 `BaseIntegrationTest` 클래스 설계
- MySQL 및 Redis 컨테이너 연동 상태를 확인하는 `InfrastructureConnectivityTest` 작성 및 검증
- 손상된 Gradle Wrapper 복구 및 버전 최적화 (8.14.4)

---

## 구현 기능

- **Testcontainers 연동**: `@ServiceConnection`을 사용하여 테스트 실행 시 MySQL(8.0) 및 Redis(7.2) 컨테이너 자동 구동 및 연결 정보를 스프링 컨텍스트에 주입
- **통합 테스트 베이스 클래스**: `@SpringBootTest`와 `@Transactional`을 포함한 `BaseIntegrationTest`를 통해 테스트 코드 중복 제거 및 데이터 격리 보장
- **인프라 연결 검증**: `JdbcTemplate`과 `RedisTemplate`을 사용하여 실제 컨테이너와의 데이터 입출력 성공 확인

---

## 사용 기술

- Java 17, Spring Boot 3.5.12
- Testcontainers (MySQL, Redis)
- JUnit 5, AssertJ
- Gradle 8.14.4

---

## 코드

```java
// TestcontainersConfiguration.java 핵심 설정
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {
    @Bean
    @ServiceConnection
    MySQLContainer<?> mysqlContainer() {
        return new MySQLContainer<>(DockerImageName.parse("mysql:8.0"));
    }

    @Bean
    @ServiceConnection
    RedisContainer redisContainer() {
        return new RedisContainer(DockerImageName.parse("redis:7.2"));
    }
}
```

---

## 문제

- **Gradle Wrapper Corruption**: `gradle-wrapper.jar`가 손상되어 빌드가 불가능했으나, 시스템 Gradle을 설치해 `gradle wrapper` 명령으로 재생성하여 해결.
- **Redis Connection Details**: `GenericContainer` 사용 시 스프링 부트가 연결 정보를 자동으로 인식하지 못하는 `ConnectionDetailsNotFoundException` 발생. 전용 라이브러리의 `RedisContainer`로 교체하여 해결.

---

## 다음 작업

- Day 3: Spring Rest Docs 설정 및 API 문서화 기능 구현
- GitHub Actions CI 워크플로우 구축 (테스트 자동화)
