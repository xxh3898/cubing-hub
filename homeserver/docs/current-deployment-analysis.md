# 현재 배포 구조 분석

## 목적

AWS 기반 CubingHub 운영 구조를 Mac mini 홈서버로 옮기기 전에 현재 저장소의 배포 구성과 홈서버 전환 시 바뀌는 지점을 정리한다.

## 현재 구조

```text
www.cubing-hub.com
  -> CloudFront
  -> S3 React static files

api.cubing-hub.com
  -> EC2 Nginx
  -> Spring Boot app container
  -> Redis container
  -> RDS MySQL
  -> S3 post images
```

2026-06-19 MacBook 임시 검증에서 Gabia nameserver를 Cloudflare `ara.ns.cloudflare.com`, `titan.ns.cloudflare.com`으로 변경했다. TLD authoritative 조회 기준 위임은 Cloudflare로 바뀌었고, Cloudflare Tunnel 경유 `www` 응답과 `api /actuator/health` 응답을 확인했다. AWS 리소스는 중단하지 않았으므로, 일부 recursive resolver가 기존 Route53 위임을 TTL 동안 캐시하는 전파 구간에는 AWS 경로 또는 해석 실패가 섞일 수 있다.

## 재사용 가능한 부분

- `backend/Dockerfile`의 Java runtime image 실행 구조
- `infra/docker/docker-compose.prod.yml`의 app 환경 변수 배선 방식
- `infra/nginx/nginx.conf`의 proxy header, `/api`, `/actuator/health`, `client_max_body_size`
- 기존 Docker Hub push 흐름
- 기존 Redis AOF 설정

## 홈서버에서 바뀌는 부분

- 프런트는 S3/CloudFront가 아니라 `web` 컨테이너가 Nginx로 정적 파일을 서빙한다.
- 백엔드는 EC2가 아니라 Mac mini Docker Compose에서 실행한다.
- DB는 RDS가 아니라 `mysql` 컨테이너 named volume을 사용한다.
- 게시글 이미지는 S3가 아니라 Mac mini host path에 저장하고, 홈서버 Nginx가 `/uploads/`로 서빙한다.
- GitHub Actions는 Docker Hub image push 후 Mac mini self-hosted runner에서 pull/up deploy를 수행한다.

## 확정 사항

- Mac mini는 M4 기준이다.
- Docker Hub image는 1차 마이그레이션에서 `linux/arm64`만 push한다.
- image tag는 `latest` 단독 사용을 금지하고 `sha-abcdef1` 형식의 commit SHA tag를 사용한다.
- app image: `xxh3898/cubing-hub-api:sha-abcdef1`
- web image: `xxh3898/cubing-hub-web:sha-abcdef1`
- GHCR은 2차 개선 후보로 둔다.
- 기존 RDS 데이터와 기존 S3 이미지는 이관하지 않는다.
- MacBook을 임시 Mac mini로 사용한 Docker Hub pull/up 배포와 `127.0.0.1:8088` 경유 health/web 응답은 확인했다.

## 주요 리스크

- `V1__init_schema.sql`은 추가했고 로컬 검증 DB에서 Flyway `V1`, `V2` 적용과 `V2` 인덱스 변경을 확인했다. JPA `validate` 기준 앱 기동 검증은 아직 필요하다.
- Docker Hub `linux/arm64` image build/push 검증이 필요하다.
- Cloudflare Dashboard DNS 변경과 공개 DNS cutover는 별개다. 2026-06-19에 Gabia nameserver를 Cloudflare로 바꿨지만, 기존 Route53 위임을 캐시한 recursive resolver는 TTL 동안 AWS 경로 또는 해석 실패를 반환할 수 있다.
- DB dump만 백업하고 이미지 파일을 누락하면 `post_attachments.image_url` 또는 `object_key`가 깨질 수 있다.
- AWS 중단은 홈서버 검증 후 별도 체크리스트와 명시 승인 없이는 진행하지 않는다.
