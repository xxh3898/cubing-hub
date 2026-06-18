# 홈서버 마이그레이션 계획

## 목표

CubingHub를 AWS 중심 운영에서 Mac mini M4 홈서버 운영으로 전환한다. 홈서버는 Docker Compose로 `web`, `app`, `mysql`, `redis`, `nginx`를 실행하고, 필요할 때 `monitoring` profile로 Prometheus와 Grafana를 켠다.

## 목표 구조

```text
Client
  -> Cloudflare DNS / Proxy
  -> Cloudflare Tunnel
  -> Mac mini 127.0.0.1:8088
  -> homeserver nginx
  -> web / app / uploads
```

## 1차 CI/CD 전략

```text
GitHub push main
  -> GitHub-hosted runner
  -> backend test / frontend lint,test
  -> backend jar build / frontend build
  -> docker buildx build --platform linux/arm64
  -> Docker Hub push sha tag
  -> Mac mini self-hosted runner [self-hosted, macmini]
  -> docker compose pull
  -> docker compose up -d
  -> health check
  -> 지정된 실패 조건에서만 이전 IMAGE_TAG rollback
```

rollback 조건은 아래로 제한한다.

- `docker compose pull` 실패
- `docker compose up -d` 실패
- health check timeout
- `/actuator/health` HTTP status가 `200`이 아님
- `/actuator/health` 응답의 `status`가 `UP`이 아님

잘못된 인자, `.env` 파일 없음, 이전 `IMAGE_TAG` 없음, rollback 자체 실패는 deploy 실패로 보고하되 새 rollback 조건으로 다시 처리하지 않는다.

## Docker image 규칙

- `latest` 단독 배포를 금지한다.
- 기본 tag는 `sha-<shortSha>` 형식이다.
- backend image: `xxh3898/cubing-hub-api:sha-abcdef1`
- frontend image: `xxh3898/cubing-hub-web:sha-abcdef1`
- 1차 마이그레이션에서는 `linux/arm64`만 push한다.
- GHCR과 multi-arch push는 2차 개선 후보로 둔다.

## 데이터 전략

- 기존 RDS 데이터는 이관하지 않고 새 DB로 시작한다.
- 기존 S3 이미지는 이관하지 않고 새 로컬 이미지 저장소로 시작한다.
- schema는 Flyway `V1__init_schema.sql`을 추가해 새 DB에서 `V1`, `V2` 순서로 적용한다.
- `V1__init_schema.sql`은 `/tmp/cubinghub-schema.sql`의 `ddl-auto=create` 결과를 기준으로 작성했고, V2 index migration과 충돌하지 않도록 base index 상태를 맞췄다.
- 로컬 검증 DB에서 Flyway `V1`, `V2` 적용과 `V2` 인덱스 변경은 확인했다.
- `ddl-auto=validate` 기준 앱 기동은 별도 검증 대상으로 남긴다.

## 파일 저장 전략

- app 컨테이너는 `/data/post-images`에 read/write mount한다.
- nginx 컨테이너는 같은 host path를 read-only mount한다.
- host 기본 경로는 `~/cubing-hub-runtime/post-images/`다.
- 실제 `.env`와 rollback state는 GitHub Actions checkout 밖의 `~/cubing-hub-runtime/` 아래에 둔다.
- 공개 URL은 `https://api.cubing-hub.com/uploads/<objectKey>` 형식이다.

## 홈서버 DB 연결

- `app`은 compose 내부 MySQL service에 `sslMode=DISABLED`로 연결한다.
- MySQL 8의 `caching_sha2_password` 인증과 SSL 비활성 조합에서 Connector/J가 공개키 조회를 차단하지 않도록 홈서버 JDBC URL에 `allowPublicKeyRetrieval=true`를 명시한다.

## 모니터링 전략

- Prometheus와 Grafana는 `monitoring` profile로 분리한다.
- Grafana와 Prometheus port는 `127.0.0.1`에만 bind한다.
- 초기 접근 방식은 SSH tunnel이다.
- Tailscale 또는 Cloudflare Access는 후속 확장 후보로 둔다.

## AWS 중단 기준

AWS 중단은 홈서버 health check, 로그인, refresh, 기록 저장, 랭킹, 게시글 이미지 업로드, 백업/복구 검증 후 별도 체크리스트와 명시 승인으로만 진행한다.
