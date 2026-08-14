package com.cubinghub.domain.growth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.growth.dto.response.GrowthPbProgressionPageResponse;
import com.cubinghub.domain.growth.repository.GrowthReadRepository;
import com.cubinghub.domain.growth.repository.GrowthReadRepository.DailyAggregate;
import com.cubinghub.domain.growth.service.GrowthReadService;
import com.cubinghub.domain.record.dto.request.RecordPenaltyUpdateRequest;
import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.dto.response.RecordCreateResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.record.service.RecordService;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@Import(GrowthReadApiIntegrationTest.FixedClockConfiguration.class)
@DisplayName("Growth read API MySQL 통합 테스트")
class GrowthReadApiIntegrationTest extends JpaIntegrationTest {

    private static final Instant GENERATED_AT = Instant.parse("2026-08-11T15:01:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserPBRepository userPBRepository;

    @Autowired
    private GrowthReadRepository growthReadRepository;

    @Autowired
    private GrowthReadService growthReadService;

    @Autowired
    private RecordService recordService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    private User owner;
    private String ownerToken;

    @BeforeEach
    void setUp() {
        owner = saveUser("owner@cubinghub.com", "Owner");
        ownerToken = TestFixtures.generateAccessToken(jwtTokenProvider, owner);
    }

    @Test
    @DisplayName("summary는 owner의 empty history를 NO_DATA와 fixed activity response로 반환한다")
    void should_return_no_data_summary_when_owner_has_no_records() throws Exception {
        User otherUser = saveUser("other@cubinghub.com", "Other");
        saveRecord(otherUser, 15000, Penalty.NONE, Instant.parse("2026-08-10T00:00:00Z"));

        mockMvc.perform(get("/api/users/me/growth")
                        .header("Authorization", "Bearer " + ownerToken)
                        .param("eventType", EventType.WCA_333.name())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.eventType").value("WCA_333"))
                .andExpect(jsonPath("$.data.timeZone").value("Asia/Seoul"))
                .andExpect(jsonPath("$.data.generatedAt").value("2026-08-11T15:01:00Z"))
                .andExpect(jsonPath("$.data.asOfDate").value("2026-08-12"))
                .andExpect(jsonPath("$.data.currentPb.status").value("NO_DATA"))
                .andExpect(jsonPath("$.data.currentPb.recordId").value(nullValue()))
                .andExpect(jsonPath("$.data.recentAo5.status").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.data.recentAo12.status").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.data.activity.totalSolveCount").value(0))
                .andExpect(jsonPath("$.data.activity.firstRecordedAt").value(nullValue()))
                .andExpect(jsonPath("$.data.scramble").doesNotExist())
                .andExpect(jsonPath("$.data.inputMethod").doesNotExist());
    }

    @Test
    @DisplayName("summary activity는 오늘 포함 7일과 바로 앞 7일을 KST boundary로 집계한다")
    void should_count_consecutive_current_and_previous_activity_windows_at_kst_boundaries() throws Exception {
        saveRecord(owner, 24000, Penalty.NONE, Instant.parse("2026-07-29T14:59:59Z"));
        saveRecord(owner, 23000, Penalty.NONE, Instant.parse("2026-07-29T15:00:00Z"));
        saveRecord(owner, 22000, Penalty.NONE, Instant.parse("2026-08-04T15:00:00Z"));
        saveRecord(owner, 21000, Penalty.NONE, Instant.parse("2026-08-05T14:59:59Z"));
        saveRecord(owner, 20000, Penalty.NONE, Instant.parse("2026-08-05T15:00:00Z"));
        saveRecord(owner, 19000, Penalty.NONE, Instant.parse("2026-08-11T15:00:30Z"));

        mockMvc.perform(get("/api/users/me/growth")
                        .header("Authorization", "Bearer " + ownerToken)
                        .param("eventType", EventType.WCA_333.name())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.asOfDate").value("2026-08-12"))
                .andExpect(jsonPath("$.data.activity.totalSolveCount").value(6))
                .andExpect(jsonPath("$.data.activity.last7DaysSolveCount").value(2))
                .andExpect(jsonPath("$.data.activity.previous7DaysSolveCount").value(3))
                .andExpect(jsonPath("$.data.activity.last30DaysSolveCount").value(6));
    }

    @Test
    @DisplayName("trend는 30개의 KST date point에서 missing day와 DNF-only day를 구분한다")
    void should_return_fixed_trend_points_when_days_are_missing_or_dnf_only() throws Exception {
        saveRecord(owner, 10000, Penalty.NONE, Instant.parse("2026-08-09T15:30:00Z"));
        saveRecord(owner, 12000, Penalty.DNF, Instant.parse("2026-08-10T15:30:00Z"));

        mockMvc.perform(get("/api/users/me/growth/trend")
                        .header("Authorization", "Bearer " + ownerToken)
                        .param("eventType", EventType.WCA_333.name())
                        .param("period", "30D")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.period").value("30D"))
                .andExpect(jsonPath("$.data.timeZone").value("Asia/Seoul"))
                .andExpect(jsonPath("$.data.fromDate").value("2026-07-14"))
                .andExpect(jsonPath("$.data.toDate").value("2026-08-12"))
                .andExpect(jsonPath("$.data.todayPartial").value(true))
                .andExpect(jsonPath("$.data.points.length()").value(30))
                .andExpect(jsonPath("$.data.points[0].date").value("2026-07-14"))
                .andExpect(jsonPath("$.data.points[0].recordCount").value(0))
                .andExpect(jsonPath("$.data.points[0].medianTimeMs").value(nullValue()))
                .andExpect(jsonPath("$.data.points[27].date").value("2026-08-10"))
                .andExpect(jsonPath("$.data.points[27].recordCount").value(1))
                .andExpect(jsonPath("$.data.points[27].medianTimeMs").value(10000))
                .andExpect(jsonPath("$.data.points[28].date").value("2026-08-11"))
                .andExpect(jsonPath("$.data.points[28].recordCount").value(1))
                .andExpect(jsonPath("$.data.points[28].rankableCount").value(0))
                .andExpect(jsonPath("$.data.points[28].medianTimeMs").value(nullValue()))
                .andExpect(jsonPath("$.data.points[28].dnfCount").value(1));
    }

    @Test
    @DisplayName("daily aggregate는 KST boundary와 PLUS_TWO effective median을 MySQL에서 계산한다")
    void should_calculate_daily_median_with_kst_boundary_and_plus_two_in_mysql() {
        saveRecord(owner, 9000, Penalty.NONE, Instant.parse("2026-08-10T14:59:59Z"));
        saveRecord(owner, 10000, Penalty.NONE, Instant.parse("2026-08-10T15:00:00Z"));
        saveRecord(owner, 9000, Penalty.PLUS_TWO, Instant.parse("2026-08-10T15:01:00Z"));
        saveRecord(owner, 13000, Penalty.DNF, Instant.parse("2026-08-10T15:02:00Z"));

        List<DailyAggregate> aggregates = growthReadRepository.findDailyAggregates(
                owner.getId(),
                EventType.WCA_333,
                Instant.parse("2026-08-10T15:00:00Z"),
                Instant.parse("2026-08-11T15:00:00Z")
        );

        assertThat(aggregates).containsExactly(new DailyAggregate(
                java.time.LocalDate.parse("2026-08-11"),
                3,
                2,
                10500,
                1,
                1
        ));
    }

    @Test
    @DisplayName("PB progression은 same timestamp id ordering과 tie를 current record state로 처리한다")
    void should_return_descending_pb_points_when_records_share_timestamp_and_tie() {
        Instant sameTimestamp = Instant.parse("2026-08-01T00:00:00Z");
        Record first = saveRecord(owner, 24000, Penalty.NONE, sameTimestamp);
        Record second = saveRecord(owner, 22000, Penalty.NONE, sameTimestamp);
        saveRecord(owner, 22000, Penalty.NONE, sameTimestamp);
        Record plusTwo = saveRecord(owner, 19000, Penalty.PLUS_TWO, sameTimestamp);
        saveRecord(owner, 18000, Penalty.DNF, sameTimestamp);

        GrowthReadRepository.PbProgressionPage result = growthReadRepository.findPbProgression(
                owner.getId(),
                EventType.WCA_333,
                1,
                50
        );

        assertThat(result.content())
                .extracting(GrowthReadRepository.PbProgressionRecord::recordId)
                .containsExactly(plusTwo.getId(), second.getId(), first.getId());
        assertThat(result.content())
                .extracting(GrowthReadRepository.PbProgressionRecord::effectiveTimeMs)
                .containsExactly(21000, 22000, 24000);
    }

    @Test
    @DisplayName("penalty PATCH와 delete 뒤 progression final point는 current user PB와 일치한다")
    void should_recalculate_pb_progression_after_penalty_update_and_delete() {
        RecordCreateResponse first = createRecord(20000, Penalty.NONE);
        RecordCreateResponse second = createRecord(18000, Penalty.NONE);
        RecordCreateResponse third = createRecord(19000, Penalty.NONE);
        setRecordTimestamp(first.getId(), Instant.parse("2026-08-01T00:00:00Z"));
        setRecordTimestamp(second.getId(), Instant.parse("2026-08-01T00:01:00Z"));
        setRecordTimestamp(third.getId(), Instant.parse("2026-08-01T00:02:00Z"));

        recordService.updateRecordPenalty(second.getId(), owner.getEmail(), new RecordPenaltyUpdateRequest(Penalty.DNF));
        assertProgressionFinalPointMatchesCurrentPb(third.getId());

        recordService.deleteRecord(third.getId(), owner.getEmail());
        assertProgressionFinalPointMatchesCurrentPb(first.getId());
    }

    @Test
    @DisplayName("known unsupported event와 invalid trend period는 400을 반환한다")
    void should_return_bad_request_when_event_or_period_is_not_supported() throws Exception {
        mockMvc.perform(get("/api/users/me/growth")
                        .header("Authorization", "Bearer " + ownerToken)
                        .param("eventType", EventType.WCA_222.name()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("지원하지 않는 Practice 종목입니다."));

        mockMvc.perform(get("/api/users/me/growth/trend")
                        .header("Authorization", "Bearer " + ownerToken)
                        .param("eventType", EventType.WCA_333.name())
                        .param("period", "90D"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("지원하지 않는 Growth 기간입니다."));
    }

    @Test
    @DisplayName("Growth endpoint는 인증되지 않은 요청을 current 401 contract로 거절한다")
    void should_return_unauthorized_when_growth_request_has_no_access_token() throws Exception {
        mockMvc.perform(get("/api/users/me/growth")
                        .param("eventType", EventType.WCA_333.name()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    private User saveUser(String email, String nickname) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("WCA_333")
                .build());
    }

    private Record saveRecord(User user, int timeMs, Penalty penalty, Instant createdAt) {
        User managedUser = userRepository.findById(user.getId()).orElseThrow();
        Record record = recordRepository.saveAndFlush(Record.builder()
                .user(managedUser)
                .eventType(EventType.WCA_333)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble("growth-test-scramble")
                .build());
        setRecordTimestamp(record.getId(), createdAt);
        return recordRepository.findById(record.getId()).orElseThrow();
    }

    private RecordCreateResponse createRecord(int timeMs, Penalty penalty) {
        return recordService.createRecord(
                owner.getEmail(),
                RecordSaveRequest.builder()
                        .eventType(EventType.WCA_333)
                        .timeMs(timeMs)
                        .penalty(penalty)
                        .scramble("growth-mutation-scramble")
                        .build(),
                null,
                null
        );
    }

    private void setRecordTimestamp(Long recordId, Instant createdAt) {
        recordRepository.flush();
        jdbcTemplate.update(
                "UPDATE records SET created_at = ?, updated_at = ? WHERE id = ?",
                Timestamp.from(createdAt),
                Timestamp.from(createdAt),
                recordId
        );
        entityManager.clear();
    }

    private void assertProgressionFinalPointMatchesCurrentPb(Long expectedRecordId) {
        GrowthPbProgressionPageResponse progression = growthReadService.getPbProgression(
                owner.getEmail(),
                EventType.WCA_333,
                1,
                50
        );
        User managedOwner = userRepository.findById(owner.getId()).orElseThrow();
        UserPB currentPb = userPBRepository.findByUserAndEventType(managedOwner, EventType.WCA_333).orElseThrow();

        assertThat(currentPb.getRecord().getId()).isEqualTo(expectedRecordId);
        assertThat(progression.content()).isNotEmpty();
        assertThat(progression.content().get(0).recordId()).isEqualTo(currentPb.getRecord().getId());
        assertThat(progression.content().get(0).effectiveTimeMs()).isEqualTo(currentPb.getBestTimeMs());
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(GENERATED_AT, ZoneOffset.UTC);
        }
    }
}
