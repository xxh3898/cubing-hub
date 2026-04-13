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
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@DisplayName("RecordRepository 랭킹 통합 테스트")
class RecordRepositoryRankingIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("랭킹 조회는 같은 종목의 DNF가 아닌 기록만 빠른 순서로 반환한다")
    void should_return_non_dnf_rankings_sorted_by_time_when_event_type_matches() {
        User alpha = saveUser("alpha@test.com", "Alpha");
        User beta = saveUser("beta@test.com", "Beta");
        User gamma = saveUser("gamma@test.com", "Gamma");

        saveRecord(alpha, EventType.WCA_333, 12000, Penalty.NONE, "scramble-a");
        saveRecord(beta, EventType.WCA_333, 9800, Penalty.NONE, "scramble-b");
        saveRecord(gamma, EventType.WCA_333, 9000, Penalty.DNF, "scramble-c");
        saveRecord(gamma, EventType.WCA_222, 7000, Penalty.NONE, "scramble-d");

        List<RankingQueryResult> result = recordRepository.findTop100RankingsByEventType(EventType.WCA_333);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(RankingQueryResult::getNickname).containsExactly("Beta", "Alpha");
        assertThat(result).extracting(RankingQueryResult::getTimeMs).containsExactly(9800, 12000);
    }

    @Test
    @DisplayName("동일 기록이면 createdAt 오름차순, 같은 시각이면 ID 오름차순으로 정렬한다")
    void should_order_rankings_by_created_at_and_id_when_times_are_equal() {
        User first = saveUser("first@test.com", "First");
        User second = saveUser("second@test.com", "Second");
        User third = saveUser("third@test.com", "Third");

        Record firstRecord = saveRecord(first, EventType.WCA_333, 10000, Penalty.NONE, "scramble-1");
        Record secondRecord = saveRecord(second, EventType.WCA_333, 10000, Penalty.NONE, "scramble-2");
        Record thirdRecord = saveRecord(third, EventType.WCA_333, 10000, Penalty.NONE, "scramble-3");

        LocalDateTime baseTime = LocalDateTime.of(2026, 4, 13, 11, 0, 0);
        updateRecordTimestamps(firstRecord.getId(), baseTime);
        updateRecordTimestamps(secondRecord.getId(), baseTime.plusMinutes(1));
        updateRecordTimestamps(thirdRecord.getId(), baseTime);

        List<RankingQueryResult> result = recordRepository.findTop100RankingsByEventType(EventType.WCA_333);

        assertThat(result).extracting(RankingQueryResult::getNickname)
                .containsExactly("First", "Third", "Second");
    }

    @Test
    @DisplayName("랭킹 조회는 최대 100건까지만 반환한다")
    void should_limit_rankings_to_top_100_when_more_than_100_records_exist() {
        for (int i = 0; i < 101; i++) {
            User user = saveUser("ranker-" + i + "@test.com", "Ranker" + i);
            saveRecord(user, EventType.WCA_333, 10000 + i, Penalty.NONE, "scramble-" + i);
        }

        List<RankingQueryResult> result = recordRepository.findTop100RankingsByEventType(EventType.WCA_333);

        assertThat(result).hasSize(100);
        assertThat(result.get(0).getNickname()).isEqualTo("Ranker0");
        assertThat(result.get(99).getNickname()).isEqualTo("Ranker99");
        assertThat(result.get(99).getTimeMs()).isEqualTo(10099);
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

    private void updateRecordTimestamps(Long recordId, LocalDateTime createdAt) {
        entityManager.flush();
        jdbcTemplate.update(
                "UPDATE records SET created_at = ?, updated_at = ? WHERE id = ?",
                Timestamp.valueOf(createdAt),
                Timestamp.valueOf(createdAt),
                recordId
        );
        entityManager.clear();
    }
}
