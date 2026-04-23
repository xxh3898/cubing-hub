package com.cubinghub.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import java.util.Collections;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** SecurityFilterChain의 인증/인가 경계와 blacklist 동작을 MockMvc로 검증한다. */
@AutoConfigureMockMvc
@DisplayName("Security 접근 제어 통합 테스트")
class SecurityAccessControlIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("인증 없이 /api/auth/login 요청은 컨트롤러까지 도달해 400을 반환한다")
    void should_allow_access_to_auth_path_when_authentication_is_missing() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("토큰 없이 보호된 API에 접근하면 401을 반환한다")
    void should_return_unauthorized_when_accessing_protected_api_without_token() throws Exception {
        mockMvc.perform(post("/api/records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("잘못된 형식의 토큰으로 보호된 API에 접근하면 401을 반환한다")
    void should_return_unauthorized_when_accessing_protected_api_with_invalid_token() throws Exception {
        mockMvc.perform(post("/api/records")
                        .header("Authorization", "Bearer invalid.token.value")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("Bearer 접두사가 없는 Authorization 헤더는 인증으로 처리하지 않는다")
    void should_treat_authorization_header_without_bearer_prefix_as_missing_authentication() throws Exception {
        mockMvc.perform(post("/api/records")
                        .header("Authorization", "invalid.token.value")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("로그아웃된 access token으로 보호된 API에 접근하면 401을 반환한다")
    void should_return_unauthorized_when_accessing_protected_api_with_blacklisted_access_token() throws Exception {
        String accessToken = TestFixtures.generateAccessToken(
                jwtTokenProvider,
                TestFixtures.createUser(1L, "blacklist@cubinghub.com", "BlacklistUser", UserRole.ROLE_USER, UserStatus.ACTIVE)
        );

        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("로그아웃 된 토큰입니다."))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("Actuator 헬스 체크 경로는 인증 없이 접근이 가능하다")
    void should_allow_access_to_actuator_health_when_authentication_is_missing() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Actuator prometheus 경로는 인증 없이 접근하면 401을 반환한다")
    void should_return_unauthorized_when_accessing_actuator_prometheus_without_authentication() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("공개 게시글 상세 경로는 인증 없이도 접근할 수 있다")
    void should_allow_access_to_public_post_detail_when_authentication_is_missing() throws Exception {
        mockMvc.perform(get("/api/posts/{postId}", 99999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("게시글을 찾을 수 없습니다."));
    }

    @Test
    @DisplayName("게시글 수정 preload 경로는 인증 없이 접근하면 401을 반환한다")
    void should_return_unauthorized_when_accessing_post_edit_preload_without_authentication() throws Exception {
        mockMvc.perform(get("/api/posts/{postId}/edit", 99999L))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("공개 댓글 목록 경로는 인증 없이도 접근할 수 있다")
    void should_allow_access_to_public_comment_list_when_authentication_is_missing() throws Exception {
        mockMvc.perform(get("/api/posts/{postId}/comments", 99999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("게시글을 찾을 수 없습니다."));
    }

    @Test
    @DisplayName("공개 홈 경로는 인증 없이도 접근할 수 있다")
    void should_allow_access_to_public_home_when_authentication_is_missing() throws Exception {
        mockMvc.perform(get("/api/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("홈 대시보드를 조회했습니다."));
    }

    @Test
    @DisplayName("세션 복구 쿠키 정리 경로는 인증 없이 접근할 수 있다")
    void should_allow_access_to_refresh_cookie_clear_when_authentication_is_missing() throws Exception {
        mockMvc.perform(post("/api/session/clear-refresh-cookie"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("refresh_token 쿠키를 정리했습니다."));
    }

    @Test
    @DisplayName("피드백 생성 경로는 인증 없이 접근하면 401을 반환한다")
    void should_return_unauthorized_when_accessing_feedback_create_without_authentication() throws Exception {
        mockMvc.perform(post("/api/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"BUG\",\"title\":\"버그 제보\",\"content\":\"상세 내용\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("공개 QnA 목록 경로는 인증 없이도 접근할 수 있다")
    void should_allow_access_to_public_qna_list_when_authentication_is_missing() throws Exception {
        mockMvc.perform(get("/api/qna"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("공개 질문 목록을 조회했습니다."));
    }

    @Test
    @DisplayName("관리자 피드백 경로는 인증 없이 접근하면 401을 반환한다")
    void should_return_unauthorized_when_accessing_admin_feedbacks_without_authentication() throws Exception {
        mockMvc.perform(get("/api/admin/feedbacks"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("관리자 메모 경로는 인증 없이 접근하면 401을 반환한다")
    void should_return_unauthorized_when_accessing_admin_memos_without_authentication() throws Exception {
        mockMvc.perform(get("/api/admin/memos"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }
}
