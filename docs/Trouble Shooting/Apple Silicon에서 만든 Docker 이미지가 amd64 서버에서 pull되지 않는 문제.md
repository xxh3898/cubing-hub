# Apple Silicon에서 만든 Docker 이미지가 amd64 서버에서 pull되지 않는 문제

## Summary

- 로컬 맥에서는 `docker build`가 성공했는데, EC2에서 `docker compose pull`과 `up -d`가 실패했다.
- 원인은 애플 실리콘 환경에서 만든 이미지를 그대로 push해 Docker Hub manifest에 `linux/amd64`가 없었던 점이었다.
- 해결은 `docker buildx build --platform ... --push`로 배포 대상 아키텍처를 명시하고, 배포 체크리스트에 manifest 확인 단계를 넣는 것이다.

## Environment

- Apple Silicon macOS
- Docker / Docker Hub
- AWS EC2 `linux/amd64`
- `docker compose`

## Symptom

- 로컬 `docker build`와 `docker compose config`는 통과한다.
- EC2에서 `docker compose pull`을 실행하면 backend 이미지를 내려받지 못한다.
- 결과적으로 `docker compose up -d`도 같은 이유로 막혀 컨테이너가 기동되지 않는다.

## Reproduction

1. Apple Silicon 맥에서 backend 이미지를 기본 설정으로 build 후 Docker Hub에 push한다.
2. `linux/amd64` EC2에서 같은 태그를 `docker compose pull`로 내려받는다.
3. Docker Hub manifest에 `linux/amd64`가 없으면 pull 단계에서 실패한다.

## Expected

- 로컬에서 push한 이미지가 배포 대상 서버 아키텍처에서도 그대로 pull되고 기동된다.

## Actual

- 로컬 build 성공 여부와 무관하게, 배포 서버 아키텍처가 manifest에 없으면 EC2에서 즉시 pull이 실패한다.

## Root Cause

- Apple Silicon 환경은 기본적으로 `arm64` 이미지를 만들기 쉽다.
- 이번 사례에서는 `xxh3898/cubing-hub-backend:latest`에 `linux/amd64` manifest가 없어 EC2가 이미지를 해석하지 못했다.
- 즉 문제는 compose 파일이나 EC2 설정보다 앞선 단계인 이미지 배포 계약 불일치였다.

## Fix

- backend 이미지를 `docker buildx build --platform linux/amd64 ... --push` 또는 multi-arch(`linux/amd64,linux/arm64`)로 다시 push한다.
- 배포 전 `docker manifest inspect` 또는 registry UI로 대상 서버 아키텍처가 포함됐는지 먼저 확인한다.
- 첫 배포 체크리스트에는 compose 문법, `.env`, 인증서보다 앞서 "배포 대상 아키텍처 manifest 포함 여부"를 넣는다.

## Verification

- 로컬에서는 `docker build -f backend/Dockerfile -t cubing-hub-backend:test backend`가 성공했다.
- EC2에서는 `docker compose --env-file .env -f docker-compose.prod.yml pull`이 실패했고, 원인은 `linux/amd64` manifest 부재로 확인됐다.
- 후속 문서에서 이 문제를 재배포 체크리스트로 승격해 재발 방지 포인트를 남겼다.

## Prevention

- Apple Silicon에서 서버 배포용 이미지를 만들 때는 기본 `docker build` 성공만으로 배포 가능하다고 판단하지 않는다.
- release 절차에 target architecture 명시와 manifest 검증을 포함한다.
- `latest` 하나만 믿기보다 필요하면 명시적 태그와 multi-arch 정책을 함께 관리한다.

## Related

- [2026-04-21 - Daily Log](../Retrospectives/2026/04%EC%9B%94/2026-04-21%20-%20Daily%20Log.md)
- [2026-04-21 - TIL](../Retrospectives/2026/04%EC%9B%94/2026-04-21%20-%20TIL.md)

## Internal Links

- [[Archive/Projects/Cubing Hub/Cubing Hub]]
- [[AI/Inbox/cubing-hub/20260421/02-aws-deployment-preparation/review-aws-deployment-preparation]]
- [[AI/Inbox/cubing-hub/20260422/01-post-deploy-wrap-up-and-cd-automation/review-post-deploy-wrap-up-and-cd-automation]]
