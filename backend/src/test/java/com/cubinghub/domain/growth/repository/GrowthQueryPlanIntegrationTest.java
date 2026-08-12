package com.cubinghub.domain.growth.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

@DisplayName("Growth query plan MySQL 통합 테스트")
class GrowthQueryPlanIntegrationTest extends JpaIntegrationTest {

    private static final Instant TREND_FROM = Instant.parse("2026-07-13T15:00:00Z");
    private static final Instant TREND_TO = Instant.parse("2026-08-12T15:00:00Z");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GrowthReadRepository growthReadRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    @Test
    @DisplayName("10,000-record user/event fixture에서 recent, trend, progression query를 EXPLAIN ANALYZE로 실행한다")
    void should_execute_growth_queries_with_mysql_explain_analyze_for_ten_thousand_records() {
        User user = userRepository.save(User.builder()
                .email("growth-plan@cubinghub.com")
                .password("password")
                .nickname("GrowthPlan")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("WCA_333")
                .build());
        insertTenThousandRecords(user.getId());
        jdbcTemplate.execute("ANALYZE TABLE records");

        MapSqlParameterSource latestParameters = new MapSqlParameterSource(Map.of(
                "userId", user.getId(),
                "eventType", EventType.WCA_333.name(),
                "limit", 24
        ));
        MapSqlParameterSource trendParameters = new MapSqlParameterSource()
                .addValue("userId", user.getId())
                .addValue("eventType", EventType.WCA_333.name())
                .addValue("fromUtc", Timestamp.from(TREND_FROM))
                .addValue("toUtc", Timestamp.from(TREND_TO));
        MapSqlParameterSource progressionParameters = new MapSqlParameterSource(Map.of(
                "userId", user.getId(),
                "eventType", EventType.WCA_333.name(),
                "limit", 50,
                "offset", 0L
        ));

        List<String> latestPlan = explainAnalyze(GrowthReadRepository.LATEST_RECORDS_QUERY, latestParameters);
        List<String> trendPlan = explainAnalyze(GrowthReadRepository.DAILY_AGGREGATE_QUERY, trendParameters);
        List<String> progressionPlan = explainAnalyze(
                GrowthReadRepository.PB_PROGRESSION_POINTS_QUERY,
                progressionParameters
        );

        assertThat(String.join("\n", latestPlan)).contains("idx_record_user_event_created_at_id");
        assertThat(String.join("\n", progressionPlan)).contains("idx_record_user_event_created_at_id");
        assertThat(trendPlan).isNotEmpty();
        assertThat(growthReadRepository.findRecentRecords(user.getId(), EventType.WCA_333, 24)).hasSize(24);
        assertThat(growthReadRepository.findDailyAggregates(
                user.getId(),
                EventType.WCA_333,
                TREND_FROM,
                TREND_TO
        )).isNotEmpty();
        assertThat(growthReadRepository.findPbProgression(user.getId(), EventType.WCA_333, 1, 50).content())
                .isNotEmpty()
                .hasSizeLessThanOrEqualTo(50);
    }

    private void insertTenThousandRecords(Long userId) {
        jdbcTemplate.execute("SET SESSION cte_max_recursion_depth = 10000");
        jdbcTemplate.update("""
                INSERT INTO records (
                    user_id, event_type, time_ms, penalty, scramble, created_at, updated_at
                )
                WITH RECURSIVE sequence_number (value) AS (
                    SELECT 1
                    UNION ALL
                    SELECT value + 1 FROM sequence_number WHERE value < 10000
                )
                SELECT
                    ?,
                    'WCA_333',
                    10000 + MOD(value, 3000),
                    CASE
                        WHEN MOD(value, 17) = 0 THEN 'DNF'
                        WHEN MOD(value, 11) = 0 THEN 'PLUS_TWO'
                        ELSE 'NONE'
                    END,
                    'growth-query-plan-fixture',
                    TIMESTAMPADD(MINUTE, value, '2026-08-01 00:00:00'),
                    TIMESTAMPADD(MINUTE, value, '2026-08-01 00:00:00')
                FROM sequence_number
                """, userId);
    }

    private List<String> explainAnalyze(String query, MapSqlParameterSource parameters) {
        return namedParameterJdbcTemplate.query(
                "EXPLAIN ANALYZE " + query,
                parameters,
                (resultSet, rowNumber) -> resultSet.getString(1)
        );
    }
}
