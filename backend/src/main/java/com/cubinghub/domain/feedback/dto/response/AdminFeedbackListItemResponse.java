package com.cubinghub.domain.feedback.dto.response;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
public class AdminFeedbackListItemResponse {

    private final Long id;
    private final FeedbackType type;
    private final String title;
    private final String content;
    private final String answer;
    private final String submitterNickname;
    private final FeedbackNotificationStatus notificationStatus;
    private final FeedbackVisibility visibility;
    private final boolean answered;
    private final LocalDateTime createdAt;
    private final LocalDateTime answeredAt;

    public AdminFeedbackListItemResponse(
            Long id,
            FeedbackType type,
            String title,
            String content,
            String answer,
            String submitterNickname,
            FeedbackNotificationStatus notificationStatus,
            FeedbackVisibility visibility,
            boolean answered,
            LocalDateTime createdAt,
            LocalDateTime answeredAt
    ) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.content = content;
        this.answer = answer;
        this.submitterNickname = submitterNickname;
        this.notificationStatus = notificationStatus;
        this.visibility = visibility;
        this.answered = answered;
        this.createdAt = createdAt;
        this.answeredAt = answeredAt;
    }

    public static AdminFeedbackListItemResponse from(Feedback feedback) {
        return new AdminFeedbackListItemResponse(
                feedback.getId(),
                feedback.getType(),
                feedback.getTitle(),
                feedback.getContent(),
                feedback.getAnswer(),
                feedback.getUser().getNickname(),
                feedback.getNotificationStatus(),
                feedback.getVisibility(),
                feedback.isAnswered(),
                feedback.getCreatedAt(),
                feedback.getAnsweredAt()
        );
    }
}
