# malformed refresh_token이 login과 bootstrap을 막을 때 cookie path 결합으로 복구가 막히는 문제

## Summary

- bad `refresh_token`가 생기면 refresh만 실패하는 게 아니라 login과 bootstrap까지 같이 막힐 수 있었다.
- 원인은 `refresh_token` cookie가 `/api/auth` 경로에 묶여 있어 `login`, `refresh`, `logout`에 모두 자동 전송된 점이었다.
- 해결은 cookie path 밖의 public clear endpoint를 따로 두고, frontend는 실제 오염 가능성이 큰 경우에만 선택적으로 복구를 시도하는 것이었다.

## Environment

- Spring Boot auth API
- Spring Security
- HttpOnly `refresh_token` cookie
- React auth bootstrap / login flow
- Browser + proxy request parsing

## Symptom

- 사용자가 `refresh_token` 값을 변조하거나 비정상 값이 남은 상태에서 새로고침하면 bootstrap refresh가 실패했다.
- 그 상태에서 다시 로그인해도 `POST /api/auth/login`이 CORS 없는 `400`처럼 보이며 같이 막혔다.
- 문제 cookie를 지우는 경로가 같은 path 아래에 있으면 복구 요청 자체도 같은 cookie에 다시 걸릴 수 있었다.
- 결과적으로 “로그인 API가 고장 났다”처럼 보이지만, 실제로는 login path와 refresh cookie scope가 결합된 문제가 핵심이었다.

## Reproduction

1. backend가 `refresh_token` cookie를 `Path=/api/auth`로 발급한다.
2. 브라우저나 DevTools에서 `refresh_token` 값을 malformed 상태로 만든다.
3. 새로고침 뒤 bootstrap refresh 또는 재로그인을 시도하면 bad cookie가 다시 실려 login과 recovery까지 같이 흔들린다.

## Expected

- refresh cookie가 비정상이어도 login 자체는 새 세션 시작 경로로 계속 살아 있어야 한다.
- 복구 endpoint는 원인 cookie와 같은 path에 묶이지 않아야 한다.

## Actual

- bad cookie가 `/api/auth/login`에도 자동으로 실리면서 request parsing 단계에서 먼저 문제가 생겼다.
- bootstrap과 login이 같은 오염 상태를 공유해 사용자는 “로그인도 안 되고 자동 복구도 안 되는” 상태를 겪었다.

## Root Cause

- 이번 문제는 “invalid token” 일반론보다 cookie scope 설계 문제였다.
- `Path=/api/auth`는 refresh에는 편했지만 login/signup과 복구 경로까지 같은 cookie 영향권에 넣었다.
- frontend가 모든 refresh 실패를 다 복구 대상으로 삼으면 guest 첫 방문 같은 정상 `missing cookie 400`까지 과잉 처리하게 되어 원인 분리가 흐려진다.

## Fix

- `POST /api/session/clear-refresh-cookie`처럼 `/api/auth` 밖의 public clear endpoint를 둔다.
- login/refresh/logout이 공유하던 cookie 만료 로직을 공통화해 clear 동작도 같은 기준으로 맞춘다.
- frontend bootstrap/login에서는 malformed, reused, `401`, network-error 계열처럼 실제 오염 가능성이 큰 경우만 best-effort clear를 시도한다.
- `missing cookie 400` 같은 정상 guest 흐름은 복구 루틴에서 제외한다.

## Verification

- backend auth/security integration test와 frontend auth/login test를 다시 실행해 recovery 경로를 검증했다.
- REST Docs와 설계 문서를 갱신해 새 recovery endpoint와 분기 기준을 동기화했다.
- 실제 운영 증상 기준으로 `POST /api/auth/login` 실패 요청에 bad `refresh_token` cookie가 같이 붙던 패턴을 확인했다.

## Prevention

- 쿠키 기반 refresh 구조를 설계할 때는 refresh 성공 흐름보다 “bad cookie가 남았을 때 login과 recovery가 같이 막히지 않는가”를 먼저 본다.
- 복구 endpoint는 원인 cookie path 밖에 두고, frontend는 모든 실패를 삼키지 말고 제한된 경우만 복구한다.
- auth 장애가 CORS 없는 `400`처럼 보이면 application code 전에 cookie scope와 request parsing 단계를 먼저 의심한다.

## Related

- [2026-04-22 - Daily Log](../Retrospectives/2026/04%EC%9B%94/2026-04-22%20-%20Daily%20Log.md)
- [2026-04-22 - TIL](../Retrospectives/2026/04%EC%9B%94/2026-04-22%20-%20TIL.md)
- [malformed refresh_token가 login 자체를 막을 때 복구 endpoint는 왜 cookie path 밖에 있어야 하는가](../DevQ&A/malformed%20refresh_token%EA%B0%80%20login%20%EC%9E%90%EC%B2%B4%EB%A5%BC%20%EB%A7%89%EC%9D%84%20%EB%95%8C%20%EB%B3%B5%EA%B5%AC%20endpoint%EB%8A%94%20%EC%99%9C%20cookie%20path%20%EB%B0%96%EC%97%90%20%EC%9E%88%EC%96%B4%EC%95%BC%20%ED%95%98%EB%8A%94%EA%B0%80.md)

## Internal Links

- [[Archive/Projects/Cubing Hub/Cubing Hub]]
- [[AI/Inbox/cubing-hub/20260422/05-auth-cookie-login-block/review-auth-cookie-login-block]]
