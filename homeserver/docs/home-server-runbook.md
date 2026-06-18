# 홈서버 운영 Runbook

## 배포 전 확인

- `$HOME/cubing-hub-runtime/homeserver.env`가 존재한다.
- `IMAGE_TAG`는 `sha-abcdef1` 형식이다.
- Docker Hub에 `xxh3898/cubing-hub-api:<IMAGE_TAG>`가 존재한다.
- Docker Hub에 `xxh3898/cubing-hub-web:<IMAGE_TAG>`가 존재한다.
- image platform은 `linux/arm64`다.
- `POST_IMAGES_HOST_DIR` 디렉터리가 repo checkout 밖에 존재한다.
- `$HOME/cubing-hub-runtime/deploy-state/`는 배포 스크립트가 생성할 수 있다.

## 배포

```bash
homeserver/scripts/deploy-home-server.sh sha-abcdef1
```

기본 배포 스크립트는 `$HOME/cubing-hub-runtime/homeserver.env`와 `$HOME/cubing-hub-runtime/deploy-state/`를 사용한다. GitHub Actions deploy job도 같은 경로를 명시해서 `actions/checkout`이 runner workspace를 clean해도 `.env`와 rollback state가 지워지지 않게 한다.

배포 스크립트는 아래 작업만 수행한다.

1. `docker compose pull`
2. `docker compose up -d`
3. health check
4. 지정된 실패 조건에서만 이전 `IMAGE_TAG`로 rollback

rollback 조건은 아래로 제한한다.

- `docker compose pull` 실패
- `docker compose up -d` 실패
- health check timeout
- `/actuator/health` HTTP status가 `200`이 아님
- `/actuator/health` 응답의 `status`가 `UP`이 아님

잘못된 인자, `.env` 파일 없음, 이전 `IMAGE_TAG` 없음, rollback 자체 실패는 deploy 실패로 보고하되 새 rollback 조건으로 다시 처리하지 않는다.

Mac mini self-hosted runner는 image build를 수행하지 않는다.

## 수동 확인

```bash
docker compose --env-file "$HOME/cubing-hub-runtime/homeserver.env" -f homeserver/docker-compose.yml ps
curl -fsS -H 'Host: api.cubing-hub.com' http://127.0.0.1:8088/actuator/health
```

## Cloudflare 전환 확인

- `www.cubing-hub.com`이 web container로 연결된다.
- `api.cubing-hub.com/api`가 app container로 연결된다.
- `api.cubing-hub.com/uploads/`가 이미지 디렉터리를 서빙한다.
- refresh cookie가 `Secure`, `HttpOnly`로 발급된다.

## AWS 중단

확인 전 실행 보류. 이 작업은 영향 범위가 있으므로 아래 항목 확인 후 진행해야 합니다.

- 작업 목적: AWS 비용 중단과 운영 경로 단일화
- 대상 환경: AWS 운영 리소스
- 영향 범위: 기존 S3/CloudFront/EC2/RDS 기반 운영 경로
- 데이터 손실 가능성: RDS/S3 데이터를 이관하지 않는 전제이므로 중단 후 AWS 데이터 복구 경로가 제한된다.
- 서비스 중단 가능성: 홈서버 장애 시 즉시 AWS rollback 경로가 사라진다.
- 롤백 가능성: AWS 중단 전에는 DNS/Tunnel route rollback 가능, 중단 후에는 제한적이다.
- 사전 백업 필요 여부: 홈서버 DB와 이미지 백업/복구 검증 필요
- 실행 전 확인: health check, 로그인, refresh, 기록 저장, 랭킹, 게시글 이미지 업로드, 백업/복구 검증
- 사용자 결정: AWS 리소스 중단 명시 승인
