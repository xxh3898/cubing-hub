# AWS First Deploy And Redeploy Checklist

## 목적

- `cubing-hub`의 실제 1차 배포와 이후 재배포에서 반복된 시행착오를 줄이기 위한 운영 체크리스트다.
- 이 문서는 `www.cubing-hub.com` 프런트, `api.cubing-hub.com` 백엔드, `EC2 + Nginx + Spring Boot + Redis + RDS` 구조를 기준으로 한다.

## 1차 배포 체크리스트

### Frontend

- `VITE_API_BASE_URL=https://api.cubing-hub.com`를 주입해 빌드했는지 확인
- `frontend/dist`가 최신 빌드인지 확인
- S3 업로드 후 CloudFront invalidation을 수행했는지 확인
- 브라우저 개발자도구에서 API 요청이 `localhost:8080`이 아니라 `https://api.cubing-hub.com`으로 향하는지 확인

### Backend Image

- backend jar를 다시 빌드했는지 확인
- Docker Hub image를 `linux/amd64` 또는 multi-arch로 푸시했는지 확인
- EC2에서 `docker compose pull`이 manifest mismatch 없이 통과하는지 확인

### EC2 `.env`

- `BACKEND_IMAGE`, `BACKEND_IMAGE_TAG` 확인
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` 확인
- `DB_NAME`이 RDS 인스턴스 식별자가 아니라 실제 schema 이름인지 확인
- `JWT_SECRET`이 placeholder가 아닌 실제 값인지 확인
- 최초 배포 시점에는 아래 값을 사용
  - `SPRING_JPA_HIBERNATE_DDL_AUTO=update`

### HTTPS / Nginx

- `/etc/letsencrypt/live/api.cubing-hub.com/fullchain.pem` 확인
- `/etc/letsencrypt/live/api.cubing-hub.com/privkey.pem` 확인
- `/etc/letsencrypt/options-ssl-nginx.conf` 확인
- `/etc/letsencrypt/ssl-dhparams.pem` 확인
- EC2 보안 그룹에서 `80`, `443` 인바운드 허용 확인

### 기동 확인

- `docker compose --env-file .env -f docker-compose.prod.yml pull`
- `docker compose --env-file .env -f docker-compose.prod.yml up -d`
- `docker compose --env-file .env -f docker-compose.prod.yml ps`
- `docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 app`
- `docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200 nginx`
- 필요 시 GitHub Actions `Rebuild Ranking Redis` workflow를 수동 실행
- `curl -vk https://api.cubing-hub.com/actuator/health`

## 1차 배포 직후 후처리

- `.env`를 아래 값으로 원복
  - `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`
- `docker compose --env-file .env -f docker-compose.prod.yml up -d`
- 다시 `ps`와 `actuator/health` 확인
- 브라우저에서 최소 스모크 테스트 수행
  - 홈 진입
  - 로그인 / refresh
  - 기록 저장
  - 랭킹 조회

## 기존 운영 환경 재배포 체크리스트

### Backend만 재배포할 때

- backend jar 빌드
- Docker Hub image push
- EC2에서 `docker builder prune -af && docker image prune -af`
- EC2에서 `docker compose pull app && up -d`
- `docker compose ps`
- `docker compose logs --tail=100 app`
- `curl -vk https://api.cubing-hub.com/actuator/health`

### Frontend만 재배포할 때

- `VITE_API_BASE_URL=https://api.cubing-hub.com`로 다시 build
- S3 sync
- CloudFront invalidation
- 브라우저 강력 새로고침
- Network 탭에서 API host 확인

## 실제 배포 중 문제와 대응

| 증상 | 원인 | 대응 |
| --- | --- | --- |
| 프런트가 `localhost:8080`으로 요청 | `VITE_API_BASE_URL` 없이 build | `VITE_API_BASE_URL=https://api.cubing-hub.com npm run build` 후 재배포 |
| EC2에서 backend image pull 실패 | Docker Hub image에 `linux/amd64` manifest 없음 | `docker buildx build --platform linux/amd64 ... --push` 또는 multi-arch push |
| EC2에서 `no space left on device`로 backend image extract 실패 | root 디스크에 unused Docker image/cache가 누적된 상태에서 새 image pull | `docker builder prune -af && docker image prune -af` 후 `docker compose pull app && up -d` |
| `api.cubing-hub.com` 연결 거부 | Nginx 컨테이너 재시작 반복 | Nginx 로그 확인 후 SSL 보조 파일 생성 |
| `options-ssl-nginx.conf` 누락 | Let's Encrypt 보조 파일 미생성 | `/etc/letsencrypt/options-ssl-nginx.conf` 생성 |
| `ssl-dhparams.pem` 누락 | dhparams 파일 미생성 | `openssl dhparam -dsaparam -out /etc/letsencrypt/ssl-dhparams.pem 2048` 실행 |
| Redis 랭킹 읽기 모델이 비어 있음 | Redis 재구축이 아직 수행되지 않음 | GitHub Actions `Rebuild Ranking Redis` workflow 또는 `RANKING_REDIS_REBUILD_MODE=oneshot` one-shot 실행 |
| 앱은 떴는데 배포 후 운영 위험 남음 | 최초 배포 플래그 원복 누락 | `validate`로 바꾸고 compose 재기동 |

## 운영 보안 후처리 권장

- 터미널에 노출된 `RDS 비밀번호`는 배포 후 교체
- 필요 시 `JWT_SECRET`도 새 값으로 교체
- `.env`는 repo에 커밋하지 않기
- AWS / Docker Hub 배포용 자격 증명은 GitHub `Secrets`로 관리
