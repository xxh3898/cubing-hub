# Development Log - 2026-03-29

프로젝트: Cubing Hub

---

## 오늘 작업

- Spring REST Docs 인프라 구축 및 자동화 설정
- Gradle 빌드 스크립트 최적화 (문서 생성 및 복사 태스크 연동)
- GitHub Actions CI 워크플로우 검증 및 오류 수정
- 1주 차 인프라 구축 마일스톤 완료 및 정리

---

## 구현 기능

- **API 문서 자동화**: `./gradlew build` 시 Asciidoctor를 통해 HTML 문서를 생성하고 소스 폴더(`static/docs`)로 자동 복사하는 기능을 구현했습니다.
- **CI 빌드 안정화**: GitHub Actions 환경에서 발생하던 태스크 의존성 충돌 문제를 해결했습니다.

---

## 사용 기술

- Spring REST Docs
- Asciidoctor
- Gradle (Kotlin/Groovy DSL)
- GitHub Actions

---

## 코드

```gradle
tasks.register('copyDocument', Copy) {
	dependsOn asciidoctor
	from file("build/docs/asciidoc")
	into file("src/main/resources/static/docs")
}

tasks.named('build') {
	dependsOn copyDocument
}
```

---

## 문제

- **태스크 병렬성 이슈**: 로컬에서는 성공하던 빌드가 CI 환경에서 `:copyDocument` 태스크 순서 문제로 인해 간헐적으로 실패하는 현상이 발생했습니다. (임시 해결 후 다음 날 근본 원인 해결 예정)

---

## 다음 작업

- 인증(Auth) 도메인 아키텍처 설계 및 구현
- JWT 기반 보안 인프라 구축