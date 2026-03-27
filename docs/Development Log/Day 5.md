# Development Log - 2026-03-27

프로젝트: Cubing Hub

---

## 오늘 작업

- JPA 도메인 엔티티 설계 및 구현 (User, Record, Post, UserPB, Comment)
- 스키마 명칭 표준화 (FK, IDX, UK 명시적 이름 부여)
- WCA 공식 종목 관리를 위한 `EventType` Enum 구현 및 적용
- JPA Auditing 설정을 통한 공통 필드(`createdAt`, `updatedAt`) 자동화

---

## 구현 기능

- **스키마 표준화**: `fk_`, `idx_`, `uk_` 접두사를 사용한 직관적인 제약조건 명명 규칙 적용
- **WCA 호환성**: API 연동용 `wcaId`를 포함한 종목 관리 체계 구축 및 데이터 오염 방지(`EnumType.STRING`)
- **데이터 검증**: 엔티티 레벨 유효성 검증(`jakarta.validation`) 및 통합 테스트(`EntityMappingTest`) 통과

---

## 사용 기술

- Spring Data JPA, Hibernate, Jakarta Validation
- JUnit 5, Testcontainers (MySQL 8.0), Lombok

---

## 코드

```java
@Entity
@Getter
@Table(name = "records", indexes = {
        @Index(name = "idx_record_event_time", columnList = "event_type, time_ms"),
        @Index(name = "idx_record_user_id", columnList = "user_id")
})
public class Record extends BaseTimeEntity {
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 20)
    private EventType eventType;
    // ...
}
```

---

## 문제

- **제약조건 충돌**: 스키마 명칭 변경 후 기존 도커 볼륨(`mysql_data`)의 레거시 데이터와 충돌 발생 -> `docker compose down -v`로 초기화 후 해결
- **DDL 오류**: JPA `@Index` 설정 시 필드명을 사용하여 발생한 문법 에러 -> 실제 DB 컬럼명(snake_case)으로 수정하여 해결

---

## 다음 작업

- Spring Security 보안 필터 체인 및 JWT 유틸리티 구현
- 회원가입/로그인 비즈니스 로직 및 API 개발