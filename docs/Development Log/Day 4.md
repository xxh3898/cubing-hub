# Development Log - 2026-03-26

프로젝트: Cubing Hub

---

## 오늘 작업

- Prometheus & Grafana 로컬 세팅 및 Spring Boot 연동

---

## 구현 기능

- Prometheus를 통한 Spring Boot Actuator 메트릭 수집 환경 구축
- Grafana를 활용한 시스템 지표 시각화 기반 마련
- Spring Boot Docker Compose Support 추가 (인프라 자동 관리)

---

## 사용 기술

- Spring Boot Actuator, Micrometer Prometheus Registry
- Docker Compose, Prometheus, Grafana
- Spring Boot Docker Compose Support

---

## 코드

### docker-compose.yml
```yaml
  prometheus:
    image: prom/prometheus:v2.54.1
    container_name: cubing_hub_prometheus
    volumes:
      - ./backend/src/main/resources/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:11.2.0
    container_name: cubing_hub_grafana
    ports: ["3000:3000"]
```

### build.gradle
```gradle
developmentOnly 'org.springframework.boot:spring-boot-docker-compose'
```

### application-local.yaml
```yaml
spring:
  docker:
    compose:
      file: ../docker-compose.yml
      working-directory: ..
      lifecycle-management: start-and-stop

management:
  endpoints:
    web:
      exposure:
        include: prometheus, health, info
```

---

## 문제

- **Docker Compose 파일 경로 인식**: Spring Boot가 기본 디렉토리(`backend/`)에서 `docker-compose.yml`을 찾지 못하는 문제 발생. -> `application-local.yaml`에서 `file: ../docker-compose.yml` 및 `working-directory: ..` 설정으로 해결.
- **YAML 계층 구조 오류**: `management` 및 `docker` 설정의 인덴트 문제로 Actuator 엔드포인트가 노출되지 않거나 Docker Compose 설정이 무시되는 현상 발생. -> YAML 구조를 최상위/Spring 하위로 재정렬하여 해결.

---

## 다음 작업

- User, Record, Post 엔티티(JPA) 클래스 작성 및 연관관계 매핑
