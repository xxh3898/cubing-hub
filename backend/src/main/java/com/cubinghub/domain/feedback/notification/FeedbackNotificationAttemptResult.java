package com.cubinghub.domain.feedback.notification;

import java.time.Instant;

public record FeedbackNotificationAttemptResult(
        boolean success,
        Instant attemptedAt,
        String errorMessage
) {

    public static FeedbackNotificationAttemptResult success(Instant attemptedAt) {
        return new FeedbackNotificationAttemptResult(true, attemptedAt, null);
    }

    public static FeedbackNotificationAttemptResult failure(Instant attemptedAt, String errorMessage) {
        return new FeedbackNotificationAttemptResult(false, attemptedAt, errorMessage);
    }
}
