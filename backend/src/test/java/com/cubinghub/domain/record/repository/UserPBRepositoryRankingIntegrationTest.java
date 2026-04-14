package com.cubinghub.domain.record.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;

@DisplayName("UserPBRepository 랭킹 통합 테스트")
class UserPBRepositoryRankingIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private UserPBRepository userPBRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("랭킹 조회는 user_pbs 기준으로 사용자당 하나의 PB만 빠른 순서로 반환한다")
    void should_return_pb_rankings_sorted_by_best_time_when_event_type_matches() {
        User alpha = saveUser("alpha@test.com", "Alpha");
        User beta = saveUser("beta@test.com", "Beta");
        User gamma = saveUser("gamma@test.com", "Gamma");

        saveRecord(alpha, EventType.WCA_333, 9800, Penalty.NONE, "alpha-history");
        Record alphaPbRecord = saveRecord(alpha, EventType.WCA_333, 9500, Penalty.PLUS_TWO, "alpha-pb");
        Record betaPbRecord = saveRecord(beta, EventType.WCA_333, 9800, Penalty.NONE, "beta-pb");
        Record gammaPbRecord = saveRecord(gamma, EventType.WCA_222, 7000, Penalty.NONE, "gamma-pb");

        saveUserPb(alpha, EventType.WCA_333, 11500, alphaPbRecord);
        saveUserPb(beta, EventType.WCA_333, 9800, betaPbRecord);
        saveUserPb(gamma, EventType.WCA_222, 7000, gammaPbRecord);

        Page<RankingQueryResult> result = userPBRepository.searchRankings(EventType.WCA_333, null, PageRequest.of(0, 25));

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent()).extracting(RankingQueryResult::getNickname).containsExactly("Beta", "Alpha");
        assertThat(result.getContent()).extracting(RankingQueryResult::getTimeMs).containsExactly(9800, 11500);
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("랭킹 조회는 닉네임 검색어를 대소문자 구분 없이 포함 검색한다")
    void should_filter_rankings_by_nickname_when_search_query_is_provided() {
        User alpha = saveUser("alpha@test.com", "AlphaCube");
        User beta = saveUser("beta@test.com", "Beta");

        saveUserPb(alpha, EventType.WCA_333, 9800, saveRecord(alpha, EventType.WCA_333, 9800, Penalty.NONE, "alpha"));
        saveUserPb(beta, EventType.WCA_333, 9900, saveRecord(beta, EventType.WCA_333, 9900, Penalty.NONE, "beta"));

        Page<RankingQueryResult> result = userPBRepository.searchRankings(EventType.WCA_333, "cube", PageRequest.of(0, 25));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getNickname()).isEqualTo("AlphaCube");
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("랭킹 조회는 페이지와 크기 기준으로 결과를 나눠 반환한다")
    void should_apply_pagination_when_page_and_size_are_provided() {
        for (int i = 0; i < 6; i++) {
            User user = saveUser("ranker-" + i + "@test.com", "Ranker" + i);
            Record record = saveRecord(user, EventType.WCA_333, 10000 + i, Penalty.NONE, "scramble-" + i);
            saveUserPb(user, EventType.WCA_333, 10000 + i, record);
        }

        Page<RankingQueryResult> result = userPBRepository.searchRankings(EventType.WCA_333, null, PageRequest.of(1, 2));

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent()).extracting(RankingQueryResult::getNickname).containsExactly("Ranker2", "Ranker3");
        assertThat(result.getTotalElements()).isEqualTo(6);
        assertThat(result.getTotalPages()).isEqualTo(3);
        assertThat(result.hasPrevious()).isTrue();
        assertThat(result.hasNext()).isTrue();
    }

    @Test
    @DisplayName("랭킹 조회는 같은 PB 시간이면 더 먼저 기록한 사용자를 우선한다")
    void should_order_rankings_by_record_created_at_and_id_when_best_times_are_equal() {
        User first = saveUser("first@test.com", "First");
        User second = saveUser("second@test.com", "Second");
        User third = saveUser("third@test.com", "Third");

        Record firstRecord = saveRecord(first, EventType.WCA_333, 12000, Penalty.NONE, "scramble-1");
        Record secondRecord = saveRecord(second, EventType.WCA_333, 12000, Penalty.NONE, "scramble-2");
        Record thirdRecord = saveRecord(third, EventType.WCA_333, 12000, Penalty.NONE, "scramble-3");

        LocalDateTime baseTime = LocalDateTime.of(2026, 4, 13, 11, 0, 0);
        updateRecordTimestamps(firstRecord.getId(), baseTime);
        updateRecordTimestamps(secondRecord.getId(), baseTime.plusMinutes(1));
        updateRecordTimestamps(thirdRecord.getId(), baseTime);

        saveUserPb(first, EventType.WCA_333, 12000, firstRecord);
        saveUserPb(second, EventType.WCA_333, 12000, secondRecord);
        saveUserPb(third, EventType.WCA_333, 12000, thirdRecord);

        Page<RankingQueryResult> result = userPBRepository.searchRankings(EventType.WCA_333, null, PageRequest.of(0, 25));

        assertThat(result.getContent()).extracting(RankingQueryResult::getNickname)
                .containsExactly("First", "Third", "Second");
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

    private void saveUserPb(User user, EventType eventType, int bestTimeMs, Record record) {
        userPBRepository.save(UserPB.builder()
                .user(user)
                .eventType(eventType)
                .bestTimeMs(bestTimeMs)
                .record(record)
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
