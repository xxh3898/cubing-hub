# Mac mini 홈서버 준비

## 대상

- Mac mini M4
- Apple Silicon `linux/arm64` Docker 실행
- GitHub Actions self-hosted runner label: `[self-hosted, macmini]`

## 필수 준비

1. Docker Desktop for Apple Silicon을 설치한다.
2. Docker Desktop이 로그인 후 자동 시작되는지 확인한다.
3. Cloudflare Tunnel을 설치하고 `127.0.0.1:8088`로 라우팅한다.
4. GitHub self-hosted runner를 설치하고 `macmini` label을 추가한다.
5. 홈서버 저장소 checkout 경로에 `homeserver/.env`를 준비한다.
6. 이미지 저장 디렉터리 `~/cubing-hub-data/post-images/`를 준비한다.
7. 백업 디렉터리 `~/backups/cubing-hub/`를 준비한다.

## Docker 실행 기준

1차 기준은 Docker Desktop이다. self-hosted runner는 Docker build를 하지 않고 Docker Hub image pull과 compose deploy만 수행한다.

Docker Desktop 자동 시작이나 장시간 무인 운영이 불안정하다고 확인되면 Colima/Lima 같은 대체 런타임을 후속 작업으로 검토한다.

## Cloudflare Tunnel 라우팅

```text
cubing-hub.com       -> http://127.0.0.1:8088
www.cubing-hub.com   -> http://127.0.0.1:8088
api.cubing-hub.com   -> http://127.0.0.1:8088
```

## 보안 기준

- MySQL과 Redis host port는 열지 않는다.
- Grafana와 Prometheus는 public domain으로 노출하지 않는다.
- SSH, Tailscale, 또는 로컬 tunnel을 통해서만 운영 도구에 접근한다.
- `.env`의 secret은 Git에 올리지 않는다.
