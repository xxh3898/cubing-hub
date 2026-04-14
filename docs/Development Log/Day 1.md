# Development Log - 2026-03-23

프로젝트: Cubing Hub

---

## 오늘 작업

- Spring Boot 3.5.12 프로젝트 초기화 및 기본 환경 설정
- 도커 기반 인프라 구축 (MySQL 8.0, Redis 7.2)
- 스프링 인프라 설정 (Security, QueryDSL, Redis)
- Git 전략 수립 및 커밋 컨벤션 적용

---

## 구현 기능

- **프로필 분리**: `local`, `prod`, `test` 환경별 설정 파일 분리 및 환경 변수 주입 구조 설계
- **도커 설정**: `docker-compose.yml`을 통한 로컬 개발용 DB 및 캐시 서버 구축
- **보안 설정**: `SecurityConfig` (CORS, CSRF 비활성화, Stateless 세션) 구축
- **기타 인프라**: `QuerydslConfig`, `RedisConfig` 설정 완료

---

## 사용 기술

- Java 17, Spring Boot 3.5.12
- MySQL 8.0, Redis 7.2, Docker
- QueryDSL, Spring Security, JWT

---

## 코드

```yaml
# docker-compose.yml 일부
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${LOCAL_DB_PASSWORD}
      MYSQL_DATABASE: cubing_hub
```

---

## 문제

- **Git Merge Strategy**: 머지 후 그래프가 일직선으로 나타나는 현상에 대해 질의. (Fast-forward 머지 방식에 따른 정상 동작임을 확인 및 `--no-ff` 옵션 학습)

---

## 다음 작업

- Day 2: Testcontainers 기반 통합 테스트 환경 구축 및 `BaseIntegrationTest` 클래스 작성
