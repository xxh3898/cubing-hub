# Development Log - 2026-03-31

프로젝트: Cubing Hub

---

## 오늘 작업

- WCA 공식 종목별 스크램블 생성 기능 구현
- 큐브 기록 저장 및 개인 최고 기록(PB) 관리 서비스 구축
- Spring REST Docs를 이용한 API 문서화 자동화

---

## 구현 기능

- **스크램블 생성기**: 2x2x2 및 3x3x3 종목에 대해 랜덤 스크램블을 생성하는 유틸리티 클래스 구현
- **기록 저장**: 사용자의 큐브 측정 기록을 저장하고, 해당 기록이 기존 PB보다 빠를 경우 자동으로 PB를 갱신하는 로직 개발
- **API 문서화**: `RestDocsBaseTest`를 기반으로 기록 저장 API의 명세서를 자동으로 생성하도록 설정

---

## 사용 기술

- Java 17, Spring Boot 3.x
- Spring Data JPA
- Spring REST Docs
- JUnit 5, AssertJ, MockMvc

---

## 코드

```java
@Transactional
public Long saveRecord(String email, RecordSaveRequest request) {
    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

    Record record = Record.builder()
            .user(user)
            .eventType(request.getEventType())
            .timeMs(request.getTimeMs())
            .penalty(request.getPenalty())
            .scramble(request.getScramble())
            .build();

    Record savedRecord = recordRepository.save(record);

    if (request.getPenalty() != Penalty.DNF) {
        updateUserPB(user, savedRecord);
    }

    return savedRecord.getId();
}
```

---

## 문제

- 스크램블 생성 시 동일한 면의 회전이 연속되거나, 같은 축의 회전이 3회 이상 발생하는 문제를 방지하기 위해 중복 검사 로직 적용 필요 (해결됨)

---

## 다음 작업

- 4x4x4, 5x5x5 등 더 다양한 WCA 종목의 스크램블 지원 확장
- 기록 목록 조회 및 통계(Ao5, Ao12 등) 기능 구현