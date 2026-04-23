package com.cubinghub.domain.feedback;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.notification.DiscordFeedbackNotifier;
import com.cubinghub.domain.feedback.notification.FeedbackNotificationAttemptResult;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
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

    @MockBean
    private DiscordFeedbackNotifier discordFeedbackNotifier;

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
        when(discordFeedbackNotifier.send(any(Feedback.class)))
                .thenReturn(FeedbackNotificationAttemptResult.success(LocalDateTime.of(2026, 4, 22, 21, 0, 15)));
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
                .andExpect(jsonPath("$.message").value("피드백이 접수되었고 Discord 운영 알림 전송을 완료했습니다."))
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.notificationStatus").value("SUCCESS"))
                .andExpect(jsonPath("$.data.notificationAttemptCount").value(1))
                .andExpect(jsonPath("$.data.notificationRetryAvailable").value(false));

        entityManager.flush();
        entityManager.clear();

        assertThat(feedbackRepository.findAll()).hasSize(1);
        Feedback feedback = feedbackRepository.findAll().get(0);
        assertThat(feedback.getUser()).isNotNull();
        assertThat(feedback.getUser().getId()).isEqualTo(savedUser.getId());
        assertThat(feedback.getType()).isEqualTo(FeedbackType.FEATURE);
        assertThat(feedback.getReplyEmail()).isEqualTo("reply@cubinghub.com");
        assertThat(feedback.getNotificationStatus()).isEqualTo(FeedbackNotificationStatus.SUCCESS);
        assertThat(feedback.getNotificationAttemptCount()).isEqualTo(1);
        assertThat(feedback.getNotificationLastError()).isNull();
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

    @Test
    @DisplayName("피드백 본문이 너무 길면 400을 반환한다")
    void should_return_bad_request_when_feedback_content_exceeds_max_length() throws Exception {
        FeedbackCreateRequest request = new FeedbackCreateRequest(
                FeedbackType.OTHER,
                "제목",
                "reply@cubinghub.com",
                "a".repeat(2001)
        );

        mockMvc.perform(post("/api/feedbacks")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("내용은 2000자 이하이어야 합니다.")));
    }

    @Test
    @DisplayName("인증 토큰의 사용자 정보가 없으면 피드백 생성 요청은 401을 반환한다")
    void should_return_unauthorized_when_feedback_create_request_is_sent_with_missing_user() throws Exception {
        User missingUser = User.builder()
                .email("missing@cubinghub.com")
                .password("password")
                .nickname("MissingUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build();
        String missingUserAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, missingUser);
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.BUG, "버그 제보", "reply@cubinghub.com", "내용");

        mockMvc.perform(post("/api/feedbacks")
                        .header("Authorization", "Bearer " + missingUserAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("사용자를 찾을 수 없습니다."));
    }

    @Test
    @DisplayName("Discord 알림 전송이 실패해도 피드백은 저장하고 실패 상태를 반환한다")
    void should_create_feedback_and_return_failed_notification_status_when_discord_notification_fails() throws Exception {
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.BUG, "버그 제보", "reply@cubinghub.com", "내용");
        when(discordFeedbackNotifier.send(any(Feedback.class)))
                .thenReturn(FeedbackNotificationAttemptResult.failure(
                        LocalDateTime.of(2026, 4, 22, 21, 5, 20),
                        "Discord webhook 응답 실패 (500)"
                ));

        mockMvc.perform(post("/api/feedbacks")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("피드백이 저장되었지만 Discord 운영 알림 전송에 실패했습니다. 다시 시도해주세요."))
                .andExpect(jsonPath("$.data.notificationStatus").value("FAILED"))
                .andExpect(jsonPath("$.data.notificationAttemptCount").value(1))
                .andExpect(jsonPath("$.data.notificationRetryAvailable").value(true));

        Feedback feedback = feedbackRepository.findAll().get(0);
        assertThat(feedback.getNotificationStatus()).isEqualTo(FeedbackNotificationStatus.FAILED);
        assertThat(feedback.getNotificationAttemptCount()).isEqualTo(1);
        assertThat(feedback.getNotificationLastError()).isEqualTo("Discord webhook 응답 실패 (500)");
    }

    @Test
    @DisplayName("로그인 사용자는 실패한 피드백 Discord 알림을 재시도할 수 있다")
    void should_retry_feedback_notification_when_request_user_is_owner() throws Exception {
        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .user(savedUser)
                .type(FeedbackType.BUG)
                .title("버그 제보")
                .replyEmail("reply@cubinghub.com")
                .content("재현 경로")
                .build());
        feedback.markNotificationFailure(LocalDateTime.of(2026, 4, 22, 20, 55, 15), "이전 실패");
        entityManager.flush();
        entityManager.clear();

        when(discordFeedbackNotifier.send(any(Feedback.class)))
                .thenReturn(FeedbackNotificationAttemptResult.success(LocalDateTime.of(2026, 4, 22, 21, 10, 10)));

        mockMvc.perform(post("/api/feedbacks/{feedbackId}/notification-retry", feedback.getId())
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Discord 운영 알림 재전송을 완료했습니다."))
                .andExpect(jsonPath("$.data.id").value(feedback.getId()))
                .andExpect(jsonPath("$.data.notificationStatus").value("SUCCESS"))
                .andExpect(jsonPath("$.data.notificationAttemptCount").value(2))
                .andExpect(jsonPath("$.data.notificationRetryAvailable").value(false));
    }

    @Test
    @DisplayName("다른 사용자가 피드백 Discord 알림 재시도를 요청하면 403을 반환한다")
    void should_return_forbidden_when_feedback_notification_retry_is_requested_by_non_owner() throws Exception {
        User otherUser = userRepository.save(User.builder()
                .email("other@cubinghub.com")
                .password("password")
                .nickname("OtherUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
        String otherUserAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, otherUser);
        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .user(savedUser)
                .type(FeedbackType.BUG)
                .title("버그 제보")
                .replyEmail("reply@cubinghub.com")
                .content("재현 경로")
                .build());
        feedback.markNotificationFailure(LocalDateTime.of(2026, 4, 22, 20, 58, 45), "이전 실패");
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(post("/api/feedbacks/{feedbackId}/notification-retry", feedback.getId())
                        .header("Authorization", "Bearer " + otherUserAccessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("피드백 알림 재시도 권한이 없습니다."));
    }

    @Test
    @DisplayName("이미 Discord 알림 전송을 완료한 피드백은 재시도 요청 시 409를 반환한다")
    void should_return_conflict_when_feedback_notification_retry_is_requested_for_success_status() throws Exception {
        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .user(savedUser)
                .type(FeedbackType.BUG)
                .title("버그 제보")
                .replyEmail("reply@cubinghub.com")
                .content("재현 경로")
                .build());
        feedback.markNotificationSuccess(LocalDateTime.of(2026, 4, 22, 20, 59, 5));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(post("/api/feedbacks/{feedbackId}/notification-retry", feedback.getId())
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("이미 Discord 알림 전송을 완료했습니다."));
    }
}
