package com.cubinghub.domain.record;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.record.service.RankingRedisBackfillService;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("RankingController 통합 테스트")
class RankingControllerIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserPBRepository userPBRepository;

    @Autowired
    private RankingRedisBackfillService rankingRedisBackfillService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("랭킹 조회는 PB 기준으로 서버 페이지네이션 메타데이터를 반환한다")
    void should_return_paginated_pb_rankings_with_page_metadata() throws Exception {
        for (int i = 0; i < 30; i++) {
            User user = saveUser("ranker" + i + "@cubinghub.com", "Ranker" + i);
            Record record = saveRecord(user, EventType.WCA_333, 10000 + i, Penalty.NONE, "scramble-" + i);
            saveUserPb(user, EventType.WCA_333, 10000 + i, record);
        }

        mockMvc.perform(get("/api/rankings")
                        .param("eventType", EventType.WCA_333.name())
                        .param("page", "2")
                        .param("size", "10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(10))
                .andExpect(jsonPath("$.data.items[0].rank").value(11))
                .andExpect(jsonPath("$.data.items[0].nickname").value("Ranker10"))
                .andExpect(jsonPath("$.data.items[9].rank").value(20))
                .andExpect(jsonPath("$.data.page").value(2))
                .andExpect(jsonPath("$.data.size").value(10))
                .andExpect(jsonPath("$.data.totalElements").value(30))
                .andExpect(jsonPath("$.data.totalPages").value(3))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.hasPrevious").value(true))
                .andExpect(jsonPath("$.data.myRanking").value(nullValue()));
    }

    @Test
    @DisplayName("랭킹 조회는 닉네임 검색과 PB 시간을 함께 반영한다")
    void should_filter_rankings_by_nickname_and_return_pb_time() throws Exception {
        User alpha = saveUser("alpha@cubinghub.com", "AlphaCube");
        User beta = saveUser("beta@cubinghub.com", "Beta");

        saveRecord(alpha, EventType.WCA_333, 9800, Penalty.NONE, "alpha-history");
        Record alphaPbRecord = saveRecord(alpha, EventType.WCA_333, 10000, Penalty.PLUS_TWO, "alpha-pb");
        Record betaPbRecord = saveRecord(beta, EventType.WCA_333, 11000, Penalty.NONE, "beta-pb");

        saveUserPb(alpha, EventType.WCA_333, 12000, alphaPbRecord);
        saveUserPb(beta, EventType.WCA_333, 11000, betaPbRecord);

        mockMvc.perform(get("/api/rankings")
                        .param("eventType", EventType.WCA_333.name())
                        .param("nickname", "cube")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].rank").value(2))
                .andExpect(jsonPath("$.data.items[0].nickname").value("AlphaCube"))
                .andExpect(jsonPath("$.data.items[0].timeMs").value(12000))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.totalPages").value(1));
    }

    @Test
    @DisplayName("로그인 랭킹 조회는 선택 종목 기준 내 순위를 함께 반환한다")
    void should_return_my_ranking_when_authenticated_user_has_pb_for_event() throws Exception {
        User alpha = saveUser("alpha-my-ranking@cubinghub.com", "Alpha");
        User beta = saveUser("beta-my-ranking@cubinghub.com", "Beta");
        User gamma = saveUser("gamma-my-ranking@cubinghub.com", "Gamma");
        Record alphaRecord = saveRecord(alpha, EventType.WCA_333, 12000, Penalty.NONE, "alpha");
        Record betaRecord = saveRecord(beta, EventType.WCA_333, 9800, Penalty.NONE, "beta");
        Record gammaRecord = saveRecord(gamma, EventType.WCA_333, 11000, Penalty.NONE, "gamma");
        saveUserPb(alpha, EventType.WCA_333, 12000, alphaRecord);
        saveUserPb(beta, EventType.WCA_333, 9800, betaRecord);
        saveUserPb(gamma, EventType.WCA_333, 11000, gammaRecord);
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, alpha);

        mockMvc.perform(get("/api/rankings")
                        .param("eventType", EventType.WCA_333.name())
                        .header("Authorization", "Bearer " + accessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.myRanking.rank").value(3))
                .andExpect(jsonPath("$.data.myRanking.nickname").value("Alpha"))
                .andExpect(jsonPath("$.data.myRanking.eventType").value(EventType.WCA_333.name()))
                .andExpect(jsonPath("$.data.myRanking.timeMs").value(12000));
    }

    @Test
    @DisplayName("로그인 사용자의 선택 종목 PB가 없으면 내 순위는 null이다")
    void should_return_null_my_ranking_when_authenticated_user_has_no_pb_for_event() throws Exception {
        User alpha = saveUser("alpha-empty-ranking@cubinghub.com", "Alpha");
        User beta = saveUser("beta-empty-ranking@cubinghub.com", "Beta");
        Record betaRecord = saveRecord(beta, EventType.WCA_333, 9800, Penalty.NONE, "beta");
        saveUserPb(beta, EventType.WCA_333, 9800, betaRecord);
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, alpha);

        mockMvc.perform(get("/api/rankings")
                        .param("eventType", EventType.WCA_333.name())
                        .header("Authorization", "Bearer " + accessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.myRanking").value(nullValue()));
    }

    @Test
    @DisplayName("랭킹 조회에서 닉네임 검색어가 너무 길면 400을 반환한다")
    void should_return_bad_request_when_ranking_nickname_query_exceeds_max_length() throws Exception {
        mockMvc.perform(get("/api/rankings")
                        .param("eventType", EventType.WCA_333.name())
                        .param("nickname", "a".repeat(51))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("닉네임 검색어는 50자 이하여야 합니다.")));
    }

    @Test
    @DisplayName("유효하지 않은 랭킹 페이지 파라미터를 보내면 400을 반환한다")
    void should_return_bad_request_when_ranking_page_parameter_is_invalid() throws Exception {
        mockMvc.perform(get("/api/rankings")
                        .param("eventType", EventType.WCA_333.name())
                        .param("page", "0")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("잘못된 페이지 번호입니다.")));
    }

    @Test
    @DisplayName("Redis 랭킹이 준비되면 기본 랭킹 조회는 Redis 경로로 같은 계약을 반환한다")
    void should_return_rankings_from_redis_when_ready_marker_exists() throws Exception {
        for (int i = 0; i < 30; i++) {
            User user = saveUser("redis-ranker" + i + "@cubinghub.com", "RedisRanker" + i);
            Record record = saveRecord(user, EventType.WCA_333, 10000 + i, Penalty.NONE, "redis-scramble-" + i);
            saveUserPb(user, EventType.WCA_333, 10000 + i, record);
        }

        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, saveUser(
                "redis-current@cubinghub.com",
                "RedisCurrent"
        ));
        User currentUser = userRepository.findByEmail("redis-current@cubinghub.com").orElseThrow();
        Record currentRecord = saveRecord(currentUser, EventType.WCA_333, 9995, Penalty.NONE, "redis-current");
        saveUserPb(currentUser, EventType.WCA_333, 9995, currentRecord);
        rankingRedisBackfillService.rebuild(EventType.WCA_333);

        mockMvc.perform(get("/api/rankings")
                        .param("eventType", EventType.WCA_333.name())
                        .param("page", "2")
                        .param("size", "10")
                        .header("Authorization", "Bearer " + accessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(10))
                .andExpect(jsonPath("$.data.items[0].rank").value(11))
                .andExpect(jsonPath("$.data.items[0].nickname").value("RedisRanker9"))
                .andExpect(jsonPath("$.data.items[9].rank").value(20))
                .andExpect(jsonPath("$.data.page").value(2))
                .andExpect(jsonPath("$.data.size").value(10))
                .andExpect(jsonPath("$.data.totalElements").value(31))
                .andExpect(jsonPath("$.data.totalPages").value(4))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.hasPrevious").value(true))
                .andExpect(jsonPath("$.data.myRanking.rank").value(1))
                .andExpect(jsonPath("$.data.myRanking.nickname").value("RedisCurrent"))
                .andExpect(jsonPath("$.data.myRanking.timeMs").value(9995));
    }

    private User saveUser(String email, String nickname) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
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
}
