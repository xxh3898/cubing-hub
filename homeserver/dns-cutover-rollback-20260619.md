# Cloudflare DNS cutover rollback 기록

- 기록 시각: 2026-06-19 02:23:27 KST
- 대상 도메인: `cubing-hub.com`
- Tunnel 대상: `1f63d504-4505-490f-b152-547cf9824623.cfargotunnel.com`
- 작업 원칙: AWS 리소스는 중단하지 않고 DNS만 Cloudflare Tunnel로 전환한다.

## 변경 전 Cloudflare DNS 값

Cloudflare Dashboard의 `DNS > Records` 화면에서 확인한 값이다.

### `api.cubing-hub.com`

| Type | Name | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| A | `api` | `54.180.87.247` | Proxied | Auto |

### `cubing-hub.com`

| Type | Name | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| A | `@` | `3.175.64.52` | Proxied | Auto |
| A | `@` | `3.175.64.23` | Proxied | Auto |
| A | `@` | `3.175.64.86` | Proxied | Auto |
| A | `@` | `3.175.64.125` | Proxied | Auto |

### `www.cubing-hub.com`

| Type | Name | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| A | `www` | `3.163.175.81` | Proxied | Auto |
| A | `www` | `3.163.175.16` | Proxied | Auto |
| A | `www` | `3.163.175.48` | Proxied | Auto |
| A | `www` | `3.163.175.105` | Proxied | Auto |

### `*.cubing-hub.com`

`route dns --overwrite-dns` 대상은 아니지만, 변경 전 화면에 함께 표시된 wildcard 레코드다.

| Type | Name | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| A | `*` | `3.175.64.86` | Proxied | Auto |
| A | `*` | `3.175.64.23` | Proxied | Auto |
| A | `*` | `3.175.64.52` | Proxied | Auto |
| A | `*` | `3.175.64.125` | Proxied | Auto |

## 롤백 방법

Cloudflare DNS에서 `@`, `www`, `api` 레코드를 위 값으로 되돌린다. AWS 리소스를 끄지 않았다면 DNS 원복만으로 기존 AWS 경로로 되돌릴 수 있다.

## 2026-06-19 Cloudflare DNS 변경 직후 실행 결과

이 섹션은 Gabia nameserver를 Cloudflare로 전환하기 전 상태를 기록한다.

Cloudflare Dashboard의 `DNS > Records`에서는 아래처럼 변경했다.

| Type | Name | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| CNAME | `@` | `1f63d504-4505-490f-b152-547cf9824623.cfargotunnel.com` | Proxied | Auto |
| CNAME | `www` | `1f63d504-4505-490f-b152-547cf9824623.cfargotunnel.com` | Proxied | Auto |
| CNAME | `api` | `1f63d504-4505-490f-b152-547cf9824623.cfargotunnel.com` | Proxied | Auto |

당시 검증 결과 `cubing-hub.com`의 authoritative nameserver는 AWS Route53이었다.

```text
ns-660.awsdns-18.net.
ns-482.awsdns-60.com.
ns-1832.awsdns-37.co.uk.
ns-1243.awsdns-27.org.
```

따라서 Cloudflare Dashboard의 DNS 변경은 아직 공개 트래픽에 영향을 주지 않는다. `www.cubing-hub.com`은 검증 시점에도 `AmazonS3`와 `CloudFront` 헤더를 반환했다.

AWS는 중단하지 않았다.

## 2026-06-19 nameserver 전환 준비

Cloudflare Overview에서 요구한 nameserver는 아래 두 개다.

```text
ara.ns.cloudflare.com
titan.ns.cloudflare.com
```

전환 전 공개 authoritative nameserver는 아래 네 개다.

```text
ns-1243.awsdns-27.org.
ns-1832.awsdns-37.co.uk.
ns-482.awsdns-60.com.
ns-660.awsdns-18.net.
```

nameserver rollback이 필요하면 등록기관의 nameserver를 위 `awsdns` 네 개로 되돌린다. AWS 리소스 자체는 이 작업에서 중단하지 않는다.

## 2026-06-19 nameserver 전환 실행 결과

Gabia 도메인 관리툴에서 `cubing-hub.com`의 nameserver를 아래 값으로 변경했다.

```text
ara.ns.cloudflare.com
titan.ns.cloudflare.com
```

변경 후 TLD authoritative 조회 기준으로 Cloudflare nameserver 위임을 확인했다.

```text
cubing-hub.com. 172800 IN NS ara.ns.cloudflare.com.
cubing-hub.com. 172800 IN NS titan.ns.cloudflare.com.
```

Cloudflare Dashboard의 `DNS > Records` 기준으로 `@`, `www`, `api`는 모두 Tunnel CNAME이며 `Proxied` 상태다.

```text
CNAME Proxied @   1f63d504-4505-490f-b152-547cf9824623.cfargotunnel.com
CNAME Proxied www 1f63d504-4505-490f-b152-547cf9824623.cfargotunnel.com
CNAME Proxied api 1f63d504-4505-490f-b152-547cf9824623.cfargotunnel.com
```

MacBook 테스트 환경에서는 `cloudflared`를 사용자 LaunchAgent로 등록했다.

```text
/Users/chiho/Library/LaunchAgents/com.cloudflare.cloudflared.plist
```

기본 `cloudflared service install`이 `cloudflared` 단독 실행 인자만 생성해서 바로 종료됐으므로, `ProgramArguments`를 아래 실행 형태로 보정했다.

```text
/opt/homebrew/bin/cloudflared tunnel run cubing-hub-home
```

서비스 단독 실행 상태에서 `cloudflared tunnel info cubing-hub-home`은 활성 connector를 반환했다.

```text
NAME: cubing-hub-home
ID: 1f63d504-4505-490f-b152-547cf9824623
CONNECTOR: darwin_arm64 / 2026.6.1 / edge icn01, icn05, icn06
```

Cloudflare edge IP를 기준으로 실제 요청도 통과했다.

```text
curl -I https://www.cubing-hub.com/
HTTP/2 200
server: cloudflare

curl https://api.cubing-hub.com/actuator/health
{"status":"UP"}
```

단, 일부 recursive resolver는 기존 Route53 nameserver 위임을 TTL 동안 캐시할 수 있다. 이 경우 기본 `dig NS cubing-hub.com`이나 일반 `curl https://api.cubing-hub.com/...`가 잠시 AWS 경로 또는 해석 실패를 반환할 수 있다. 전파 중 판단 기준은 `dig @1.1.1.1`, `dig @titan.ns.cloudflare.com`, `dig +trace` 결과를 우선 확인한다.

AWS 리소스는 중단하지 않았다.
