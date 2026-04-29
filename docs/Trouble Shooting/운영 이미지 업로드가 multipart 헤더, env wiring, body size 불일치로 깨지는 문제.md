# 운영 이미지 업로드가 multipart 헤더, env wiring, body size 불일치로 깨지는 문제

## Summary

- 게시글 이미지 업로드 구현 자체는 있었지만, 운영에서는 업로드가 `400`으로 떨어지거나 아예 파일 저장까지 가지 못했다.
- 원인은 비즈니스 로직보다 앞단의 경계 계약이 서로 다른 전제를 보고 있던 점이었다.
- 해결은 `FormData` 헤더, runtime env 전달, reverse proxy와 Spring multipart 상한을 한 세트로 다시 맞추는 것이었다.

## Environment

- React frontend + axios interceptor
- Spring Boot backend
- Nginx reverse proxy
- Docker Compose production deploy
- S3-based post image storage

## Symptom

- 게시글 생성/수정에서 이미지 첨부를 붙이면 backend가 `카테고리/제목/내용 필수` 같은 validation `400`을 반환했다.
- production에서는 이미지 저장용 `POST_IMAGES_*` 설정이 코드에 있어도 실제 runtime에서는 비어 있어 업로드가 비활성화된 것처럼 동작했다.
- 총합 `10MB`를 조금 넘는 업로드는 비즈니스 validation까지 도달하지 못하고 proxy 단계에서 먼저 끊겼다.
- 즉 "파일 저장 구현이 틀렸다"기보다 요청 헤더, env, request size 계약이 계층마다 따로 어긋난 상태였다.

## Reproduction

1. frontend에서 게시글 생성/수정 요청을 `FormData`로 보내지만, 전역 JSON `Content-Type`가 그대로 남게 둔다.
2. production compose에서 `POST_IMAGES_*` 값을 app 컨테이너에 전달하지 않는다.
3. Nginx `client_max_body_size`와 Spring multipart 상한을 다르게 두고 총합 `10MB 초과 ~ 30MB 이하` 업로드를 시도한다.

## Expected

- 브라우저가 multipart boundary를 포함한 헤더를 자동으로 만들고, runtime env가 실제 컨테이너에 전달되며, proxy와 app이 같은 요청 크기 전제를 공유해야 한다.

## Actual

- frontend는 multipart 요청인데도 JSON 헤더를 유지해 backend가 `request` part를 비정상 DTO처럼 읽었다.
- production backend는 필요한 env를 기대했지만 compose가 전달하지 않아 실제 업로드 구성이 빠져 있었다.
- Nginx가 먼저 본문을 차단해 backend validation과 에러 메시지까지 도달하지 못했다.

## Root Cause

- 업로드 기능은 저장 로직 하나가 아니라 브라우저 serializer, 프런트 공통 헤더, runtime env wiring, reverse proxy limit, app multipart limit이 같은 계약을 봐야 한다.
- 이번 사례에서는 이 다섯 계층이 각각 조금씩 다른 전제를 가져 실제 운영에서만 연쇄적으로 실패했다.
- 그래서 증상은 하나처럼 보여도 원인은 "구현 코드"보다 "경계 계약 drift"에 가까웠다.

## Fix

- `FormData` 요청에서는 전역 JSON `Content-Type`를 제거해 브라우저가 multipart boundary를 자동 설정하게 한다.
- `docker-compose.prod.yml`에서 `POST_IMAGES_BUCKET`, `POST_IMAGES_REGION`, `POST_IMAGES_KEY_PREFIX`, `POST_IMAGES_PUBLIC_BASE_URL`를 app 컨테이너로 실제 전달한다.
- Nginx `client_max_body_size`와 Spring `max-file-size`, `max-request-size`를 같은 총합 전제로 다시 맞춘다.
- 업로드 장애를 볼 때는 storage code부터 의심하지 말고 `header -> env -> proxy/app limit` 순서로 먼저 좁힌다.

## Verification

- frontend `apiClient` 회귀 테스트에서 multipart 요청에 JSON `Content-Type`가 남지 않음을 확인했다.
- production 수동 검증에서 게시글 이미지 업로드와 S3 저장 성공을 확인했다.
- Nginx 설정 검증과 backend test/build를 다시 실행해 request body 상한 정렬 뒤에도 기존 검증이 깨지지 않음을 확인했다.

## Prevention

- 파일 업로드를 붙일 때는 "storage 구현"보다 "경계 계약 체크리스트"를 먼저 본다.
- 체크리스트는 최소한 `FormData header`, runtime env, reverse proxy body size, app multipart size, 부수효과 write 분리까지 같이 본다.
- production-only 증상이면 브라우저 요청 헤더와 컨테이너 env 전달 상태를 먼저 확인한다.

## Related

- [2026-04-23 - Daily Log](../Retrospectives/2026/04%EC%9B%94/2026-04-23%20-%20Daily%20Log.md)
- [2026-04-23 - TIL](../Retrospectives/2026/04%EC%9B%94/2026-04-23%20-%20TIL.md)
- [파일 업로드와 정적 리소스 처리 구조](../DevQ&A/%ED%8C%8C%EC%9D%BC%20%EC%97%85%EB%A1%9C%EB%93%9C%EC%99%80%20%EC%A0%95%EC%A0%81%20%EB%A6%AC%EC%86%8C%EC%8A%A4%20%EC%B2%98%EB%A6%AC%20%EA%B5%AC%EC%A1%B0.md)

## Internal Links

- [[Archive/Projects/Cubing Hub/Cubing Hub]]
- [[AI/cubing-hub/20260423/21-upload-body-limit-alignment/review-upload-body-limit-alignment]]
