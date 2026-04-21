package com.cubinghub.domain.record.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RankingRedisRepository;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import java.time.LocalDateTime;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

@DisplayName("RankingRedisBackfillService 통합 테스트")
class RankingRedisBackfillServiceIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private RankingRedisBackfillService rankingRedisBackfillService;

    @Autowired
    private RankingRedisRepository rankingRedisRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserPBRepository userPBRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @AfterEach
    void tearDown() {
        var keys = redisTemplate.keys("ranking:v2:*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }

    @Test
    @DisplayName("재구축은 MySQL user_pbs 기준으로 Redis 랭킹과 ready marker를 생성한다")
    void should_rebuild_redis_rankings_from_user_pbs() {
        User alpha = saveUser("alpha@test.com", "Alpha");
        User beta = saveUser("beta@test.com", "Beta");

        Record alphaRecord = saveRecord(alpha, EventType.WCA_333, 9800, Penalty.NONE, "alpha");
        Record betaRecord = saveRecord(beta, EventType.WCA_333, 9800, Penalty.NONE, "beta");
        updateRecordCreatedAt(alphaRecord.getId(), LocalDateTime.of(2026, 4, 21, 10, 0, 0));
        updateRecordCreatedAt(betaRecord.getId(), LocalDateTime.of(2026, 4, 21, 10, 1, 0));

        saveUserPb(alpha, EventType.WCA_333, 9800, alphaRecord);
        saveUserPb(beta, EventType.WCA_333, 9800, betaRecord);

        rankingRedisBackfillService.rebuild(EventType.WCA_333);

        Page<RankingRedisEntry> rankings = rankingRedisRepository.readPage(EventType.WCA_333, PageRequest.of(0, 25));

        assertThat(rankingRedisRepository.isReady(EventType.WCA_333)).isTrue();
        assertThat(rankings.getContent()).extracting(RankingRedisEntry::getNickname)
                .containsExactly("Alpha", "Beta");
        assertThat(rankings.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("재구축은 데이터가 없어도 ready marker를 남기고 빈 랭킹으로 종료한다")
    void should_mark_ready_even_when_no_rankings_exist() {
        rankingRedisBackfillService.rebuild(EventType.WCA_222);

        Page<RankingRedisEntry> rankings = rankingRedisRepository.readPage(EventType.WCA_222, PageRequest.of(0, 25));

        assertThat(rankingRedisRepository.isReady(EventType.WCA_222)).isTrue();
        assertThat(rankings.getContent()).isEmpty();
        assertThat(rankings.getTotalElements()).isZero();
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

    private void updateRecordCreatedAt(Long recordId, LocalDateTime createdAt) {
        jdbcTemplate.update(
                "UPDATE records SET created_at = ?, updated_at = ? WHERE id = ?",
                createdAt,
                createdAt,
                recordId
        );
    }
}
