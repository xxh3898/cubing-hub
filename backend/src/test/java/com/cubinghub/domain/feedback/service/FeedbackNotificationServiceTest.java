package com.cubinghub.domain.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.dto.response.FeedbackSubmissionResponse;
import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.notification.DiscordFeedbackNotifier;
import com.cubinghub.domain.feedback.notification.FeedbackNotificationAttemptResult;
import com.cubinghub.support.TestFixtures;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("FeedbackNotificationService 단위 테스트")
class FeedbackNotificationServiceTest {

    @Mock
    private FeedbackService feedbackService;

    @Mock
    private DiscordFeedbackNotifier discordFeedbackNotifier;

    private FeedbackNotificationService feedbackNotificationService;

    @BeforeEach
    void setUp() {
        feedbackNotificationService = new FeedbackNotificationService(feedbackService, discordFeedbackNotifier);
    }

    @Test
    @DisplayName("피드백 생성 뒤 Discord 전송이 성공하면 성공 상태 응답을 반환한다")
    void should_return_success_response_when_notification_succeeds_after_feedback_creation() {
        Feedback feedback = createFeedback(1L);
        LocalDateTime attemptedAt = LocalDateTime.of(2026, 4, 22, 20, 30, 15);
        Feedback updatedFeedback = createFeedback(1L);
        updatedFeedback.markNotificationSuccess(attemptedAt);
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.BUG, "버그 제보", "reply@cubinghub.com", "재현 경로");

        when(feedbackService.createFeedback("member@cubinghub.com", request)).thenReturn(feedback);
        when(feedbackService.getFeedbackWithUser(1L)).thenReturn(feedback);
        when(discordFeedbackNotifier.send(feedback)).thenReturn(FeedbackNotificationAttemptResult.success(attemptedAt));
        when(feedbackService.markNotificationSuccess(1L, attemptedAt)).thenReturn(updatedFeedback);

        FeedbackSubmissionResponse response = feedbackNotificationService.createFeedbackAndNotify("member@cubinghub.com", request);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getNotificationStatus().name()).isEqualTo("SUCCESS");
        assertThat(response.getNotificationAttemptCount()).isEqualTo(1);
        assertThat(response.isNotificationRetryAvailable()).isFalse();
        verify(feedbackService).markNotificationSuccess(1L, attemptedAt);
    }

    @Test
    @DisplayName("재시도 전송이 실패하면 실패 상태 응답을 반환한다")
    void should_return_failed_response_when_notification_retry_fails() {
        Feedback feedback = createFeedback(2L);
        LocalDateTime previousAttemptAt = LocalDateTime.of(2026, 4, 22, 20, 35, 10);
        feedback.markNotificationFailure(previousAttemptAt, "첫 실패");
        LocalDateTime retriedAt = LocalDateTime.of(2026, 4, 22, 20, 36, 20);
        Feedback failedFeedback = createFeedback(2L);
        failedFeedback.markNotificationFailure(previousAttemptAt, "첫 실패");
        failedFeedback.markNotificationFailure(retriedAt, "Discord webhook 응답 실패 (500)");

        when(feedbackService.getFeedbackForRetry(2L, "member@cubinghub.com")).thenReturn(feedback);
        when(feedbackService.getFeedbackWithUser(2L)).thenReturn(feedback);
        when(discordFeedbackNotifier.send(feedback)).thenReturn(FeedbackNotificationAttemptResult.failure(retriedAt, "Discord webhook 응답 실패 (500)"));
        when(feedbackService.markNotificationFailure(eq(2L), eq(retriedAt), any())).thenReturn(failedFeedback);

        FeedbackSubmissionResponse response = feedbackNotificationService.retryNotification(2L, "member@cubinghub.com");

        assertThat(response.getId()).isEqualTo(2L);
        assertThat(response.getNotificationStatus().name()).isEqualTo("FAILED");
        assertThat(response.getNotificationAttemptCount()).isEqualTo(2);
        assertThat(response.isNotificationRetryAvailable()).isTrue();
        verify(feedbackService).markNotificationFailure(2L, retriedAt, "Discord webhook 응답 실패 (500)");
    }

    private Feedback createFeedback(Long feedbackId) {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "member@cubinghub.com", "Member", com.cubinghub.domain.user.entity.UserRole.ROLE_USER, com.cubinghub.domain.user.entity.UserStatus.ACTIVE))
                .type(FeedbackType.BUG)
                .title("버그 제보")
                .replyEmail("reply@cubinghub.com")
                .content("재현 경로")
                .build();
        ReflectionTestUtils.setField(feedback, "id", feedbackId);
        return feedback;
    }
}
