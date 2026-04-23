package com.cubinghub.domain.feedback.dto.response;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
public class AdminFeedbackDetailResponse {

    private final Long id;
    private final FeedbackType type;
    private final String title;
    private final String content;
    private final String replyEmail;
    private final String submitterNickname;
    private final FeedbackNotificationStatus notificationStatus;
    private final Integer notificationAttemptCount;
    private final boolean notificationRetryAvailable;
    private final FeedbackVisibility visibility;
    private final String answer;
    private final boolean answered;
    private final LocalDateTime createdAt;
    private final LocalDateTime answeredAt;
    private final LocalDateTime publishedAt;

    public AdminFeedbackDetailResponse(
            Long id,
            FeedbackType type,
            String title,
            String content,
            String replyEmail,
            String submitterNickname,
            FeedbackNotificationStatus notificationStatus,
            Integer notificationAttemptCount,
            boolean notificationRetryAvailable,
            FeedbackVisibility visibility,
            String answer,
            boolean answered,
            LocalDateTime createdAt,
            LocalDateTime answeredAt,
            LocalDateTime publishedAt
    ) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.content = content;
        this.replyEmail = replyEmail;
        this.submitterNickname = submitterNickname;
        this.notificationStatus = notificationStatus;
        this.notificationAttemptCount = notificationAttemptCount;
        this.notificationRetryAvailable = notificationRetryAvailable;
        this.visibility = visibility;
        this.answer = answer;
        this.answered = answered;
        this.createdAt = createdAt;
        this.answeredAt = answeredAt;
        this.publishedAt = publishedAt;
    }

    public static AdminFeedbackDetailResponse from(Feedback feedback) {
        FeedbackNotificationStatus notificationStatus = feedback.getNotificationStatus() == null
                ? FeedbackNotificationStatus.PENDING
                : feedback.getNotificationStatus();

        return new AdminFeedbackDetailResponse(
                feedback.getId(),
                feedback.getType(),
                feedback.getTitle(),
                feedback.getContent(),
                feedback.getReplyEmail(),
                feedback.getUser().getNickname(),
                notificationStatus,
                feedback.getNotificationAttemptCount() == null ? 0 : feedback.getNotificationAttemptCount(),
                notificationStatus != FeedbackNotificationStatus.SUCCESS,
                feedback.getVisibility(),
                feedback.getAnswer(),
                feedback.isAnswered(),
                feedback.getCreatedAt(),
                feedback.getAnsweredAt(),
                feedback.getPublishedAt()
        );
    }
}
