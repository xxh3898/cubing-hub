# Development Log - 2026-04-22

프로젝트: Cubing Hub

---

## 오늘 작업

- `www.cubing-hub.com` 프런트와 `api.cubing-hub.com` 백엔드의 1차 수동 배포를 완료
- EC2 `Docker Compose` 기준 `Nginx + Spring Boot + Redis + RDS` 운영 구성을 실제 도메인으로 연결
- frontend build 시 `VITE_API_BASE_URL` 누락 문제를 확인하고 `https://api.cubing-hub.com` 기준으로 다시 빌드
- backend image의 `linux/amd64` manifest mismatch를 확인하고 Docker Hub 이미지를 재빌드/재푸시
- EC2 Nginx가 `options-ssl-nginx.conf`, `ssl-dhparams.pem` 누락으로 재시작하는 문제를 해결
- first deploy 플래그(`ddl-auto=update`, `rebuild-on-startup=true`) 적용 후 정상 기동을 확인하고 운영 안전값(`validate`, `false`)으로 원복
- 배포 후 공식 문서와 운영 체크리스트 정리 범위를 확정
- `Backend CI`, `Frontend CI` 성공 뒤에 이어지는 분리 deploy workflow를 추가

---

## 핵심 정리 상세

### 1. 프런트 API 주소 주입 누락 해결

#### 문제 상황
- S3/CloudFront로 배포한 프런트가 `http://localhost:8080`을 기준으로 API를 호출했다.
- 브라우저에서는 `localhost:8080`으로 향하는 요청 때문에 CORS 오류와 `Network Error`가 발생했다.

#### 해결 방법
- `frontend`를 `VITE_API_BASE_URL=https://api.cubing-hub.com`로 다시 빌드했다.
- 새 빌드 산출물을 S3에 올리고 CloudFront invalidation으로 반영했다.

#### 결과
- 프런트는 더 이상 `localhost:8080`을 호출하지 않고 `api.cubing-hub.com`으로 API를 요청한다.
- 이후 문제는 프런트가 아니라 백엔드/Nginx 쪽으로 좁혀졌다.

### 2. backend image platform mismatch 해결

#### 문제 상황
- EC2에서 `docker compose pull` 시 `xxh3898/cubing-hub-backend:latest`를 `linux/amd64`로 가져오지 못했다.
- 에러는 `no matching manifest for linux/amd64`였다.

#### 해결 방법
- 로컬 맥에서 backend image를 Docker Hub에 다시 빌드/푸시했다.
- 결과 manifest list가 Docker Hub에 올라가 EC2에서 pull 가능한 상태로 맞췄다.

#### 결과
- `cubing_hub_app` 컨테이너가 EC2에서 정상 기동했다.
- RDS 연결과 Redis startup rebuild까지 로그로 확인했다.

### 3. RDS schema 확인과 first deploy 부팅

#### 문제 상황
- RDS 인스턴스 식별자와 실제 schema 이름이 다를 수 있어 `.env`의 `DB_NAME`을 확인할 필요가 있었다.
- prod는 기본 `ddl-auto=validate`라 비어 있는 schema에 바로 붙이면 실패할 수 있었다.

#### 해결 방법
- EC2에서 RDS MySQL에 직접 접속해 `SHOW DATABASES;`를 실행했다.
- 실제 schema 이름이 `cubinghub`임을 확인했다.
- first deploy에서는 `SPRING_JPA_HIBERNATE_DDL_AUTO=update`, `RANKING_REDIS_REBUILD_ON_STARTUP=true`로 기동했다.

#### 결과
- 앱이 RDS에 연결되고 Redis ready marker까지 생성했다.
- 정상 기동 확인 후 `.env`를 `validate`, `false`로 원복했다.

### 4. Nginx HTTPS 기동 문제 해결

#### 문제 상황
- `cubing_hub_nginx`가 계속 재시작했고 `443` 포트를 리슨하지 않았다.
- 로그에서 순서대로 아래 누락을 확인했다.
  - `/etc/letsencrypt/options-ssl-nginx.conf`
  - `/etc/letsencrypt/ssl-dhparams.pem`

#### 해결 방법
- host의 `/etc/letsencrypt` 아래에 `options-ssl-nginx.conf`를 생성했다.
- `openssl dhparam -dsaparam -out /etc/letsencrypt/ssl-dhparams.pem 2048`로 `ssl-dhparams.pem`을 생성했다.
- Nginx 컨테이너를 다시 기동했다.

#### 결과
- `cubing_hub_nginx`가 `Up` 상태가 되었고 `0.0.0.0:443` 포트가 열렸다.
- `curl -vk https://api.cubing-hub.com/actuator/health`에서 `HTTP/2 200`, `{"status":"UP"}`를 확인했다.

### 5. 배포 완료 후 남은 후속 작업

- 배포 완료 직후 기준 남은 핵심 작업은 backend/frontend 자동 배포 workflow 추가였다.

#### 정리 방향

- 자동 배포 workflow 구현

### 6. 자동 배포 workflow 추가

#### 결정
- backend와 frontend deploy를 한 workflow에 묶지 않고 분리했다.
- 자동 배포는 `workflow_run`으로 기존 `Backend CI`, `Frontend CI` 성공 뒤 이어지도록 하고, 필요할 때 수동 재실행할 수 있도록 `workflow_dispatch`도 같이 뒀다.

#### 구현
- `deploy-backend.yml`
  - backend build
  - Docker Hub 로그인
  - `linux/amd64` image build/push
  - EC2에 `docker-compose.prod.yml`, `nginx.conf` 동기화
  - EC2에서 `docker compose pull && up -d`
  - local health check
- `deploy-frontend.yml`
  - frontend build
  - S3 sync
  - CloudFront invalidation

#### 남은 조건
- GitHub `Secrets`
  - `DOCKERHUB_TOKEN`
  - `EC2_SSH_PRIVATE_KEY`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- GitHub `Variables`
  - `DOCKERHUB_USERNAME`
  - `BACKEND_IMAGE`
  - `EC2_HOST`
  - `EC2_USER`
  - `AWS_REGION`
  - `S3_BUCKET`
  - `CLOUDFRONT_DISTRIBUTION_ID`
  - `VITE_API_BASE_URL`
- 실제 자동 배포 성공 여부는 이 값들을 연결한 뒤 확인해야 한다.

---

## 사용 기술

- AWS EC2
- AWS RDS
- AWS S3
- AWS CloudFront
- Docker
- Docker Compose
- Nginx
- Let's Encrypt / Certbot
- Spring Boot
- Redis

---

## 검증

- `docker compose --env-file .env -f docker-compose.prod.yml ps`
- `docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 app`
- `docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 nginx`
- `curl -vk https://api.cubing-hub.com/actuator/health`
- 브라우저에서 `www.cubing-hub.com` 접근과 API 요청 확인
- EC2에서 RDS 접속 후 `SHOW DATABASES;`

## 남은 리스크

- 현재 배포는 수동 절차 의존성이 크다.
- Docker Hub, AWS, EC2 SSH 관련 비밀값이 정리되지 않으면 자동 배포 workflow 구현 시 다시 막힐 수 있다.
- 인증서 갱신 자동화와 운영 Redis 재구축 정책은 아직 미확정이다.
