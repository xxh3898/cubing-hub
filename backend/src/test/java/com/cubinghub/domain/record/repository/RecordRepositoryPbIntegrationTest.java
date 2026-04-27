package com.cubinghub.domain.record.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@DisplayName("RecordRepository PB 통합 테스트")
class RecordRepositoryPbIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("사용자의 대표 기록 조회는 PLUS_TWO를 반영한 가장 빠른 기록을 반환한다")
    void should_return_best_record_when_plus_two_penalty_is_applied() {
        User user = saveUser("tester@test.com", "Tester");

        saveRecord(user, EventType.WCA_333, 10000, Penalty.NONE, "base");
        saveRecord(user, EventType.WCA_333, 9500, Penalty.PLUS_TWO, "plus-two");
        Record bestRecord = saveRecord(user, EventType.WCA_333, 9800, Penalty.NONE, "best");

        Optional<Record> result = recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333);

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getId()).isEqualTo(bestRecord.getId());
        assertThat(result.orElseThrow().getEffectiveTimeMs()).isEqualTo(9800);
    }

    @Test
    @DisplayName("대표 기록 조회는 유효 시간이 같으면 더 먼저 기록한 기록을 반환한다")
    void should_return_earlier_record_when_effective_times_are_equal() {
        User user = saveUser("equal@test.com", "Equal");

        Record firstRecord = saveRecord(user, EventType.WCA_333, 10000, Penalty.PLUS_TWO, "first");
        Record secondRecord = saveRecord(user, EventType.WCA_333, 12000, Penalty.NONE, "second");

        Instant baseTime = Instant.parse("2026-04-14T10:00:00Z");
        updateRecordTimestamps(firstRecord.getId(), baseTime);
        updateRecordTimestamps(secondRecord.getId(), baseTime.plusSeconds(60));

        Optional<Record> result = recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333);

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getId()).isEqualTo(firstRecord.getId());
    }

    @Test
    @DisplayName("대표 기록 조회는 모든 기록이 DNF이면 비어 있다")
    void should_return_empty_when_all_records_are_dnf() {
        User user = saveUser("dnf@test.com", "Dnf");

        saveRecord(user, EventType.WCA_333, 10000, Penalty.DNF, "dnf");

        Optional<Record> result = recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("대표 기록 조회는 유효한 기록이 하나도 없으면 비어 있다")
    void should_return_empty_when_user_has_no_records() {
        User user = saveUser("empty@test.com", "Empty");

        Optional<Record> result = recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333);

        assertThat(result).isEmpty();
    }

    private User saveUser(String email, String nickname) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
    }

    private Record saveRecord(User user, EventType eventType, int timeMs, Penalty penalty, String scramble) {
        return recordRepository.save(Record.builder()
                .user(user)
                .eventType(eventType)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble(scramble)
                .build());
    }

    private void updateRecordTimestamps(Long recordId, Instant createdAt) {
        entityManager.flush();
        jdbcTemplate.update(
                "UPDATE records SET created_at = ?, updated_at = ? WHERE id = ?",
                Timestamp.from(createdAt),
                Timestamp.from(createdAt),
                recordId
        );
        entityManager.clear();
    }
}
