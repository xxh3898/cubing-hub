package com.cubinghub.domain.feedback;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
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
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("AdminFeedbackController 통합 테스트")
class AdminFeedbackControllerIntegrationTest extends JpaIntegrationTest {

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

    private User submitter;
    private User adminUser;
    private User normalUser;
    private String adminAccessToken;
    private String normalAccessToken;

    @BeforeEach
    void setUp() {
        submitter = saveUser("feedback-user@cubinghub.com", "FeedbackUser", UserRole.ROLE_USER);
        adminUser = saveUser("feedback-admin@cubinghub.com", "FeedbackAdmin", UserRole.ROLE_ADMIN);
        normalUser = saveUser("feedback-other@cubinghub.com", "FeedbackOther", UserRole.ROLE_USER);

        adminAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
        normalAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, normalUser);
    }

    @Test
    @DisplayName("should_return_admin_feedback_page_when_admin_filters_feedbacks")
    void should_return_admin_feedback_page_when_admin_filters_feedbacks() throws Exception {
        saveFeedback(submitter, FeedbackType.BUG, "비공개 미답변");
        Feedback publishedFeedback = saveFeedback(submitter, FeedbackType.FEATURE, "공개 답변 완료");
        publishedFeedback.updateAnswer(adminUser, "답변 완료", LocalDateTime.of(2026, 4, 23, 10, 15, 25));
        publishedFeedback.updateVisibility(FeedbackVisibility.PUBLIC, LocalDateTime.of(2026, 4, 23, 10, 20, 40));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/admin/feedbacks")
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .param("answered", "false")
                        .param("visibility", "PRIVATE")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("관리자 피드백 목록을 조회했습니다."))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].title").value("비공개 미답변"))
                .andExpect(jsonPath("$.data.items[0].answered").value(false))
                .andExpect(jsonPath("$.data.items[0].visibility").value("PRIVATE"));
    }

    @Test
    @DisplayName("should_update_feedback_answer_when_admin_submits_valid_request")
    void should_update_feedback_answer_when_admin_submits_valid_request() throws Exception {
        Feedback feedback = saveFeedback(submitter, FeedbackType.BUG, "답변 대상");

        mockMvc.perform(patch("/api/admin/feedbacks/{feedbackId}/answer", feedback.getId())
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("answer", "관리자 답변입니다."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("피드백 답변을 저장했습니다."))
                .andExpect(jsonPath("$.data.answer").value("관리자 답변입니다."))
                .andExpect(jsonPath("$.data.answered").value(true))
                .andExpect(jsonPath("$.data.visibility").value("PRIVATE"));

        entityManager.flush();
        entityManager.clear();

        Feedback updatedFeedback = feedbackRepository.findWithUserById(feedback.getId()).orElseThrow();
        assertThat(updatedFeedback.getAnswer()).isEqualTo("관리자 답변입니다.");
        assertThat(updatedFeedback.getAnsweredByUser().getId()).isEqualTo(adminUser.getId());
        assertThat(updatedFeedback.getAnsweredAt()).isNotNull();
    }

    @Test
    @DisplayName("should_return_bad_request_when_admin_publishes_unanswered_feedback")
    void should_return_bad_request_when_admin_publishes_unanswered_feedback() throws Exception {
        Feedback feedback = saveFeedback(submitter, FeedbackType.BUG, "미답변 공개 시도");

        mockMvc.perform(patch("/api/admin/feedbacks/{feedbackId}/visibility", feedback.getId())
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("visibility", "PUBLIC"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("답변이 등록된 피드백만 공개할 수 있습니다."));
    }

    @Test
    @DisplayName("should_update_feedback_visibility_when_admin_publishes_answered_feedback")
    void should_update_feedback_visibility_when_admin_publishes_answered_feedback() throws Exception {
        Feedback feedback = saveFeedback(submitter, FeedbackType.OTHER, "공개 전환 대상");
        feedback.updateAnswer(adminUser, "공개 가능한 답변", LocalDateTime.of(2026, 4, 23, 10, 30, 15));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(patch("/api/admin/feedbacks/{feedbackId}/visibility", feedback.getId())
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("visibility", "PUBLIC"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("피드백 공개 상태를 변경했습니다."))
                .andExpect(jsonPath("$.data.visibility").value("PUBLIC"))
                .andExpect(jsonPath("$.data.publishedAt").isNotEmpty());

        entityManager.flush();
        entityManager.clear();

        Feedback updatedFeedback = feedbackRepository.findById(feedback.getId()).orElseThrow();
        assertThat(updatedFeedback.getVisibility()).isEqualTo(FeedbackVisibility.PUBLIC);
        assertThat(updatedFeedback.getPublishedAt()).isNotNull();
    }

    @Test
    @DisplayName("should_return_forbidden_when_non_admin_requests_admin_feedback_endpoint")
    void should_return_forbidden_when_non_admin_requests_admin_feedback_endpoint() throws Exception {
        mockMvc.perform(get("/api/admin/feedbacks")
                        .header("Authorization", "Bearer " + normalAccessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("접근 권한이 없습니다."));
    }

    private User saveUser(String email, String nickname, UserRole role) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(role)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
    }

    private Feedback saveFeedback(User user, FeedbackType type, String title) {
        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .user(user)
                .type(type)
                .title(title)
                .replyEmail("reply@cubinghub.com")
                .content(title + " 내용")
                .build());
        feedback.markNotificationSuccess(LocalDateTime.of(2026, 4, 23, 9, 0, 10));
        return feedback;
    }
}
