# Deployment & Infrastructure Design

## 1. 배포 개요

- 운영 목표는 Mac mini 한 대에서 `web`, `api`, `db`, `redis`를 Docker Compose로 실행하는 것이다.
- API와 web 이미지는 GitHub-hosted ARM64 runner에서 검증하고 GHCR에 full commit SHA tag로 발행한다.
- GitHub Actions는 Tailscale OIDC와 Cubing Hub 전용 forced-command SSH를 통해 Mac mini 배포 script만 호출한다.
- 공개 traffic은 Mac mini의 공유 Cloudflare Tunnel과 external `edge` Docker network를 사용한다.
- 삭제된 기존 원격 DB 데이터를 복구하거나 이관하지 않고 신규 MySQL volume에서 시작한다.

## 2. 환경별 구성

### Local

- root `docker-compose.yml`
  - MySQL
  - Redis
  - Prometheus
  - Grafana
- Spring Boot와 Vite는 local process로 실행한다.
- Testcontainers, REST Docs, JaCoCo, Vitest, `k6` 기준선을 재현한다.

### CI

- `validate.yml`
  - `dev` push
  - `main` 대상 pull request
  - `deploy.yml`의 reusable workflow 호출
- Backend
  - Java 17
  - `./gradlew test jacocoTestReport build --no-daemon`
  - API image build에 사용할 jar artifact 업로드
- Frontend
  - Node.js 20
  - `npm ci`, lint, Vitest, production build
- Infrastructure
  - shell syntax
  - 운영 설정 Node test
  - production/admin Compose render
  - Nginx runtime config
  - frontend Dockerfile check
- Images
  - GitHub-hosted ARM64 runner에서 API/web `linux/arm64` image build
  - Validate 단계에서는 registry에 push하지 않음

### Production 목표

| Service | Image / Source | Data | Network |
| --- | --- | --- | --- |
| `db` | `mysql:8.0.46` | `mysql-data` volume | `application` |
| `redis` | `redis:7.2.14-alpine` | `redis-data` volume | `application` |
| `api` | `ghcr.io/xxh3898/cubing-hub-api:<full-sha>` | post image host directory read-write | `application`, `outbound` |
| `web` | `ghcr.io/xxh3898/cubing-hub-web:<full-sha>` | post image host directory read-only | `application`, `edge` |

- `application` network는 외부 port가 없는 internal network다.
- `outbound` network는 API만 연결하는 project 전용 bridge network다.
  SMTP·Discord 외부 연동에 필요한 egress를 제공하고 host port는 열지
  않는다.
- `edge` network는 다른 Mac mini 서비스와 공유하는 external network다.
- MySQL·Redis는 `application`에만, web은 `application`, `edge`에만
  연결한다.
- Cloudflare Tunnel은 `cubing-hub-web` alias를 origin으로 사용한다.
- Prometheus와 Grafana는 production Compose 범위에 포함하지 않는다.

## 3. Mac mini 고정 경로

| 목적 | 경로 |
| --- | --- |
| App directory | `/Users/homeserver/Server/apps/cubing-hub` |
| Compose | `/Users/homeserver/Server/apps/cubing-hub/compose.yaml` |
| Runtime env | `/Users/homeserver/Server/apps/cubing-hub/.env` |
| Post images | `/Users/homeserver/Server/data/cubing-hub/post-images` |
| Backup | `/Users/homeserver/Server/backups/cubing-hub` |
| Deploy script | `/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub.sh` |
| Backup script | `/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh` |

- runtime 파일은 repository checkout 밖에 둔다.
- `.env`와 private key는 Git에 추가하지 않는다.
- 실제 비밀값은 문서, log, command output에 노출하지 않는다.

## 4. Runtime 설정

### Images

- `API_IMAGE`
- `WEB_IMAGE`
- 두 값은 같은 40자리 commit SHA를 사용해야 한다.
- moving tag인 `latest`, `main`은 사용하지 않는다.

### Database / Redis

- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- MySQL과 Redis는 Compose service name으로만 접근한다.
- API의 JPA schema policy는 `validate`로 고정한다.
- Flyway가 신규 DB schema를 초기화한다.

### Authentication / External

- `JWT_SECRET`
- `JWT_EXPIRATION`
- `JWT_REFRESH_EXPIRATION`
- `CORS_ALLOWED_ORIGINS`
- `SMTP_*`
- `FEEDBACK_DISCORD_WEBHOOK_URL`
- `RANKING_REDIS_REBUILD_MODE`

### Post images

- `POST_IMAGES_HOST_DIR`
- `POST_IMAGES_KEY_PREFIX`
- `POST_IMAGES_PUBLIC_BASE_URL`
- API container 내부 root는 `/data/post-images`다.
- web container는 같은 directory를 read-only로 마운트한다.

## 5. CI/CD 파이프라인

### Validate

1. backend/frontend와 infra 검증 실행
2. backend jar artifact 생성
3. API/web ARM64 image build
4. registry push 없이 build 결과만 확인

### Publish

1. `main`과 `MAC_MINI_DEPLOY_ENABLED=true` 조건 확인
2. Validate 성공 확인
3. GHCR 로그인
4. API/web `linux/arm64` image를 같은 commit SHA tag로 발행
5. image digest를 GitHub Actions summary에 기록

### Deploy

1. `production` Environment 적용
2. Tailscale OIDC로 `home-mini` 연결
3. 고정 `known_hosts`와 전용 SSH identity 검증
4. GHCR token을 standard input으로 forced command에 전달
5. Mac mini deploy script가 두 image를 pull
6. 첫 배포는 `db`, `redis`부터 health 확인 뒤 API/web 기동
7. 업데이트는 backup 성공 뒤 API/web를 같은 SHA로 교체
8. web health 실패 시 이전 SHA로 rollback

## 6. GitHub 설정

### Environment

- `production`

### Secrets

- `TS_OAUTH_CLIENT_ID`
- `TS_AUDIENCE`
- `HOME_MINI_SSH_KEY`
- `HOME_MINI_KNOWN_HOSTS`

### Variables

- `MAC_MINI_DEPLOY_ENABLED`
  - 준비와 사전 검증이 끝날 때까지 설정하지 않거나 `false`로 유지한다.
  - 첫 실제 발행과 배포를 승인한 뒤 `true`로 설정한다.

`GITHUB_TOKEN`은 GitHub Actions가 제공하는 token을 사용하고 별도 장기 GHCR token을 repository secret으로 저장하지 않는다.

## 7. Tailscale와 SSH 경계

- GitHub Actions는 Tailscale workload identity federation을 사용한다.
- deploy client는 `tag:ci`로 연결하고 `home-mini` 도달 여부를 확인한다.
- SSH는 `StrictHostKeyChecking=yes`와 사전 등록한 `known_hosts`를 사용한다.
- Mac mini authorized key는 wrapper를 통해 아래 명령만 허용한다.

```text
deploy-cubing-hub <commit-sha> <registry-user>
```

- shell, port forwarding, PTY 같은 일반 원격 접근 권한을 배포 key에 부여하지 않는다.

## 8. Backup과 rollback

- 업데이트 전에 MySQL dump, Redis snapshot, post image snapshot을 한 backup 단위로 만든다.
- `post_attachments.object_key`와 image snapshot의 파일 존재 여부를 대조한다.
- 검증에 실패한 backup은 성공본으로 보관하지 않는다.
- 성공한 backup은 최신 `3개`를 유지한다.
- 첫 배포는 이전 운영 SHA가 없으므로 공개 cutover 전에 실패를 해결한다.
- 업데이트 health 실패 시 이전 API/web SHA로 Compose를 되돌린다.
- 데이터 restore는 자동 rollback에 포함하지 않고 별도 승인과 격리 검증 뒤 진행한다.

## 9. Cloudflare route

- `www.cubing-hub.com`
  - React SPA와 정적 자산
- `api.cubing-hub.com`
  - `/api/**`, `/actuator/health`, `/uploads/**`
- apex
  - `www` redirect

route 변경 전 현재 Cloudflare 구성을 backup한다. Cubing Hub route만 수정하고 Portfolio와 Guess Pokémon origin은 변경하지 않는다.

## 10. 검증 기준

### 저장소와 CI

- workflow YAML과 actionlint
- backend/frontend 전체 검증
- Compose render
- Nginx runtime config
- API/web ARM64 image build
- 폐기한 cloud deploy path와 moving image tag 0건

### Mac mini

- Docker daemon과 external `edge` network
- runtime directory 권한과 `.env` mode
- 신규 MySQL/Redis volume
- Flyway migration 성공
- JPA `validate` 성공
- API/web/db/redis health
- 초기 business table이 빈 상태인지 확인
- backup과 restore rehearsal

### 공개

- apex redirect
- `www` 200과 SPA deep link
- API health `UP`
- TLS
- 로그인, refresh, logout
- SMTP 회원가입/비밀번호 재설정
- 기록 저장과 랭킹 반영
- 게시글 이미지 upload/read/delete
- Portfolio와 Guess Pokémon 회귀 확인

## 11. 구현 및 배포 상태

- 저장소 구현 완료
  - production Compose
  - deploy/backup/rollback script
  - GHCR/Tailscale/SSH workflow
  - Nginx Cloudflare origin config
- 검증 완료
  - local 정적·설정 검증
  - GitHub-hosted backend/frontend와 API/web ARM64 build
- 준비 필요
  - GitHub `production` Environment와 secret
  - Tailscale OIDC grant
  - Mac mini forced-command SSH key와 runtime 파일
  - 신규 data volume과 post image directory
- 미실행
  - GHCR Publish
  - Mac mini Deploy
  - Cloudflare cutover
  - 공개 smoke와 운영 backup/monitoring

## 12. 장애 대응

| 상황 | 1차 대응 | 후속 대응 |
| --- | --- | --- |
| API/web image pull 실패 | 새 SHA 배포 중단 | GHCR package 권한과 tag 확인 |
| API health 실패 | 이전 API/web SHA rollback | application log와 DB/Redis 상태 확인 |
| MySQL 연결 실패 | DB health와 runtime env 확인 | volume과 Flyway history 확인 |
| Redis 장애 | 인증/랭킹 영향 확인 | persistence와 rebuild 절차 검토 |
| 이미지 파일 불일치 | 공개 전환 중단 | DB object key와 snapshot 대조 |
| Cloudflare origin 장애 | Cubing Hub route 원복 | edge alias와 Nginx Host routing 확인 |
| CI 실패 | 실패 job artifact와 log 확인 | backend/frontend/infra/image 단계로 원인 분리 |
