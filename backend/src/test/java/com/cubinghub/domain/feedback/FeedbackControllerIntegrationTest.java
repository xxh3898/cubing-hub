package com.cubinghub.domain.feedback;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.repository.FeedbackRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("FeedbackController 통합 테스트")
class FeedbackControllerIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private EntityManager entityManager;

    private User savedUser;
    private String accessToken;

    @BeforeEach
    void setUp() {
        savedUser = userRepository.save(User.builder()
                .email("feedback@cubinghub.com")
                .password("password")
                .nickname("FeedbackUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
        accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, savedUser);
    }

    @Test
    @DisplayName("인증 없이 피드백 생성 요청을 보내면 401을 반환한다")
    void should_return_unauthorized_when_feedback_create_request_is_sent_without_authentication() throws Exception {
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.BUG, "버그 제보", "reply@cubinghub.com", "내용");

        mockMvc.perform(post("/api/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("로그인 사용자가 유효한 요청을 보내면 사용자 연관과 함께 저장한다")
    void should_create_feedback_with_user_when_request_is_valid_for_authenticated_user() throws Exception {
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.FEATURE, "기능 제안", "reply@cubinghub.com", "내용");

        mockMvc.perform(post("/api/feedbacks")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("피드백이 접수되었습니다."))
                .andExpect(jsonPath("$.data.id").exists());

        entityManager.flush();
        entityManager.clear();

        assertThat(feedbackRepository.findAll()).hasSize(1);
        Feedback feedback = feedbackRepository.findAll().get(0);
        assertThat(feedback.getUser()).isNotNull();
        assertThat(feedback.getUser().getId()).isEqualTo(savedUser.getId());
        assertThat(feedback.getType()).isEqualTo(FeedbackType.FEATURE);
        assertThat(feedback.getReplyEmail()).isEqualTo("reply@cubinghub.com");
    }

    @Test
    @DisplayName("유효하지 않은 피드백 생성 요청이면 400을 반환한다")
    void should_return_bad_request_when_feedback_request_is_invalid() throws Exception {
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.OTHER, "제목", "invalid-email", "내용");

        mockMvc.perform(post("/api/feedbacks")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("잘못된 입력값입니다")));
    }
}
