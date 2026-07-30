# Mac mini 운영 준비

## 대상 구조

- Mac mini M4의 Docker Desktop에서 `linux/arm64` image를 실행한다.
- Cubing Hub는 `db`, `redis`, `api`, `web` container로 운영한다.
- `db`, `redis`는 project 전용 internal network에만 연결한다.
- `api`는 internal network와 API 전용 outbound bridge network에
  연결한다.
- `web`만 공유 external `edge` network에 `cubing-hub-web` alias로
  연결한다.
- 공유 `cloudflared` connector가 `http://cubing-hub-web:80`으로
  요청을 전달한다.
- GitHub-hosted runner가 GHCR image를 만들고 Tailscale OIDC와 제한 SSH
  명령으로 배포를 요청한다.

## 고정 운영 경로

운영 파일은 repository checkout 밖에 둔다.

```text
/Users/homeserver/Server/apps/cubing-hub/compose.yaml
/Users/homeserver/Server/apps/cubing-hub/.env
/Users/homeserver/Server/apps/cubing-hub/nginx/cloudflare-edge-real-ip.conf
/Users/homeserver/Server/data/cubing-hub/post-images/
/Users/homeserver/Server/backups/cubing-hub/
/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub.sh
/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub-ci.sh
/Users/homeserver/Server/scripts/backup/backup-cubing-hub.sh
```

`compose.yaml`, 배포 script, 백업 script는 검증한 저장소 파일을 위
고정 경로에 설치한다. `.env`는
`homeserver/.env.example`을 복사한 뒤 실제 secret으로 교체하고 mode를
`600`으로 제한한다.

## 최초 준비

1. Docker Desktop for Apple Silicon을 설치하고 로그인 뒤 자동 시작을
   확인한다.
2. 배포·백업 script가 Compose JSON 계약을 검사할 때 사용하는 system
   Python을 확인한다.

   ```bash
   test -x /usr/bin/python3
   /usr/bin/python3 --version
   ```

   `/usr/bin/python3`가 없으면 Homebrew Python이나 임의 PATH로 대체하지
   말고 준비를 중단한다. Xcode Command Line Tools 설치 여부와 운영 영향은
   별도 승인 후 확인한다.
3. external network를 한 번만 만든다.

   ```bash
   /usr/local/bin/docker network inspect edge >/dev/null 2>&1 \
     || /usr/local/bin/docker network create edge
   ```

4. 고정 운영 directory와 빈 게시글 이미지 directory를 만든다.
5. `homeserver/docker-compose.yml`,
   `homeserver/nginx/cloudflare-edge-real-ip.conf`,
   `homeserver/scripts/deploy-home-server.sh`,
   `homeserver/scripts/deploy-home-server-ci.sh`,
   `homeserver/scripts/backup-home-server.sh`를 고정 경로에 설치한다.
   Nginx 설정은 app directory의 `nginx/` 아래에 둔다.
6. `.env`의 image 두 개는 같은 full commit SHA를 사용하고 DB/JWT/SMTP
   secret을 실제 값으로 교체한다.
7. 배포·백업 script와 `.env` 권한을 제한한다.
8. Tailscale `tag:ci`에서 Mac mini SSH로 접근할 수 있는 최소 ACL과
   workload identity federation credential을 구성한다.
9. Cubing Hub 전용 SSH 공개키를 forced command와 함께 등록한다.

forced command는 아래 wrapper만 실행해야 한다.

```text
command="/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub-ci.sh",no-agent-forwarding,no-port-forwarding,no-pty,no-user-rc,no-X11-forwarding
```

wrapper는 아래 형식만 허용하며 `eval`, `bash -c`, 임의 shell 명령을
허용하지 않는다.

```text
deploy-cubing-hub <40자리 commit SHA> <registry user>
```

## 데이터 초기화

- 기존 RDS와 MacBook Docker volume 데이터는 가져오지 않는다.
- 첫 배포는 신규 MySQL·Redis named volume과 빈 이미지 directory로
  시작한다.
- API가 처음 올라올 때 Flyway `V1`, `V2`가 schema를 만들고
  `ddl-auto=validate`가 mapping을 확인한다.
- 첫 배포 뒤 핵심 business table, Redis key, 이미지 directory가 비어
  있는지 확인한다.

## Cloudflare 연결

공유 Tunnel route는 모두 같은 origin을 사용한다.

```text
cubing-hub.com       -> http://cubing-hub-web:80
www.cubing-hub.com   -> http://cubing-hub-web:80
api.cubing-hub.com   -> http://cubing-hub-web:80
```

`web`은 Host에 따라 apex redirect, SPA, API, `/uploads/`를 구분한다.
`cloudflare-edge-real-ip.conf`는 확인한 connector 주소
`172.18.0.2`만 신뢰한다. Mac mini의 `edge` 주소가 달라졌다면 route를
열기 전에 실제 connector 주소와 설정을 함께 갱신한다.

## 보안 기준

- MySQL, Redis, API는 host port를 열지 않는다.
- MySQL 관리 접속은 admin profile을 수동으로 실행할 때만
  `127.0.0.1:3307`에 연다.
- secret, GHCR token, SSH private key는 저장소와 로그에 넣지 않는다.
- API와 web container는 read-only filesystem,
  `no-new-privileges`, PID limit, log rotation을 사용한다.
- Mac mini에서는 source checkout이나 source build를 하지 않는다.
