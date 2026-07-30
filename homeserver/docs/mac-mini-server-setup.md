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
/Users/homeserver/Server/scripts/backup/backup-cubing-hub-bootstrap.sh
```

신규 서버의 `compose.yaml`과 기존 고정 deploy/backup worker는 pre-v2
bootstrap·recovery seed다. 현재 운영 서버를 v2로 전환할 때는 이 worker를
branch 원본으로 교체하지 않고 stable deploy/backup bootstrap 두 개만 한 번
설치한다. 이후 허용된 deploy/backup worker는 runtime-config release로
전달하며 stable bootstrap을 자동 교체하지 않는다. `.env`는
`homeserver/.env.example`을 복사한 뒤 실제 secret으로 교체하고 mode를
`600`으로 제한한다.

현재 운영 서버 전환 전에는 기존 deploy fallback의 `recover` 지원과 기존
backup fallback의 실행 가능 여부를 확인한다. 둘 중 하나라도 충족하지 않으면
고정 worker를 자동 교체하지 말고 별도 전환 계획으로 중단한다.

## 최초 준비

1. Docker Desktop for Apple Silicon을 설치하고 로그인 뒤 자동 시작을
   확인한다.
2. 배포·백업 script가 Compose JSON 계약과 공통 operation lock을 검사할 때
   사용하는 system 도구를 확인한다.

   ```bash
   test -x /usr/bin/python3
   test -x /usr/bin/lockf
   /usr/bin/python3 --version
   ```

   `/usr/bin/python3` 또는 `/usr/bin/lockf`가 없으면 Homebrew 도구나 임의
   PATH로 대체하지 말고 준비를 중단한다. Xcode Command Line Tools 설치
   여부와 운영 영향은 별도 승인 후 확인한다.
3. external network를 한 번만 만든다.

   ```bash
   /usr/local/bin/docker network inspect edge >/dev/null 2>&1 \
     || /usr/local/bin/docker network create edge
   ```

4. 고정 운영 directory와 빈 게시글 이미지 directory를 만든다.
5. 새 서버를 처음 준비하는 경우에만 `homeserver/docker-compose.yml`,
   `homeserver/nginx/cloudflare-edge-real-ip.conf`와 pre-v2 fallback
   deploy/backup worker를 초기 seed로 설치한다. 이미 운영 중인 서버의
   고정 worker는 교체하지 않는다. Nginx 설정은 app directory의
   `nginx/` 아래에 둔다.
6. `homeserver/scripts/deploy-home-server-ci.sh`와
   `homeserver/scripts/backup-home-server-bootstrap.sh`를 stable 진입점으로
   한 번 설치한다. 첫 v2 `update`부터 deploy/backup worker는 exact
   runtime-config digest로만 갱신한다.
7. `.env`의 image 두 개는 같은 full commit SHA를 사용하고 DB/JWT/SMTP
   secret을 실제 값으로 교체한다.
8. 배포·백업 script와 `.env` 권한을 제한한다.
9. Tailscale `tag:ci`에서 Mac mini SSH로 접근할 수 있는 최소 ACL과
   workload identity federation credential을 구성한다.
10. Cubing Hub 전용 SSH 공개키를 forced command와 함께 등록한다.

forced command는 아래 wrapper만 실행해야 한다.

```text
command="/Users/homeserver/Server/scripts/deploy/deploy-cubing-hub-ci.sh",no-agent-forwarding,no-port-forwarding,no-pty,no-user-rc,no-X11-forwarding
```

wrapper는 아래 형식만 허용하며 `eval`, `bash -c`, 임의 shell 명령을
허용하지 않는다.

```text
deploy-cubing-hub <40자리 commit SHA> <registry user>
deploy-cubing-hub-v2 <40자리 commit SHA> keep <registry user>
deploy-cubing-hub-v2 <40자리 commit SHA> update <sha256 digest> <registry user>
```

legacy 명령은 runtime config v2 전환 전 설치에서만 사용한다. v2 state가
초기화된 뒤에는 `keep` 또는 exact digest를 전달하는 `update`만 허용한다.
`deploy-home-server-ci.sh`가 stable forced-command/bootstrap 역할을 하고
`backup-home-server-bootstrap.sh`가 정기 backup 진입점 역할을 한다.
`update` artifact는 Compose, pinned Nginx 설정과 허용된 deploy/backup
script만 포함한다. 검증된 성공 뒤 `runtime-config/current`가 이 네 파일의
active release가 되며, 고정 deploy/backup bootstrap은 active script를
검증한 뒤 전달 실행한다.

두 bootstrap은
`/Users/homeserver/Server/apps/cubing-hub/.cubing-hub-operation.lock`의
같은 advisory lock을 사용한다. Lock 경합은 exit `75`로 실패하므로 기존
작업이 끝난 뒤 재시도한다. Lock file은 mode `600` regular file로 계속
남겨 두며, 파일 존재 자체는 실행 중인 lock을 뜻하지 않으므로 삭제하거나
stale PID 방식으로 복구하지 않는다.

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
