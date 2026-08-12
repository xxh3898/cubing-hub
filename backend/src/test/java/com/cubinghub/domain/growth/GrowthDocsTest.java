package com.cubinghub.domain.growth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.headers.HeaderDocumentation.requestHeaders;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.RestDocsIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

@Import(GrowthDocsTest.FixedClockConfiguration.class)
class GrowthDocsTest extends RestDocsIntegrationTest {

    private static final Instant GENERATED_AT = Instant.parse("2026-08-11T15:01:00Z");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserPBRepository userPBRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Growth summary의 available response를 문서화한다")
    void should_document_available_growth_summary_when_authorized() throws Exception {
        User user = saveUser("growth-summary@cubinghub.com", "GrowthSummary");
        createAvailableGrowthFixture(user);
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, user);

        mockMvc.perform(get("/api/users/me/growth")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("eventType", EventType.WCA_333.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentPb.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data.recentAo5.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data.recentAo12.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data.performanceComparison.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.data.consistency.status").value("AVAILABLE"))
                .andDo(document("growth/summary",
                        requestHeaders(
                                headerWithName("Authorization").description("Access Token을 담은 Bearer 인증 헤더")
                        ),
                        queryParameters(
                                parameterWithName("eventType").description("Growth를 조회할 Practice 종목 (V2.2는 WCA_333만 지원)")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("private Growth summary"),
                                fieldWithPath("data.eventType").type(JsonFieldType.STRING).description("조회한 Practice 종목"),
                                fieldWithPath("data.timeZone").type(JsonFieldType.STRING).description("Growth calendar timezone"),
                                fieldWithPath("data.generatedAt").type(JsonFieldType.STRING).description("같은 summary 계산에 사용한 UTC instant"),
                                fieldWithPath("data.asOfDate").type(JsonFieldType.STRING).description("Growth calendar 기준 Asia/Seoul 날짜"),
                                fieldWithPath("data.currentPb").type(JsonFieldType.OBJECT).description("current user_pbs PB projection"),
                                fieldWithPath("data.currentPb.status").type(JsonFieldType.STRING).description("PB status"),
                                fieldWithPath("data.currentPb.recordId").type(JsonFieldType.NUMBER).description("PB source Record ID"),
                                fieldWithPath("data.currentPb.timeMs").type(JsonFieldType.NUMBER).description("PB source raw time (ms)"),
                                fieldWithPath("data.currentPb.penalty").type(JsonFieldType.STRING).description("PB source current penalty"),
                                fieldWithPath("data.currentPb.effectiveTimeMs").type(JsonFieldType.NUMBER).description("PB effective time (ms)"),
                                fieldWithPath("data.currentPb.createdAt").type(JsonFieldType.STRING).description("PB source recorded UTC instant"),
                                fieldWithPath("data.recentAo5").type(JsonFieldType.OBJECT).description("latest 5 Record Ao"),
                                fieldWithPath("data.recentAo12").type(JsonFieldType.OBJECT).description("latest 12 Record Ao"),
                                fieldWithPath("data.recentAo5.status").type(JsonFieldType.STRING).description("Ao5 status"),
                                fieldWithPath("data.recentAo5.windowSize").type(JsonFieldType.NUMBER).description("Ao5 target window size"),
                                fieldWithPath("data.recentAo5.recordCount").type(JsonFieldType.NUMBER).description("Ao5 available Record count"),
                                fieldWithPath("data.recentAo5.valueMs").type(JsonFieldType.NUMBER).description("Ao5 value (ms)"),
                                fieldWithPath("data.recentAo12.status").type(JsonFieldType.STRING).description("Ao12 status"),
                                fieldWithPath("data.recentAo12.windowSize").type(JsonFieldType.NUMBER).description("Ao12 target window size"),
                                fieldWithPath("data.recentAo12.recordCount").type(JsonFieldType.NUMBER).description("Ao12 available Record count"),
                                fieldWithPath("data.recentAo12.valueMs").type(JsonFieldType.NUMBER).description("Ao12 value (ms)"),
                                fieldWithPath("data.performanceComparison").type(JsonFieldType.OBJECT).description("completed 7-day performance comparison"),
                                fieldWithPath("data.performanceComparison.status").type(JsonFieldType.STRING).description("comparison sample status"),
                                fieldWithPath("data.performanceComparison.recentPeriod").type(JsonFieldType.OBJECT).description("completed recent 7-day period"),
                                fieldWithPath("data.performanceComparison.previousPeriod").type(JsonFieldType.OBJECT).description("previous completed 7-day period"),
                                fieldWithPath("data.performanceComparison.recentPeriod.fromDate").type(JsonFieldType.STRING).description("inclusive KST date"),
                                fieldWithPath("data.performanceComparison.recentPeriod.toDateExclusive").type(JsonFieldType.STRING).description("exclusive KST date"),
                                fieldWithPath("data.performanceComparison.recentPeriod.medianTimeMs").type(JsonFieldType.NUMBER).description("rankable effective median (ms)"),
                                fieldWithPath("data.performanceComparison.recentPeriod.recordCount").type(JsonFieldType.NUMBER).description("Record count including DNF"),
                                fieldWithPath("data.performanceComparison.recentPeriod.rankableCount").type(JsonFieldType.NUMBER).description("rankable Record count"),
                                fieldWithPath("data.performanceComparison.recentPeriod.activeDays").type(JsonFieldType.NUMBER).description("rankable Record active day count"),
                                fieldWithPath("data.performanceComparison.recentPeriod.dnfCount").type(JsonFieldType.NUMBER).description("DNF count"),
                                fieldWithPath("data.performanceComparison.recentPeriod.plusTwoCount").type(JsonFieldType.NUMBER).description("PLUS_TWO count"),
                                fieldWithPath("data.performanceComparison.previousPeriod.fromDate").type(JsonFieldType.STRING).description("inclusive KST date"),
                                fieldWithPath("data.performanceComparison.previousPeriod.toDateExclusive").type(JsonFieldType.STRING).description("exclusive KST date"),
                                fieldWithPath("data.performanceComparison.previousPeriod.medianTimeMs").type(JsonFieldType.NUMBER).description("rankable effective median (ms)"),
                                fieldWithPath("data.performanceComparison.previousPeriod.recordCount").type(JsonFieldType.NUMBER).description("Record count including DNF"),
                                fieldWithPath("data.performanceComparison.previousPeriod.rankableCount").type(JsonFieldType.NUMBER).description("rankable Record count"),
                                fieldWithPath("data.performanceComparison.previousPeriod.activeDays").type(JsonFieldType.NUMBER).description("rankable Record active day count"),
                                fieldWithPath("data.performanceComparison.previousPeriod.dnfCount").type(JsonFieldType.NUMBER).description("DNF count"),
                                fieldWithPath("data.performanceComparison.previousPeriod.plusTwoCount").type(JsonFieldType.NUMBER).description("PLUS_TWO count"),
                                fieldWithPath("data.performanceComparison.direction").type(JsonFieldType.STRING).description("FASTER, SLOWER, UNCHANGED, or NOT_AVAILABLE"),
                                fieldWithPath("data.performanceComparison.improvementPercent").type(JsonFieldType.NUMBER).description("raw millisecond median improvement percent"),
                                fieldWithPath("data.consistency").type(JsonFieldType.OBJECT).description("latest 12 and previous 12 IQR comparison"),
                                fieldWithPath("data.consistency.status").type(JsonFieldType.STRING).description("consistency sample status"),
                                fieldWithPath("data.consistency.current").type(JsonFieldType.OBJECT).description("latest 12 Record window"),
                                fieldWithPath("data.consistency.previous").type(JsonFieldType.OBJECT).description("immediately previous 12 Record window"),
                                fieldWithPath("data.consistency.current.status").type(JsonFieldType.STRING).description("current window status"),
                                fieldWithPath("data.consistency.current.windowSize").type(JsonFieldType.NUMBER).description("target window size"),
                                fieldWithPath("data.consistency.current.recordCount").type(JsonFieldType.NUMBER).description("Record count including DNF"),
                                fieldWithPath("data.consistency.current.rankableCount").type(JsonFieldType.NUMBER).description("rankable Record count"),
                                fieldWithPath("data.consistency.current.iqrMs").type(JsonFieldType.NUMBER).description("Q3 minus Q1 in milliseconds"),
                                fieldWithPath("data.consistency.current.dnfCount").type(JsonFieldType.NUMBER).description("DNF count"),
                                fieldWithPath("data.consistency.current.dnfRatePercent").type(JsonFieldType.NUMBER).description("DNF count divided by Record count"),
                                fieldWithPath("data.consistency.current.plusTwoCount").type(JsonFieldType.NUMBER).description("PLUS_TWO count"),
                                fieldWithPath("data.consistency.current.plusTwoRatePercent").type(JsonFieldType.NUMBER).description("PLUS_TWO count divided by Record count"),
                                fieldWithPath("data.consistency.previous.status").type(JsonFieldType.STRING).description("previous window status"),
                                fieldWithPath("data.consistency.previous.windowSize").type(JsonFieldType.NUMBER).description("target window size"),
                                fieldWithPath("data.consistency.previous.recordCount").type(JsonFieldType.NUMBER).description("Record count including DNF"),
                                fieldWithPath("data.consistency.previous.rankableCount").type(JsonFieldType.NUMBER).description("rankable Record count"),
                                fieldWithPath("data.consistency.previous.iqrMs").type(JsonFieldType.NUMBER).description("Q3 minus Q1 in milliseconds"),
                                fieldWithPath("data.consistency.previous.dnfCount").type(JsonFieldType.NUMBER).description("DNF count"),
                                fieldWithPath("data.consistency.previous.dnfRatePercent").type(JsonFieldType.NUMBER).description("DNF count divided by Record count"),
                                fieldWithPath("data.consistency.previous.plusTwoCount").type(JsonFieldType.NUMBER).description("PLUS_TWO count"),
                                fieldWithPath("data.consistency.previous.plusTwoRatePercent").type(JsonFieldType.NUMBER).description("PLUS_TWO count divided by Record count"),
                                fieldWithPath("data.consistency.direction").type(JsonFieldType.STRING).description("NARROWER, WIDER, UNCHANGED, or NOT_AVAILABLE"),
                                fieldWithPath("data.consistency.differenceMs").type(JsonFieldType.NUMBER).description("previous IQR minus current IQR"),
                                fieldWithPath("data.activity").type(JsonFieldType.OBJECT).description("recorded Practice activity summary"),
                                fieldWithPath("data.activity.totalSolveCount").type(JsonFieldType.NUMBER).description("all current retained Record count"),
                                fieldWithPath("data.activity.last7DaysSolveCount").type(JsonFieldType.NUMBER).description("today-inclusive 7 KST date Record count"),
                                fieldWithPath("data.activity.previous7DaysSolveCount").type(JsonFieldType.NUMBER).description("previous completed 7 KST date Record count"),
                                fieldWithPath("data.activity.last30DaysSolveCount").type(JsonFieldType.NUMBER).description("today-inclusive 30 KST date Record count"),
                                fieldWithPath("data.activity.activeDaysLast30Days").type(JsonFieldType.NUMBER).description("30-day KST date count with at least one Record"),
                                fieldWithPath("data.activity.firstRecordedAt").type(JsonFieldType.STRING).description("first retained Record UTC instant"),
                                fieldWithPath("data.activity.latestRecordedAt").type(JsonFieldType.STRING).description("latest retained Record UTC instant")
                        )
                ));
    }

    @Test
    @DisplayName("Growth summary의 empty, insufficient, DNF response를 문서화한다")
    void should_document_empty_insufficient_and_dnf_growth_summary_states() throws Exception {
        User empty = saveUser("growth-empty@cubinghub.com", "GrowthEmpty");
        String emptyToken = TestFixtures.generateAccessToken(jwtTokenProvider, empty);

        mockMvc.perform(get("/api/users/me/growth")
                        .header("Authorization", "Bearer " + emptyToken)
                        .param("eventType", EventType.WCA_333.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentPb.status").value("NO_DATA"))
                .andExpect(jsonPath("$.data.recentAo5.status").value("INSUFFICIENT_DATA"))
                .andDo(document("growth/summary/empty"));

        User insufficient = saveUser("growth-insufficient@cubinghub.com", "GrowthInsufficient");
        for (int index = 0; index < 4; index++) {
            saveRecord(insufficient, 20000 + index * 100, Penalty.NONE,
                    Instant.parse("2026-08-06T0" + index + ":00:00Z"));
        }
        String insufficientToken = TestFixtures.generateAccessToken(jwtTokenProvider, insufficient);

        mockMvc.perform(get("/api/users/me/growth")
                        .header("Authorization", "Bearer " + insufficientToken)
                        .param("eventType", EventType.WCA_333.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recentAo5.status").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.data.consistency.status").value("INSUFFICIENT_DATA"))
                .andDo(document("growth/summary/insufficient"));

        User dnf = saveUser("growth-dnf@cubinghub.com", "GrowthDnf");
        for (int index = 0; index < 5; index++) {
            Penalty penalty = index < 2 ? Penalty.DNF : Penalty.NONE;
            saveRecord(dnf, 20000 + index * 100, penalty,
                    Instant.parse("2026-08-07T0" + index + ":00:00Z"));
        }
        String dnfToken = TestFixtures.generateAccessToken(jwtTokenProvider, dnf);

        mockMvc.perform(get("/api/users/me/growth")
                        .header("Authorization", "Bearer " + dnfToken)
                        .param("eventType", EventType.WCA_333.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recentAo5.status").value("DNF"))
                .andDo(document("growth/summary/dnf"));
    }

    @Test
    @DisplayName("Growth summary의 인증과 unsupported event failure를 문서화한다")
    void should_document_growth_summary_authentication_and_capability_failures() throws Exception {
        mockMvc.perform(get("/api/users/me/growth")
                        .param("eventType", EventType.WCA_333.name()))
                .andExpect(status().isUnauthorized())
                .andDo(document("growth/summary/unauthorized",
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("실패 원인"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));

        User user = saveUser("growth-unsupported@cubinghub.com", "GrowthUnsupported");
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, user);
        mockMvc.perform(get("/api/users/me/growth")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("eventType", EventType.WCA_222.name()))
                .andExpect(status().isBadRequest())
                .andDo(document("growth/summary/unsupported-event",
                        requestHeaders(
                                headerWithName("Authorization").description("Access Token을 담은 Bearer 인증 헤더")
                        ),
                        queryParameters(
                                parameterWithName("eventType").description("지원하지 않는 known Practice 종목")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("지원하지 않는 Practice 종목 안내"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
    }

    @Test
    @DisplayName("Growth trend의 30-point response와 period validation을 문서화한다")
    void should_document_growth_trend_when_authorized() throws Exception {
        User user = saveUser("growth-trend@cubinghub.com", "GrowthTrend");
        saveRecord(user, 10000, Penalty.NONE, Instant.parse("2026-08-09T15:30:00Z"));
        saveRecord(user, 12000, Penalty.DNF, Instant.parse("2026-08-10T15:30:00Z"));
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, user);

        MvcResult result = mockMvc.perform(get("/api/users/me/growth/trend")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("eventType", EventType.WCA_333.name())
                        .param("period", "30D"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.points.length()").value(30))
                .andExpect(jsonPath("$.data.points[28].medianTimeMs").value(nullValue()))
                .andReturn();

        JsonNode points = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("points");
        assertThat(points).hasSize(30);
        points.forEach(point -> assertThat(point.has("medianTimeMs")).isTrue());
        assertThat(pointForDate(points, "2026-08-10").path("medianTimeMs").isNumber()).isTrue();
        assertThat(pointForDate(points, "2026-08-11").path("medianTimeMs").isNull()).isTrue();
        assertThat(pointForDate(points, "2026-08-09").path("medianTimeMs").isNull()).isTrue();

        User docsUser = saveUser("growth-trend-docs@cubinghub.com", "GrowthTrendDocs");
        createNumericTrendFixture(docsUser);
        String docsAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, docsUser);
        MvcResult docsResult = mockMvc.perform(get("/api/users/me/growth/trend")
                        .header("Authorization", "Bearer " + docsAccessToken)
                        .param("eventType", EventType.WCA_333.name())
                        .param("period", "30D"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode docsPoints = objectMapper.readTree(docsResult.getResponse().getContentAsString())
                .path("data")
                .path("points");
        assertThat(docsPoints).hasSize(30);
        docsPoints.forEach(point -> {
            assertThat(point.has("medianTimeMs")).isTrue();
            assertThat(point.path("medianTimeMs").isNumber()).isTrue();
        });

        document("growth/trend",
                requestHeaders(
                        headerWithName("Authorization").description("Access Token을 담은 Bearer 인증 헤더")
                ),
                queryParameters(
                        parameterWithName("eventType").description("Growth를 조회할 Practice 종목 (V2.2는 WCA_333만 지원)"),
                        parameterWithName("period").description("조회 period. V2.2는 30D만 지원")
                ),
                responseFields(
                        fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                        fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                        fieldWithPath("data").type(JsonFieldType.OBJECT).description("private Growth trend"),
                        fieldWithPath("data.eventType").type(JsonFieldType.STRING).description("조회한 Practice 종목"),
                        fieldWithPath("data.period").type(JsonFieldType.STRING).description("지원된 period"),
                        fieldWithPath("data.timeZone").type(JsonFieldType.STRING).description("Growth calendar timezone"),
                        fieldWithPath("data.generatedAt").type(JsonFieldType.STRING).description("series 계산 UTC instant"),
                        fieldWithPath("data.fromDate").type(JsonFieldType.STRING).description("첫 KST date"),
                        fieldWithPath("data.toDate").type(JsonFieldType.STRING).description("오늘 KST date"),
                        fieldWithPath("data.todayPartial").type(JsonFieldType.BOOLEAN).description("오늘 point가 진행 중인 day인지 여부"),
                        fieldWithPath("data.points").type(JsonFieldType.ARRAY).description("항상 30개의 KST date point"),
                        fieldWithPath("data.points[].date").type(JsonFieldType.STRING).description("KST calendar date"),
                        fieldWithPath("data.points[].recordCount").type(JsonFieldType.NUMBER).description("DNF를 포함한 Record count"),
                        fieldWithPath("data.points[].rankableCount").type(JsonFieldType.NUMBER).description("numeric effective Record count"),
                        fieldWithPath("data.points[].medianTimeMs").type(JsonFieldType.VARIES).description("rankable effective median. missing 또는 DNF-only day는 null"),
                        fieldWithPath("data.points[].dnfCount").type(JsonFieldType.NUMBER).description("DNF count"),
                        fieldWithPath("data.points[].plusTwoCount").type(JsonFieldType.NUMBER).description("PLUS_TWO count")
                )
        ).handle(docsResult);

        mockMvc.perform(get("/api/users/me/growth/trend")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("eventType", EventType.WCA_333.name())
                        .param("period", "90D"))
                .andExpect(status().isBadRequest())
                .andDo(document("growth/trend/unsupported-period"));
    }

    @Test
    @DisplayName("Growth PB progression의 pagination과 current-state basis를 문서화한다")
    void should_document_growth_pb_progression_when_authorized() throws Exception {
        User user = saveUser("growth-progression@cubinghub.com", "GrowthProgression");
        Record first = saveRecord(user, 24000, Penalty.NONE, Instant.parse("2026-08-01T00:00:00Z"));
        Record second = saveRecord(user, 22000, Penalty.NONE, Instant.parse("2026-08-01T00:01:00Z"));
        saveRecord(user, 22000, Penalty.NONE, Instant.parse("2026-08-01T00:02:00Z"));
        Record currentPb = saveRecord(user, 19000, Penalty.PLUS_TWO, Instant.parse("2026-08-01T00:03:00Z"));
        User managedUser = userRepository.findById(user.getId()).orElseThrow();
        userPBRepository.save(UserPB.builder()
                .user(managedUser)
                .eventType(EventType.WCA_333)
                .bestTimeMs(21000)
                .record(currentPb)
                .build());
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, user);

        mockMvc.perform(get("/api/users/me/growth/pb-progression")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("eventType", EventType.WCA_333.name())
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.basis").value("CURRENT_RECORD_STATE"))
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.content[0].recordId").value(currentPb.getId()))
                .andExpect(jsonPath("$.data.content[1].recordId").value(second.getId()))
                .andDo(document("growth/pb-progression",
                        requestHeaders(
                                headerWithName("Authorization").description("Access Token을 담은 Bearer 인증 헤더")
                        ),
                        queryParameters(
                                parameterWithName("eventType").description("Growth를 조회할 Practice 종목 (V2.2는 WCA_333만 지원)"),
                                parameterWithName("page").optional().description("1부터 시작하는 page 번호. 기본값 1"),
                                parameterWithName("size").optional().description("page 크기. 기본값 50, 최대 100")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("PB progression page"),
                                fieldWithPath("data.eventType").type(JsonFieldType.STRING).description("조회한 Practice 종목"),
                                fieldWithPath("data.basis").type(JsonFieldType.STRING).description("CURRENT_RECORD_STATE"),
                                fieldWithPath("data.timeZone").type(JsonFieldType.STRING).description("Growth calendar timezone"),
                                fieldWithPath("data.content").type(JsonFieldType.ARRAY).description("current PB부터 과거 방향의 PB milestone page"),
                                fieldWithPath("data.content[].recordId").type(JsonFieldType.NUMBER).description("PB milestone Record ID"),
                                fieldWithPath("data.content[].timeMs").type(JsonFieldType.NUMBER).description("raw time (ms)"),
                                fieldWithPath("data.content[].penalty").type(JsonFieldType.STRING).description("current penalty"),
                                fieldWithPath("data.content[].effectiveTimeMs").type(JsonFieldType.NUMBER).description("effective time (ms)"),
                                fieldWithPath("data.content[].createdAt").type(JsonFieldType.STRING).description("recorded UTC instant"),
                                fieldWithPath("data.page").type(JsonFieldType.NUMBER).description("현재 page 번호 (1부터 시작)"),
                                fieldWithPath("data.size").type(JsonFieldType.NUMBER).description("현재 page 크기"),
                                fieldWithPath("data.totalElements").type(JsonFieldType.NUMBER).description("전체 PB milestone 수"),
                                fieldWithPath("data.totalPages").type(JsonFieldType.NUMBER).description("전체 page 수"),
                                fieldWithPath("data.hasNext").type(JsonFieldType.BOOLEAN).description("다음 page 존재 여부"),
                                fieldWithPath("data.hasPrevious").type(JsonFieldType.BOOLEAN).description("이전 page 존재 여부")
                        )
                ));

        User empty = saveUser("growth-progression-empty@cubinghub.com", "GrowthProgressionEmpty");
        String emptyToken = TestFixtures.generateAccessToken(jwtTokenProvider, empty);
        mockMvc.perform(get("/api/users/me/growth/pb-progression")
                        .header("Authorization", "Bearer " + emptyToken)
                        .param("eventType", EventType.WCA_333.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(0))
                .andDo(document("growth/pb-progression/empty"));
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

    private void createAvailableGrowthFixture(User user) {
        List<Record> records = new ArrayList<>();
        for (int index = 0; index < 12; index++) {
            Instant createdAt = index < 6
                    ? Instant.parse("2026-08-05T15:" + String.format("%02d", index) + ":00Z")
                    : Instant.parse("2026-08-06T15:" + String.format("%02d", index - 6) + ":00Z");
            Penalty penalty = index == 11 ? Penalty.DNF : index == 10 ? Penalty.PLUS_TWO : Penalty.NONE;
            records.add(saveRecord(user, 10000 + index * 100, penalty, createdAt));
        }
        for (int index = 0; index < 12; index++) {
            Instant createdAt = index < 6
                    ? Instant.parse("2026-07-28T15:" + String.format("%02d", index) + ":00Z")
                    : Instant.parse("2026-07-29T15:" + String.format("%02d", index - 6) + ":00Z");
            records.add(saveRecord(user, 12000 + index * 100, Penalty.NONE, createdAt));
        }

        Record currentPb = records.get(0);
        User managedUser = userRepository.findById(user.getId()).orElseThrow();
        userPBRepository.save(UserPB.builder()
                .user(managedUser)
                .eventType(EventType.WCA_333)
                .bestTimeMs(currentPb.getEffectiveTimeMs())
                .record(recordRepository.findById(currentPb.getId()).orElseThrow())
                .build());
    }

    private Record saveRecord(User user, int timeMs, Penalty penalty, Instant createdAt) {
        User managedUser = userRepository.findById(user.getId()).orElseThrow();
        Record record = recordRepository.saveAndFlush(Record.builder()
                .user(managedUser)
                .eventType(EventType.WCA_333)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble("growth-docs-scramble")
                .build());
        recordRepository.flush();
        jdbcTemplate.update(
                "UPDATE records SET created_at = ?, updated_at = ? WHERE id = ?",
                Timestamp.from(createdAt),
                Timestamp.from(createdAt),
                record.getId()
        );
        entityManager.clear();
        return recordRepository.findById(record.getId()).orElseThrow();
    }

    private void createNumericTrendFixture(User user) {
        LocalDate fromDate = LocalDate.of(2026, 7, 14);
        ZoneId zoneId = ZoneId.of("Asia/Seoul");
        for (int index = 0; index < 30; index++) {
            saveRecord(
                    user,
                    10000 + index,
                    Penalty.NONE,
                    fromDate.plusDays(index).atStartOfDay(zoneId).toInstant()
            );
        }
    }

    private JsonNode pointForDate(JsonNode points, String date) {
        for (JsonNode point : points) {
            if (date.equals(point.path("date").asText())) {
                return point;
            }
        }
        throw new AssertionError("trend point가 없습니다: " + date);
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
