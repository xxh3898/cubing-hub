package com.cubinghub.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.user.dto.request.ChangePasswordRequest;
import com.cubinghub.domain.user.dto.request.UpdateMyProfileRequest;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import tools.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EntityManager entityManager;

    private User testUser;
    private String accessToken;

    @BeforeEach
    void setUp() {
        testUser = userRepository.save(User.builder()
                .email("tester@cubinghub.com")
                .password(passwordEncoder.encode("password123!"))
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
                .andExpect(jsonPath("$.data.items[0].inputMethod").value("UNKNOWN"))
                .andExpect(jsonPath("$.data.items[0].createdAt").exists())
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andExpect(jsonPath("$.data.totalPages").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.hasPrevious").value(false));
    }

    @Test
    @DisplayName("eventType 필터는 해당 Practice event 기록만 안정된 순서로 반환한다")
    void should_filter_my_records_by_event_type_with_stable_ordering() throws Exception {
        Record olderId = saveRecord(testUser, EventType.WCA_333, 10000, Penalty.NONE, "first-333");
        Record newerId = saveRecord(testUser, EventType.WCA_333, 11000, Penalty.NONE, "second-333");
        saveRecord(testUser, EventType.WCA_222, 5000, Penalty.NONE, "legacy-222");
        recordRepository.flush();
        entityManager.createNativeQuery("""
                        UPDATE records
                        SET created_at = '2026-08-10 11:15:30.123000'
                        WHERE id IN (:firstId, :secondId)
                        """)
                .setParameter("firstId", olderId.getId())
                .setParameter("secondId", newerId.getId())
                .executeUpdate();
        entityManager.clear();

        mockMvc.perform(get("/api/users/me/records")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("eventType", "WCA_333")
                        .param("page", "1")
                        .param("size", "12")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.items[0].id").value(newerId.getId()))
                .andExpect(jsonPath("$.data.items[1].id").value(olderId.getId()))
                .andExpect(jsonPath("$.data.items[0].eventType").value("WCA_333"))
                .andExpect(jsonPath("$.data.items[1].eventType").value("WCA_333"));
    }

    @Test
    @DisplayName("미지원 Practice event 기록 필터 요청은 400을 반환한다")
    void should_return_bad_request_when_history_event_is_not_supported() throws Exception {
        mockMvc.perform(get("/api/users/me/records")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("eventType", "WCA_222")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("지원하지 않는 Practice 종목입니다."));
    }

    @Test
    @DisplayName("알 수 없는 history EventType 문자열은 500이 아니라 400을 반환한다")
    void should_return_bad_request_when_history_event_type_is_invalid() throws Exception {
        mockMvc.perform(get("/api/users/me/records")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("eventType", "UNKNOWN_EVENT")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("eventType 파라미터 형식이 올바르지 않습니다."));
    }

    @Test
    @DisplayName("인증된 사용자는 마이페이지 프로필 정보를 수정할 수 있다")
    void should_update_my_profile_when_access_token_is_valid() throws Exception {
        UpdateMyProfileRequest request = new UpdateMyProfileRequest("UpdatedTester", "WCA_333");

        mockMvc.perform(patch("/api/users/me/profile")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("내 정보를 수정했습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));

        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(updatedUser.getNickname()).isEqualTo("UpdatedTester");
        assertThat(updatedUser.getMainEvent()).isEqualTo("WCA_333");
    }

    @Test
    @DisplayName("유효하지 않은 주 종목 코드를 보내면 프로필 수정은 400을 반환한다")
    void should_return_bad_request_when_update_my_profile_main_event_is_invalid() throws Exception {
        UpdateMyProfileRequest request = new UpdateMyProfileRequest("UpdatedTester", "3x3x3");

        mockMvc.perform(patch("/api/users/me/profile")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("주 종목은 유효한 WCA 종목 코드여야 합니다.")));
    }

    @Test
    @DisplayName("인증된 사용자는 현재 비밀번호가 맞으면 비밀번호를 변경할 수 있다")
    void should_change_password_when_current_password_matches() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest("password123!", "newPassword123!");

        mockMvc.perform(patch("/api/users/me/password")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("비밀번호를 변경했습니다. 다시 로그인해주세요."))
                .andExpect(jsonPath("$.data").value(nullValue()));

        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(passwordEncoder.matches("newPassword123!", updatedUser.getPassword())).isTrue();
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
                .andExpect(jsonPath("$.message").value(containsString("잘못된 페이지 번호입니다.")));
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

    @Test
    @DisplayName("현재 비밀번호가 일치하지 않으면 비밀번호 변경은 400을 반환한다")
    void should_return_bad_request_when_current_password_does_not_match() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest("wrongPassword!", "newPassword123!");

        mockMvc.perform(patch("/api/users/me/password")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("현재 비밀번호가 일치하지 않습니다."));
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
