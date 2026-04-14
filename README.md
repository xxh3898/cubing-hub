# Cubing Hub

큐빙 기록, 학습, 랭킹, 커뮤니티를 한 흐름으로 연결하는 풀스택 웹 플랫폼 프로젝트입니다.
현재 문서는 최종 목표 구조와 현재 구현 상태, 구현 예정 범위를 함께 구분해서 정리합니다.

## 문서 안내

- [Project Overview](docs/Project%20Overview.md)
- [Screen Specification](docs/Screen%20Specification.md)
- [API Specification](docs/API%20Specification.md)
- [Database Design](docs/Database%20Design.md)
- [Authentication & Authorization Design](docs/Authentication%20%26%20Authorization%20Design.md)
- [System Architecture](docs/System%20Architecture.md)
- [Deployment & Infrastructure Design](docs/Deployment%20%26%20Infrastructure%20Design.md)
- [Project Schedule](docs/Project%20Schedule.md)
- [Internal Schedule](docs/Internal%20Schedule.internal.md)
- `docs/Development Log/` : 일자별 개발 기록
- `docs/Trouble Shooting/` : 트러블슈팅 문서

## 실행 방법

로컬 실행 전 root `.env` 파일이 필요합니다.

```bash
cp .env.example .env
```

`.env`에는 최소 아래 값들을 채워야 합니다.

- `LOCAL_DB_PASSWORD`
- `LOCAL_JWT_SECRET`
- `LOCAL_GRAFANA_ADMIN_PASSWORD`

### 로컬 인프라

```bash
docker compose up -d
```

### 백엔드 실행

```bash
cd backend
./gradlew bootRun
```

`bootRun`은 현재 설정상 `asciidoctor`와 `test`를 선행하므로 서버 기동 전에 테스트와 REST Docs 생성이 함께 수행됩니다.

### React 실행

```bash
cd frontend
npm run dev
```

## 검증 명령

### 백엔드

```bash
cd backend
./gradlew test
./gradlew build
```

### 프런트엔드

```bash
cd frontend
npm run lint
npm run build
```

## 환경 변수 및 설정

### Backend

- 기본 활성 프로필: `backend/src/main/resources/application.yaml`
- 로컬 개발 설정: `backend/src/main/resources/application-local.yaml`
- 프로덕션 설정: `backend/src/main/resources/application-prod.yaml`
- 테스트 설정: `backend/src/test/resources/application-test.yaml`
- local 실행 전 root `.env`를 읽어 아래 값을 주입합니다.
  - `LOCAL_DB_PASSWORD`
  - `LOCAL_JWT_SECRET`

프로덕션 기준 주요 값:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `cors.allowed-origins`
- `jwt.refresh-expiration`
	- `application-prod.yaml` 기준 추가 정리 필요

### React

- API base URL: `VITE_API_BASE_URL`
	- 미설정 시 기본값은 `http://localhost:8080`

## 기타 참고 사항

- 백엔드 API 문서는 Spring REST Docs + Asciidoctor 기반으로 생성됩니다.
- 현재 루트 `README.md`를 단일 문서 진입점으로 사용합니다.
- 일정표, 내부 일정표, 개발일지, 트러블슈팅 문서는 보조 문서로 유지합니다.
