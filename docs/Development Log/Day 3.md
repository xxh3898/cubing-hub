# Development Log - 2026-03-25

프로젝트: Cubing Hub

---

## 오늘 작업

- Spring Rest Docs를 이용한 API 자동 문서화 파이프라인 구축
- GitHub Actions를 이용한 CI 워크플로우 생성 (Testcontainers 연동)
- 모노레포 구조에 최적화된 CI 수행 전략 수립 (paths 필터)

---

## 구현 기능

- **RestDocsConfig 설정**: `prettyPrint()` 전처리를 통해 생성되는 JSON 스니펫의 가독성을 확보하고 커스텀 설정을 통합
- **문서화 기반 테스트**: `RestDocsBaseTest` 추상 클래스를 통해 `MockMvc`와 Rest Docs 설정을 캡슐화하여 테스트 코드 중복 제거
- **API 명세 자동화**: `HealthCheckDocsTest` 성공 시 `build/generated-snippets`에 관련 스니펫이 자동 생성되도록 연동
- **CI 파이프라인 구축**: GitHub Actions에서 Testcontainers(MySQL, Redis)를 띄워 백엔드 통합 테스트를 자동으로 수행하는 워크플로우(`ci.yml`) 작성
- **모노레포 빌드 최적화**: `backend/` 폴더 또는 CI 설정 파일 변경 시에만 고비용의 백엔드 CI가 실행되도록 `paths` 필터 적용

---

## 사용 기술

- Java 17, Spring Boot 3.5.12
- Spring Rest Docs, Asciidoctor
- GitHub Actions (CI)
- Testcontainers (MySQL, Redis)
- MockMvc, JUnit 5

---

## 코드

```yaml
# .github/workflows/ci.yml (모노레포 최적화 설정)
on:
  push:
    branches: [ "main", "feat/*", "test/*", "ci/*" ]
    paths:
      - 'backend/**'              # 백엔드 코드 변경 시에만 실행
      - '.github/workflows/ci.yml' # CI 설정 변경 시 실행
```

---

## 문제

- **Snippet File Not Found**: `index.adoc`이 `src/docs/asciidoc` 경로가 아닌 곳에 위치하여 빌드 시 스니펫을 찾지 못하는 이슈 발생. 표준 경로로 이동하여 해결.
- **Unnecessary CI Builds**: 프론트엔드나 단순 문서 수정 시에도 백엔드 테스트가 돌아가는 자원 낭비 발견. `paths` 필터를 사용하여 백엔드 관련 변경 시에만 트리거되도록 수정.

---

## 다음 작업

- Day 4: Week 2 일정 진입 - 인증/인가(V1) API 개발 착수
- 로그인/회원가입 기능 구현 및 통합 테스트 + 문서화 추진