# Cubing Hub 개발 일정 및 마감 로드맵

> 이 문서는 공개 일정/로드맵 보조 문서입니다.
> 정식 설계 문서는 [README](../README.md), [Project Overview](./Project%20Overview.md), [System Architecture](./System%20Architecture.md), [Deployment & Infrastructure Design](./Deployment%20%26%20Infrastructure%20Design.md)를 참고하세요.

```mermaid
gantt
    title Cubing Hub Development Schedule
    dateFormat  YYYY-MM-DD
    section Completed
    Infra & CI Baseline               :done, 2026-03-23, 7d
    Core API V1                       :done, 2026-03-30, 5d
    Frontend Mock Baseline            :done, 2026-04-04, 1d
    Auth Integration                  :done, 2026-04-13, 1d

    section Finish Track
    Ranking Finish                    :done, 2026-04-14, 1d
    Core Feature Completion           :done, 2026-04-15, 1d
    V1 Close Check & Stabilization    :2026-04-16, 1d
    Tests + Docs + Bug Fix            :2026-04-17, 1d
    Ranking V2 Refactor               :2026-04-18, 1d
    Deploy + Project Closeout         :2026-04-19, 1d
```

## Week 1: 인프라 기반 구축

**Day 1 (월, 2026-03-23): 프로젝트 초기화 및 기본 구조 설정**
- [X] 프로젝트 스캐폴딩과 브랜치 기준선 정리
- [X] 프로필 분리와 프런트/백 기본 통신 확인

**Day 2 (화, 2026-03-24): Testcontainers 기반 통합 테스트 환경**
- [X] MySQL, Redis 컨테이너 테스트 기반 구축
- [X] 통합 테스트 컨텍스트 정상 구동 확인

**Day 3 (수, 2026-03-25): REST Docs 및 CI 초안**
- [X] 문서 자동화 설정
- [X] GitHub Actions 기반 테스트 검증 흐름 구성

**Day 4 (목, 2026-03-26): 모니터링 로컬 환경**
- [X] Prometheus, Grafana 로컬 구성
- [X] Actuator 지표 수집 확인

**Day 5 (금, 2026-03-27): 도메인 및 영속성 기준선**
- [X] 핵심 엔티티와 연관관계 매핑
- [X] QueryDSL 및 DDL 기준선 확인

**Day 6 (토, 2026-03-28): 보안 및 인증 뼈대**
- [X] Stateless Security 필터 체인 구성
- [X] JWT 및 Redis 기반 토큰 관리 기반 구축

**Day 7 (일, 2026-03-29): 1주 차 점검**
- [X] 지연 작업 보완
- [X] 로컬 전체 컨테이너 구동 확인

---

## Week 2: 코어 API V1 구축

**Day 8 (월, 2026-03-30): 인증 API 구현**
- [X] 회원가입/로그인 API와 테스트 작성
- [X] 인증 문서화 기준선 확보

**Day 9 (화, 2026-03-31): 기록 저장 API 구현**
- [X] 스크램블 생성과 기록 저장 API 구현
- [X] 기록 생성 테스트 작성

**Day 10 (수, 2026-04-01): 랭킹 V1 API 구현**
- [X] `GET /api/rankings` 구현
- [X] V1 기준 쿼리와 테스트 확보

**Day 11 (목, 2026-04-02): 게시글 CRUD 및 검색**
- [X] 게시글 CRUD와 검색 API 구현
- [X] 게시판 테스트 및 문서화

**Day 12 (금, 2026-04-03): 프런트 인증/타이머 연동 기반**
- [X] 인증 폼과 타이머 API 연동 기반 구축
- [X] 공통 API 클라이언트 및 인증 저장소 정리

**Day 13 (토, 2026-04-04): 프런트 목업 완성**
- [X] 주요 화면 목업 완료
- [X] 화면 기준 문서 동기화

---

## Rebaseline: 실연동 마감

**Day 14 (월, 2026-04-13): 인증 실연동 + Auth UX Hardening**
- [X] `GET /api/me`, 로그인/회원가입/로그아웃 실연동
- [X] 보호/guest-only 라우트, 로그인 후 복귀, `401 -> refresh -> retry` 정리
- [X] 인증 관련 수동 검증과 문서 동기화

**Day 15 (화, 2026-04-14): 보안 기본기/Auth 계약 정리 + 랭킹 종료**
- [X] secret/basic password 정리와 env 분리
- [X] `메모리 Access Token + HttpOnly Refresh Cookie` 반영
- [X] React auth 회귀 테스트 추가
- [X] JaCoCo 기반 테스트 커버리지 기준선 도입과 generated class 왜곡 보정
- [X] auth 예외 계약 일부 정리와 백엔드 인증 테스트 구조 보강
- [X] `refresh_token` 누락/재사용 감지 `401`을 포함한 auth 실패 응답과 generated REST Docs 정렬
- [X] 인증 관련 수동 검증과 문서 동기화
- [X] 랭킹 기준을 PB 기준과 서버 페이지네이션 계약으로 정리
- [X] 기록 penalty 수정/삭제와 마이페이지 기록 조회 API 추가
- [X] `RankingsPage`, `TimerPage`, `MyPage` 실연동과 프런트 테스트 보강
- [X] 랭킹/마이페이지 설계 문서와 일정 문서 동기화
- [X] 랭킹/기록 관리 수동 검증

**Day 16 (수, 2026-04-15): 핵심 기능 구현 완료**
- [X] 커뮤니티 목록/상세/작성/삭제 실연동
- [X] 댓글 API와 댓글 UI 실연동
- [X] 홈 대시보드, 피드백 실연동
- [X] 관련 문서 동기화와 자동 회귀 검증
- [X] 브라우저 수동 검증 완료

**Day 17 (목, 2026-04-16): V1 마감 점검 및 안정화**
- [ ] 누락 validation/auth/권한 체크 보완
- [ ] 계약 충돌과 통합 버그 수정
- [ ] V1 범위 최종 확인과 마감 판단

**Day 18 (금, 2026-04-17): 테스트 + 문서 + CSS + 잔버그 정리**
- [ ] 핵심 테스트 보강
- [ ] 문서 동기화
- [ ] CSS 구조 정리와 잔버그 수정

**Day 19 (토, 2026-04-18): 랭킹 V2 리팩토링 + 배포 준비**
- [ ] Redis ZSET 랭킹 V2 리팩토링
- [ ] V1 대비 검증과 배포 준비

**Day 20 (일, 2026-04-19): 최종 배포 + 프로젝트 마감**
- [ ] 최종 배포와 스모크 테스트
- [ ] 최종 문서와 남은 리스크 정리
