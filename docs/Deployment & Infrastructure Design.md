# Deployment & Infrastructure Design

## 1. 배포 개요

- 목표는 Frontend와 Backend를 역할에 맞게 분리 배포하는 것이다.
- Frontend는 `S3 + CloudFront`, Backend는 `EC2 + Docker Compose`, 영속 데이터는 `RDS`를 기준으로 둔다.
- Local, Test, Production을 같은 구조로 복제하지 않고, 목적에 맞는 격리 수준으로 나눈다.

## 2. 인프라 구성

| 영역 | 구성 | 목적 |
| --- | --- | --- |
| Frontend | AWS S3, AWS CloudFront | 정적 자산 호스팅 및 CDN 배포 |
| Backend | AWS EC2, Docker Compose, Spring Boot, Redis, Prometheus, Grafana | API 실행, 토큰/캐시 처리, 운영 메트릭 관찰 |
| Data | AWS RDS (MySQL) | 영속 데이터 저장 |
| Delivery | GitHub Actions, Docker Hub | CI/CD 자동화 |

## 3. 서버 구성

### Local

- `docker-compose.yml`
  - `mysql`
  - `redis`
  - `prometheus`
  - `grafana`
- Spring Boot와 Vite는 로컬 프로세스로 실행한다.
- 목적
  - 기능 개발
  - API 연동 확인
  - 모니터링 환경 로컬 재현

### Test

- Testcontainers 기반 MySQL / Redis
- GitHub Actions에서 `./gradlew test`
- REST Docs 검증을 위한 `./gradlew build -x test`
- 목적
  - 실제 DB/Redis와 가까운 통합 테스트
  - 문서화 자동화 검증

### Production (목표)

- Frontend
  - S3 정적 호스팅
  - CloudFront CDN
- Backend
  - EC2 내부 Docker Compose
  - Spring Boot API
  - Redis
  - Prometheus
  - Grafana
- Data
  - RDS MySQL

## 4. 환경 변수 / 비밀값 관리

### Local

- root `.env.example`를 복사해 root `.env`를 만든 뒤 local 실행에 필요한 값을 채운다.
- 현재 local 실행에서 직접 사용하는 값:
  - `LOCAL_DB_PASSWORD`
  - `LOCAL_JWT_SECRET`
  - `LOCAL_GRAFANA_ADMIN_PASSWORD`
- `docker compose up -d`
  - `LOCAL_DB_PASSWORD`, `LOCAL_GRAFANA_ADMIN_PASSWORD`를 사용한다.
- `cd backend && ./gradlew bootRun`
  - `application-local.yaml`이 root `.env`의 property 형식 값을 읽어 `LOCAL_DB_PASSWORD`, `LOCAL_JWT_SECRET`를 사용한다.
- 실제 값 파일은 Git 추적 대상에 포함하지 않는다.

### Backend Production

`application-prod.yaml` 기준:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `cors.allowed-origins`
  - 실제 프런트엔드 도메인 주소로 변경 필요
- `jwt.expiration`
  - 프로덕션 Access Token 만료 시간
- `jwt.refresh-expiration`
  - 프로덕션 Refresh Token 만료 시간 (`JWT_REFRESH_EXPIRATION`, 기본 7일)

### Frontend

- `VITE_API_BASE_URL`
  - 미설정 시 `http://localhost:8080`

### 보안 원칙

- 비밀값은 코드에 하드코딩하지 않는다.
- 프로덕션용 민감 정보는 환경 변수나 승인된 배포 설정에서 주입한다.
- local 개발용 값도 추적 파일에 직접 넣지 않고 `.env` 같은 비추적 파일로 분리한다.
- 로컬 개발 편의 설정은 프로덕션 보안 정책으로 그대로 승격하지 않는다.

## 5. CI/CD 파이프라인

### 현재 구현 상태

1. GitHub Push
2. GitHub Actions 실행
3. `./gradlew test --no-daemon` 수행
4. `./gradlew build -x test --no-daemon` 수행
5. 실패 시 테스트 리포트 업로드

### 목표 흐름

1. GitHub Push
2. GitHub Actions 테스트 통과
3. Docker 이미지 빌드 및 Docker Hub 푸시
4. EC2에서 최신 이미지 Pull
5. 컨테이너 재시작으로 CD 수행
6. Nginx + Let's Encrypt(Certbot)로 HTTPS 적용

## 6. 도메인 / 네트워크

- Frontend
  - CloudFront가 공개 진입점을 담당한다.
  - OAC를 사용해 S3 직접 접근을 차단하는 구성을 목표로 한다.
- Backend
  - Nginx가 외부 진입을 처리한다.
  - EC2와 RDS는 보안 그룹으로 접근 범위를 제한한다.
- 데이터 저장소
  - RDS는 외부 직접 접근을 허용하지 않고 애플리케이션 계층에서만 접근한다.

## 7. 운영 고려사항

- Spring Boot Actuator 메트릭 노출
- Prometheus 수집
- Grafana 시각화
- `k6` 부하 테스트 결과와 함께 병목 구간 분석
- AWS Billing Alarm 설정으로 과도한 비용 사용 방지

## 8. 핵심 배포 / 인프라 판단

### 설계 선택 1

- 선택한 방식:
  - Local / Test / Production을 서로 다른 목적에 맞는 구조로 분리한다.
- 선택 이유:
  - 개발 환경은 빠른 반복이 중요하고, 테스트 환경은 격리와 재현성이 중요하며, 프로덕션은 운영성과 보안이 중요하다.
- 검토한 대안:
  - 전 환경을 같은 Docker Compose 구조로 통일
- 대안을 배제한 이유:
  - 테스트의 격리성과 프로덕션의 실제 운영 제약을 충분히 설명하기 어렵다.
- 트레이드오프:
  - 환경별 설정 관리 포인트가 늘어난다.
- 기대 효과:
  - 각 단계에서 무엇을 검증하는지 명확해진다.

### 설계 선택 2

- 선택한 방식:
  - CI에서 Testcontainers 기반 테스트와 REST Docs 검증을 같이 수행한다.
- 선택 이유:
  - 단순 단위 테스트 통과보다 실제 인프라에 가까운 통합 테스트와 문서화 성공 여부를 함께 확인해야 한다.
- 검토한 대안:
  - 테스트와 문서화를 분리하거나, 문서화 검증을 생략
- 대안을 배제한 이유:
  - 구현과 문서가 쉽게 어긋날 수 있다.
  - 실제 DB/Redis 연동 문제가 뒤늦게 드러날 수 있다.
- 트레이드오프:
  - CI 시간이 길어질 수 있다.
  - Docker 의존성이 추가된다.
- 기대 효과:
  - API 계약과 테스트 신뢰성을 함께 유지할 수 있다.

### 설계 선택 3

- 선택한 방식:
  - 첫 프로덕션 단계는 단일 EC2 + Docker Compose를 기준으로 둔다.
- 선택 이유:
  - 현재 프로젝트 범위에서는 컨테이너 운영 구조를 설명하면서도 복잡도를 과도하게 높이지 않는 구성이 필요하다.
  - Redis는 영속 주 저장소가 아니라 토큰/캐시 용도라 내부 컨테이너 배치가 가능하다.
- 검토한 대안:
  - ECS/EKS 같은 고도화된 오케스트레이션
  - Redis까지 별도 관리형 서비스로 분리
- 대안을 배제한 이유:
  - 현재 규모와 목표 대비 운영 난도가 높아진다.
- 트레이드오프:
  - 단일 인스턴스라 장애 허용성과 확장성이 제한된다.
  - Redis와 모니터링 도구도 같은 인스턴스 자원을 공유한다.
- 기대 효과:
  - MVP 단계에서 설명 가능한 운영 구조를 빠르게 갖출 수 있다.

### 설계 선택 4

- 선택한 방식:
  - Route 53, HTTPS, OAC는 목표 단계로 두고 현재 저장소에는 준비 상태만 반영한다.
- 선택 이유:
  - 도메인, 인증서, CDN 접근제어는 실제 배포 단계에서 함께 검증해야 한다.
- 검토한 대안:
  - 문서에서 제외하거나 이미 완료된 것처럼 서술
- 대안을 배제한 이유:
  - 전자는 최종 운영 구조 설명이 약해지고, 후자는 현재 상태를 왜곡한다.
- 트레이드오프:
  - 문서에 예정 항목이 남아 보인다.
- 기대 효과:
  - 현재 상태와 목표 상태를 분리해 솔직하게 설명할 수 있다.

## 9. 장애 대응 초안

| 상황 | 1차 대응 | 후속 대응 |
| --- | --- | --- |
| Spring Boot 컨테이너 장애 | 컨테이너 재시작 및 로그 확인 | 이미지/설정 롤백 검토 |
| Redis 장애 | 토큰/캐시 영향 범위 확인 | Redis 배치 전략 또는 영속화 옵션 재검토 |
| RDS 연결 실패 | DB 접속 정보와 네트워크 설정 점검 | 보안 그룹 / 애플리케이션 설정 재검토 |
| CloudFront / S3 정적 배포 문제 | 캐시 무효화 및 배포 산출물 재확인 | 배포 파이프라인 검토 |
| CI 실패 | 테스트 리포트 확인 | 테스트/문서 생성 단계 원인 분리 |

## 10. 배포 다이어그램

### 배포 구조도

```mermaid
flowchart LR
    Dev[Developer] --> GH[GitHub]
    GH --> GA[GitHub Actions]
    GA --> DH[Docker Hub]
    GA --> S3[S3 Static Hosting]
    DH --> EC2[EC2 Docker Compose]
    EC2 --> RDS[RDS MySQL]
    EC2 --> Redis[Redis]
    EC2 --> Prom[Prometheus]
    Prom --> Graf[Grafana]
    S3 --> CF[CloudFront]
    CF --> User[Client]
    EC2 --> User
```

## 11. 면접 / 포트폴리오 포인트

- 개발/테스트/운영 환경을 같은 구조로 뭉개지 않고 목적별로 분리했다는 점
- Testcontainers와 REST Docs를 CI에 묶어 신뢰성과 문서 일관성을 동시에 관리했다는 점
- MVP 단계에서는 단일 EC2 + Docker Compose로 시작하되, 한계와 후속 확장 방향을 함께 설명한다는 점

## 12. 미확정 사항

- Nginx 리버스 프록시 설정과 HTTPS 적용 순서
- Docker Hub 기반 CD 스크립트의 최종 자동화 방식
- Route 53, HTTPS, OAC 실제 반영 시점
