package com.cubinghub.domain.feedback.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.support.TestFixtures;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Feedback 엔티티 단위 테스트")
class FeedbackTest {

    @Test
    @DisplayName("생성 직후 피드백은 기본 알림 상태와 비공개 상태를 가진다")
    void should_initialize_default_notification_and_visibility_when_feedback_is_created() {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "user@cubinghub.com", "FeedbackUser", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.BUG)
                .title("제목")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();

        assertThat(feedback.getNotificationStatus()).isEqualTo(FeedbackNotificationStatus.PENDING);
        assertThat(feedback.getNotificationAttemptCount()).isZero();
        assertThat(feedback.getVisibility()).isEqualTo(FeedbackVisibility.PRIVATE);
        assertThat(feedback.isNotificationRetryAvailable()).isTrue();
    }

    @Test
    @DisplayName("알림 실패 메시지가 길면 500자 이하로 잘라서 저장한다")
    void should_truncate_notification_error_when_error_message_is_too_long() {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "user@cubinghub.com", "FeedbackUser", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.BUG)
                .title("제목")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();

        feedback.markNotificationFailure(Instant.parse("2026-04-24T12:00:00Z"), "x".repeat(700));

        assertThat(feedback.getNotificationStatus()).isEqualTo(FeedbackNotificationStatus.FAILED);
        assertThat(feedback.getNotificationAttemptCount()).isEqualTo(1);
        assertThat(feedback.getNotificationLastError()).hasSize(500).endsWith("...");
        assertThat(feedback.isNotificationRetryAvailable()).isTrue();
    }

    @Test
    @DisplayName("짧은 실패 메시지는 그대로 저장하고 성공 시 retry 불가 상태가 된다")
    void should_keep_short_error_message_and_disable_retry_after_success() {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "user@cubinghub.com", "FeedbackUser", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.BUG)
                .title("제목")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();

        feedback.markNotificationFailure(Instant.parse("2026-04-24T12:05:00Z"), "짧은 오류");
        feedback.markNotificationSuccess(Instant.parse("2026-04-24T12:06:00Z"));

        assertThat(feedback.getNotificationLastError()).isNull();
        assertThat(feedback.getNotificationAttemptCount()).isEqualTo(2);
        assertThat(feedback.isNotificationRetryAvailable()).isFalse();
    }

    @Test
    @DisplayName("알림 시도 횟수가 null이어도 성공과 실패 처리 시 1부터 증가한다")
    void should_initialize_attempt_count_when_notification_attempt_count_is_null() {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "user@cubinghub.com", "FeedbackUser", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.BUG)
                .title("제목")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(feedback, "notificationAttemptCount", null);

        feedback.markNotificationSuccess(Instant.parse("2026-04-24T12:07:00Z"));
        org.springframework.test.util.ReflectionTestUtils.setField(feedback, "notificationAttemptCount", null);
        feedback.markNotificationFailure(Instant.parse("2026-04-24T12:08:00Z"), null);

        assertThat(feedback.getNotificationAttemptCount()).isEqualTo(1);
        assertThat(feedback.getNotificationLastError()).isNull();
    }

    @Test
    @DisplayName("답변과 공개 상태 변경은 answered 여부와 publishedAt을 함께 갱신한다")
    void should_update_answer_and_visibility_when_answer_and_visibility_change() {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "user@cubinghub.com", "FeedbackUser", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.FEATURE)
                .title("제목")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();
        Instant answeredAt = Instant.parse("2026-04-24T12:10:00Z");
        Instant publishedAt = Instant.parse("2026-04-24T12:11:00Z");

        feedback.updateAnswer(
                TestFixtures.createUser(2L, "admin@cubinghub.com", "Admin", UserRole.ROLE_ADMIN, UserStatus.ACTIVE),
                "답변",
                answeredAt
        );
        feedback.updateVisibility(FeedbackVisibility.PUBLIC, publishedAt);
        feedback.updateVisibility(FeedbackVisibility.PRIVATE, Instant.parse("2026-04-24T12:12:00Z"));

        assertThat(feedback.isAnswered()).isTrue();
        assertThat(feedback.getAnsweredAt()).isEqualTo(answeredAt);
        assertThat(feedback.getPublishedAt()).isNull();
    }

    @Test
    @DisplayName("공백 답변은 answered 상태로 보지 않는다")
    void should_return_false_for_answered_when_answer_is_blank() {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "user@cubinghub.com", "FeedbackUser", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.FEATURE)
                .title("제목")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();

        feedback.updateAnswer(
                TestFixtures.createUser(2L, "admin@cubinghub.com", "Admin", UserRole.ROLE_ADMIN, UserStatus.ACTIVE),
                " ",
                Instant.parse("2026-04-24T12:15:00Z")
        );

        assertThat(feedback.isAnswered()).isFalse();
    }
}
