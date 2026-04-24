package com.cubinghub.domain.feedback.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.support.TestFixtures;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("AdminFeedbackDetailResponse 단위 테스트")
class AdminFeedbackDetailResponseTest {

    @Test
    @DisplayName("알림 메타데이터가 null이면 기본값으로 응답을 만든다")
    void should_use_default_notification_values_when_feedback_metadata_is_null() {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "user@cubinghub.com", "FeedbackUser", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.BUG)
                .title("버그 제보")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();
        ReflectionTestUtils.setField(feedback, "id", 10L);
        ReflectionTestUtils.setField(feedback, "notificationStatus", null);
        ReflectionTestUtils.setField(feedback, "notificationAttemptCount", null);

        AdminFeedbackDetailResponse response = AdminFeedbackDetailResponse.from(feedback);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getNotificationStatus()).isEqualTo(FeedbackNotificationStatus.PENDING);
        assertThat(response.getNotificationAttemptCount()).isZero();
        assertThat(response.isNotificationRetryAvailable()).isTrue();
        assertThat(response.isAnswered()).isFalse();
    }

    @Test
    @DisplayName("성공적으로 답변되고 공개된 피드백이면 retry 불가와 answered 상태를 반환한다")
    void should_mark_retry_unavailable_when_feedback_notification_succeeded() {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "user@cubinghub.com", "FeedbackUser", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.FEATURE)
                .title("기능 제안")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();
        feedback.markNotificationSuccess(LocalDateTime.of(2026, 4, 24, 11, 0, 0));
        feedback.updateAnswer(
                TestFixtures.createUser(2L, "admin@cubinghub.com", "Admin", UserRole.ROLE_ADMIN, UserStatus.ACTIVE),
                "답변 완료",
                LocalDateTime.of(2026, 4, 24, 11, 5, 0)
        );
        feedback.updateVisibility(FeedbackVisibility.PUBLIC, LocalDateTime.of(2026, 4, 24, 11, 6, 0));

        AdminFeedbackDetailResponse response = AdminFeedbackDetailResponse.from(feedback);

        assertThat(response.getSubmitterNickname()).isEqualTo("FeedbackUser");
        assertThat(response.getNotificationStatus()).isEqualTo(FeedbackNotificationStatus.SUCCESS);
        assertThat(response.isNotificationRetryAvailable()).isFalse();
        assertThat(response.isAnswered()).isTrue();
        assertThat(response.getVisibility()).isEqualTo(FeedbackVisibility.PUBLIC);
        assertThat(response.getPublishedAt()).isNotNull();
    }
}
