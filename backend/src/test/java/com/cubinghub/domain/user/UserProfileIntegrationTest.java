package com.cubinghub.domain.user;

import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("UserProfile 통합 테스트")
class UserProfileIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private String accessToken;

    @BeforeEach
    void setUp() {
        testUser = userRepository.save(User.builder()
                .email("tester@cubinghub.com")
                .password("password")
                .nickname("Tester")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
        accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, testUser);
    }

    @Test
    @DisplayName("인증된 사용자는 마이페이지 요약 정보를 조회할 수 있다")
    void should_return_my_profile_when_access_token_is_valid() throws Exception {
        saveRecord(testUser, EventType.WCA_333, 10000, Penalty.NONE, "best");
        saveRecord(testUser, EventType.WCA_333, 9000, Penalty.PLUS_TWO, "plus-two");
        saveRecord(testUser, EventType.WCA_333, 12000, Penalty.DNF, "dnf");

        mockMvc.perform(get("/api/users/me/profile")
                        .header("Authorization", "Bearer " + accessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("마이페이지 정보를 조회했습니다."))
                .andExpect(jsonPath("$.data.userId").value(testUser.getId()))
                .andExpect(jsonPath("$.data.nickname").value("Tester"))
                .andExpect(jsonPath("$.data.mainEvent").value("3x3x3"))
                .andExpect(jsonPath("$.data.summary.totalSolveCount").value(3))
                .andExpect(jsonPath("$.data.summary.personalBestTimeMs").value(10000))
                .andExpect(jsonPath("$.data.summary.averageTimeMs").value(10500));
    }

    @Test
    @DisplayName("인증된 사용자는 마이페이지 기록 목록을 페이지네이션으로 조회할 수 있다")
    void should_return_paginated_my_records_when_access_token_is_valid() throws Exception {
        saveRecord(testUser, EventType.WCA_333, 10000, Penalty.NONE, "first");
        saveRecord(testUser, EventType.WCA_333, 11000, Penalty.PLUS_TWO, "second");
        saveRecord(testUser, EventType.WCA_333, 12000, Penalty.DNF, "third");

        mockMvc.perform(get("/api/users/me/records")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("page", "1")
                        .param("size", "2")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("내 기록을 조회했습니다."))
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].id").exists())
                .andExpect(jsonPath("$.data.items[0].createdAt").exists())
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andExpect(jsonPath("$.data.totalPages").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.hasPrevious").value(false));
    }

    @Test
    @DisplayName("Authorization 헤더 없이 마이페이지 조회를 요청하면 401을 반환한다")
    void should_return_unauthorized_when_authorization_header_is_missing() throws Exception {
        mockMvc.perform(get("/api/users/me/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));
    }

    @Test
    @DisplayName("유효하지 않은 마이페이지 기록 페이지 요청을 보내면 400을 반환한다")
    void should_return_bad_request_when_my_records_page_parameter_is_invalid() throws Exception {
        mockMvc.perform(get("/api/users/me/records")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("page", "0")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("page는 1 이상이어야 합니다.")));
    }

    @Test
    @DisplayName("Authorization 헤더 없이 내 기록 조회를 요청하면 401을 반환한다")
    void should_return_unauthorized_when_authorization_header_is_missing_for_my_records() throws Exception {
        mockMvc.perform(get("/api/users/me/records"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));
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
}
