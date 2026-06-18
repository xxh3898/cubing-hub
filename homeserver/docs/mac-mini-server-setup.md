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
5. runner workspace 밖에 `~/cubing-hub-runtime/homeserver.env`를 준비한다.
6. 이미지 저장 디렉터리 `~/cubing-hub-runtime/post-images/`를 준비한다.
7. rollback state 디렉터리 `~/cubing-hub-runtime/deploy-state/`를 준비하거나 배포 스크립트가 만들도록 둔다.
8. 백업 디렉터리 `~/backups/cubing-hub/`를 준비한다.
9. 주기 백업이 필요하면 `homeserver/launchd/com.cubinghub-backup.plist.example`을 사용자 `LaunchAgent`로 설치한다.

## Docker 실행 기준

1차 기준은 Docker Desktop이다. self-hosted runner는 Docker build를 하지 않고 Docker Hub image pull과 compose deploy만 수행한다.

Docker Desktop 자동 시작이나 장시간 무인 운영이 불안정하다고 확인되면 Colima/Lima 같은 대체 런타임을 후속 작업으로 검토한다.

## Runtime 파일 위치

GitHub Actions self-hosted runner의 `actions/checkout`은 workspace를 clean할 수 있다. 그래서 실제 `.env`, rollback state, 업로드 이미지는 repository checkout 밖에 둔다.

```text
~/cubing-hub-runtime/homeserver.env
~/cubing-hub-runtime/deploy-state/
~/cubing-hub-runtime/post-images/
```

`homeserver.env`의 `POST_IMAGES_HOST_DIR`는 `~/`가 아니라 실제 절대경로로 적는다.

## Cloudflare Tunnel 라우팅

```text
cubing-hub.com       -> http://127.0.0.1:8088
www.cubing-hub.com   -> http://127.0.0.1:8088
api.cubing-hub.com   -> http://127.0.0.1:8088
```

Cloudflare Dashboard에 위 레코드를 만들어도 `cubing-hub.com`의 authoritative nameserver가 Cloudflare가 아니면 공개 트래픽에는 적용되지 않는다. `dig NS cubing-hub.com`, `dig +trace`, `dig @1.1.1.1`으로 확인한다.

2026-06-19 MacBook 임시 검증에서는 Cloudflare Dashboard의 `@`, `www`, `api` 레코드를 Tunnel CNAME으로 바꾸고 Gabia nameserver를 Cloudflare `ara.ns.cloudflare.com`, `titan.ns.cloudflare.com`으로 전환했다. Cloudflare edge 경유 `www` 응답과 `api /actuator/health` 응답은 통과했다. 단, 일부 recursive resolver는 기존 Route53 위임을 TTL 동안 캐시할 수 있으므로 전파 구간에는 resolver별 결과를 분리해서 확인한다.

macOS 사용자 서비스 등록은 아래 순서로 확인한다.

```bash
cloudflared service install
plutil -p ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
launchctl print gui/$(id -u)/com.cloudflare.cloudflared
cloudflared tunnel info cubing-hub-home
```

`ProgramArguments`가 `/opt/homebrew/bin/cloudflared`만 포함하면 서비스가 바로 종료된다. 이 경우 `ProgramArguments`를 `/opt/homebrew/bin/cloudflared tunnel run cubing-hub-home` 형태로 맞춘 뒤 다시 로드한다.

## 보안 기준

- MySQL과 Redis host port는 열지 않는다.
- MySQL Workbench 접속은 `homeserver/docker-compose.admin.yml`의 `mysql-admin-proxy`를 수동으로 띄울 때만 `127.0.0.1:3307`에 연다.
- Grafana와 Prometheus는 public domain으로 노출하지 않는다.
- SSH, Tailscale, 또는 로컬 tunnel을 통해서만 운영 도구에 접근한다.
- `.env`의 secret은 Git에 올리지 않는다.
