# Development Log - 2026-04-01

프로젝트: Cubing Hub

---

## 오늘 작업

- 글로벌 랭킹 조회 API(`GET /api/rankings`) 구현
- QueryDSL 기반 종목별 랭킹 조회 로직 및 공개 접근 설정 반영
- 랭킹 조회 통합 테스트 및 Spring REST Docs 문서화 추가

---

## 구현 기능

- **글로벌 랭킹 API**: `records` 테이블을 기준으로 종목별 상위 100건을 조회하는 랭킹 API를 구현했습니다.
- **QueryDSL 조회 로직**: `eventType` 조건, `timeMs` 오름차순 정렬, `LIMIT 100`을 반영한 커스텀 조회 로직을 추가했습니다.
- **DNF 제외 처리**: 랭킹 의미를 유지하기 위해 `penalty != DNF` 조건을 적용하여 DNF 기록을 결과에서 제외했습니다.
- **공개 API 전환**: 프론트엔드 연동 편의를 위해 `/api/rankings`를 `permitAll`로 설정했습니다.
- **통합 테스트 및 문서화**: 랭킹 조회 동작을 검증하는 통합 테스트를 추가하고 `ranking/list` 스니펫을 REST Docs에 연결했습니다.

---

## 사용 기술

- Java 17, Spring Boot 3.x
- Spring Data JPA, QueryDSL
- Spring Security
- Spring REST Docs
- JUnit 5, MockMvc

---

## 코드

```java
public List<RankingQueryResult> findTop100RankingsByEventType(EventType eventType) {
    return queryFactory
            .select(Projections.constructor(
                    RankingQueryResult.class,
                    user.nickname,
                    record.eventType,
                    record.timeMs
            ))
            .from(record)
            .join(record.user, user)
            .where(
                    record.eventType.eq(eventType),
                    record.penalty.ne(Penalty.DNF)
            )
            .orderBy(
                    record.timeMs.asc(),
                    record.createdAt.asc(),
                    record.id.asc()
            )
            .limit(100)
            .fetch();
}
```

---

## 문제

- **문제**: 글로벌 랭킹 조회 시 `DNF` 기록이 일반 기록과 함께 포함되면 순위 의미가 왜곡될 수 있었음
- **해결**: QueryDSL 조회 조건에 `penalty != DNF`를 추가하여 유효한 기록만 랭킹에 반영되도록 처리함

---

## 다음 작업

- 게시판 CRUD 및 QueryDSL 기반 동적 검색 API 구현
- 프론트엔드에서 랭킹 API 연동 및 테이블 UI 렌더링
- 이후 Redis ZSET 기반 랭킹 최적화를 위한 부하 테스트 준비
