# Development Log - 2026-04-22

프로젝트: Cubing Hub

---

## 오늘 작업

- `www.cubing-hub.com` 프런트와 `api.cubing-hub.com` 백엔드의 1차 수동 배포를 완료
- EC2 `Docker Compose` 기준 `Nginx + Spring Boot + Redis + RDS` 운영 구성을 실제 도메인으로 연결
- frontend build 시 `VITE_API_BASE_URL` 누락 문제를 확인하고 `https://api.cubing-hub.com` 기준으로 다시 빌드
- backend image의 `linux/amd64` manifest mismatch를 확인하고 Docker Hub 이미지를 재빌드/재푸시
- EC2 Nginx가 `options-ssl-nginx.conf`, `ssl-dhparams.pem` 누락으로 재시작하는 문제를 해결
- 최초 배포 플래그(`ddl-auto=update`, `rebuild-on-startup=true`) 적용 후 정상 기동을 확인하고 운영 안전값(`validate`, `false`)으로 원복
- apex(`https://cubing-hub.com`) origin의 CORS preflight가 `403`으로 차단되는 운영 설정 누락을 확인하고 `CORS_ALLOWED_ORIGINS` 기본값을 apex + www 동시 허용으로 보정
- `Backend CI`, `Frontend CI` 성공 뒤에 이어지는 분리 deploy workflow를 추가
- malformed `refresh_token`가 login/bootstrap 자체를 막는 운영 증상을 재현하고 `POST /api/session/clear-refresh-cookie` 기반 복구 흐름을 추가
- 홈 오늘의 스크램블을 `Asia/Seoul` 날짜 기준으로 고정하고, 랭킹/커뮤니티/댓글/마이페이지에 grouped 페이지네이션과 상단 안내 문구를 공통 적용
- 랭킹/커뮤니티 검색 debounce, 커뮤니티 반복 호출 루프 수정, 브라우저 자동 번역 오인 방지 설정으로 화면 안정성을 보강
- MyPage 요약을 `aggregate query`로 최적화하고 벤치마크/Grafana 자산을 추가
- 피드백 Discord 알림 상태/재시도 UX, 타이머 스크램블 이미지 미리보기, 마이페이지 기록 그래프와 `Ao5`, `Ao12` 통계를 추가
- 배포, 스크램블 정책, 페이지네이션, 벤치마크, Discord 운영, 기록 그래프 관련 문서를 같은 날짜 상태로 동기화

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
- RDS 연결과 Redis 시작 시 재구축까지 로그로 확인했다.

### 3. RDS schema 확인과 최초 배포 부팅

#### 문제 상황
- RDS 인스턴스 식별자와 실제 schema 이름이 다를 수 있어 `.env`의 `DB_NAME`을 확인할 필요가 있었다.
- prod는 기본 `ddl-auto=validate`라 비어 있는 schema에 바로 붙이면 실패할 수 있었다.

#### 해결 방법
- EC2에서 RDS MySQL에 직접 접속해 `SHOW DATABASES;`를 실행했다.
- 실제 schema 이름이 `cubinghub`임을 확인했다.
- 최초 배포에서는 `SPRING_JPA_HIBERNATE_DDL_AUTO=update`, `RANKING_REDIS_REBUILD_ON_STARTUP=true`로 기동했다.

#### 결과
- 앱이 RDS에 연결되고 Redis 준비 상태 키까지 생성했다.
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
- `curl -vk https://api.cubing-hub.com/actuator/health`에서 `HTTP/2 200`, `{\"status\":\"UP\"}`를 확인했다.

### 5. 배포 직후 운영 기본값과 자동 배포 경로까지 같이 닫음

#### 문제 상황
- `https://www.cubing-hub.com`에서는 API가 동작했지만 `https://cubing-hub.com`에서는 홈과 refresh 요청 preflight가 `403`으로 차단됐다.
- 1차 수동 배포는 열렸지만 이후 재배포를 계속 수동으로 반복하면 env 누락과 절차 실수가 다시 생길 수 있었다.

#### 해결 방법
- backend prod 기본값과 `docker-compose.prod.yml`의 `CORS_ALLOWED_ORIGINS` 기본값을 `https://cubing-hub.com`, `https://www.cubing-hub.com` 동시 허용으로 보정했다.
- CORS 통합 테스트도 두 origin이 모두 허용되도록 보강했다.
- `deploy-backend.yml`, `deploy-frontend.yml`를 추가하고 `workflow_run + workflow_dispatch`를 같이 두었다.
- backend deploy에는 Docker Hub 로그인, `linux/amd64` image build/push, EC2 `docker compose pull && up -d`, local health check를 묶었다.
- frontend deploy에는 build, S3 sync, CloudFront invalidation을 묶었다.

#### 결과
- 저장소 기준 운영 기본값이 apex + www 동시 허용과 일치하게 됐다.
- deploy workflow와 runbook이 같은 운영 경로를 설명하도록 정리됐다.
- 실제 자동 배포 성공 여부는 필요한 GitHub Secrets/Variables를 모두 등록한 뒤 확인해야 했다.

### 6. malformed `refresh_token` 복구와 반복 호출 원인을 운영 증상 기준으로 다시 정리

#### 문제 상황
- 비정상 `refresh_token` cookie가 `/api/auth` 경로에 남아 있으면 login이나 bootstrap refresh 자체가 브라우저/프록시 단계에서 잘리며 `Network Error`처럼 보일 수 있었다.
- 같은 시점에 일부 반복 호출과 커뮤니티 루프가 겹쳐 원인 분리가 더 어려웠다.

#### 해결 방법
- `/api/auth` 밖에서 bad cookie를 지울 수 있는 `POST /api/session/clear-refresh-cookie` endpoint를 추가했다.
- frontend는 bootstrap refresh 실패나 로그인 `Network Error`가 malformed/401 계열로 판단되면 이 endpoint를 best-effort로 호출하고 재로그인을 유도하도록 보강했다.
- 로컬 모니터링으로 반복 호출 원인을 다시 확인하고, 커뮤니티 페이지 반복 호출 루프를 별도 수정했다.

#### 결과
- bad cookie 때문에 인증 부트스트랩 전체가 막히는 증상을 recovery 가능한 흐름으로 바꿨다.
- auth recovery와 반복 호출 이슈를 한 문제로 뭉개지 않고 원인별로 분리할 수 있게 됐다.

### 7. 홈/목록 UX는 날짜 기준 스크램블, grouped pagination, debounce로 같이 정리

#### 구현
- `GET /api/home`의 오늘의 스크램블을 `Asia/Seoul` 날짜 기준으로 고정했다.
- 랭킹, 커뮤니티, 댓글, 마이페이지에 `1~10` 단위 grouped 페이지네이션과 상단 카피를 공통 적용했다.
- 랭킹과 커뮤니티 검색에 debounce를 넣어 입력 중 불필요한 요청을 줄였다.

#### 이유
- 홈 스크램블이 새로고침마다 바뀌면 같은 날 같은 기준 경험을 제공하기 어렵다.
- 페이지네이션과 검색 요청은 사용자가 가장 자주 체감하는 흐름이라, 운영 배포 직후에도 공통 UX 기준을 빨리 고정할 필요가 있었다.

#### 결과
- 홈, 랭킹, 커뮤니티, 댓글, 마이페이지의 탐색 경험이 같은 규칙을 공유하게 됐다.
- 검색 입력 중 요청 폭주와 페이지 이동 가독성 문제를 동시에 줄였다.

### 8. MyPage summary는 캐시보다 먼저 aggregate query로 내렸다

#### 문제 상황
- 마이페이지 요약은 로그인 직후 자주 호출되는데, 기존 구조는 사용자 전체 `records`를 읽어 Java 메모리에서 요약을 계산했다.
- 데이터가 커질수록 응답 시간과 메모리 비용이 같이 증가해 운영 기준으로 불리했다.

#### 해결 방법
- `count/min/avg aggregate query` 기반으로 summary 조회를 교체했다.
- `10 users x 10,000 records` 기준 벤치마크와 Grafana 자산을 함께 남겨 기준선과 개선 후 결과를 비교할 수 있게 했다.

#### 결과
- 같은 시나리오 기준 `avg 451.04 ms -> 77.86 ms`, `p95 790.68 ms -> 137.39 ms`, `70.62 req/s -> 407.21 req/s`를 확인했다.
- 캐시를 먼저 붙이지 않고도 summary hot path를 구조적으로 줄였다는 설명 근거를 확보했다.

### 9. 운영 UX와 시각 피드백도 같은 날 함께 정리했다

#### 구현
- 피드백 전송 후 Discord 알림 상태를 응답에 포함하고 실패 시 재시도 UX를 붙였다.
- 타이머 상단에 VisualCube 기반 스크램블 이미지 미리보기를 추가했다.
- 마이페이지에 기록 그래프와 `Ao5`, `Ao12` 통계를 표시했다.
- 브라우저 자동 번역이 큐빙 표기와 한국어 UI를 깨뜨리지 않도록 번역 오인 방지 설정을 넣었다.

#### 결과
- 운영 알림, 타이머 가시성, 기록 통계, 다국어 브라우저 환경까지 같은 날짜 안에서 사용자 체감 품질을 보강했다.
- 배포/인증/성능 최적화만이 아니라 실제 사용 흐름에서 보이는 마감 품질도 같이 끌어올렸다.

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
- Grafana
- Discord webhook

---

## 검증

- `docker compose --env-file .env -f docker-compose.prod.yml ps`
- `docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 app`
- `docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 nginx`
- `curl -vk https://api.cubing-hub.com/actuator/health`
- 브라우저에서 `www.cubing-hub.com`, `cubing-hub.com` 접근과 API 요청 확인
- EC2에서 RDS 접속 후 `SHOW DATABASES;`
- 관련 CORS, auth recovery, summary, feedback, graph, pagination 변경에 대한 backend/frontend 테스트와 문서 동기화 확인

## 남은 리스크

- 현재 배포는 여전히 일부 수동 절차 의존성이 있다.
- Docker Hub, AWS, EC2 SSH 관련 비밀값이 정리되지 않으면 자동 배포 workflow가 다시 막힐 수 있다.
- 인증서 갱신 자동화와 운영 Redis 재구축 정책은 아직 미확정이다.
