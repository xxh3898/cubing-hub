package com.cubinghub.domain.feedback.dto.response;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import lombok.Getter;

@Getter
public class FeedbackSubmissionResponse {

    private final Long id;
    private final FeedbackNotificationStatus notificationStatus;
    private final Integer notificationAttemptCount;
    private final boolean notificationRetryAvailable;

    public FeedbackSubmissionResponse(
            Long id,
            FeedbackNotificationStatus notificationStatus,
            Integer notificationAttemptCount,
            boolean notificationRetryAvailable
    ) {
        this.id = id;
        this.notificationStatus = notificationStatus;
        this.notificationAttemptCount = notificationAttemptCount;
        this.notificationRetryAvailable = notificationRetryAvailable;
    }

    public static FeedbackSubmissionResponse from(Feedback feedback) {
        FeedbackNotificationStatus notificationStatus = feedback.getNotificationStatus() == null
                ? FeedbackNotificationStatus.PENDING
                : feedback.getNotificationStatus();

        return new FeedbackSubmissionResponse(
                feedback.getId(),
                notificationStatus,
                feedback.getNotificationAttemptCount() == null ? 0 : feedback.getNotificationAttemptCount(),
                notificationStatus != FeedbackNotificationStatus.SUCCESS
        );
    }
}
