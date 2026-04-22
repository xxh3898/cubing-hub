package com.cubinghub.domain.feedback.notification;

import java.time.LocalDateTime;

public record FeedbackNotificationAttemptResult(
        boolean success,
        LocalDateTime attemptedAt,
        String errorMessage
) {

    public static FeedbackNotificationAttemptResult success(LocalDateTime attemptedAt) {
        return new FeedbackNotificationAttemptResult(true, attemptedAt, null);
    }

    public static FeedbackNotificationAttemptResult failure(LocalDateTime attemptedAt, String errorMessage) {
        return new FeedbackNotificationAttemptResult(false, attemptedAt, errorMessage);
    }
}
