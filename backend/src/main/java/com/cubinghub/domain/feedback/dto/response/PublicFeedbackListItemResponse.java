package com.cubinghub.domain.feedback.dto.response;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
public class PublicFeedbackListItemResponse {

    private final Long id;
    private final FeedbackType type;
    private final String title;
    private final String content;
    private final String answer;
    private final String questionerLabel;
    private final String answererLabel;
    private final LocalDateTime createdAt;
    private final LocalDateTime answeredAt;
    private final LocalDateTime publishedAt;

    public PublicFeedbackListItemResponse(
            Long id,
            FeedbackType type,
            String title,
            String content,
            String answer,
            String questionerLabel,
            String answererLabel,
            LocalDateTime createdAt,
            LocalDateTime answeredAt,
            LocalDateTime publishedAt
    ) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.content = content;
        this.answer = answer;
        this.questionerLabel = questionerLabel;
        this.answererLabel = answererLabel;
        this.createdAt = createdAt;
        this.answeredAt = answeredAt;
        this.publishedAt = publishedAt;
    }

    public static PublicFeedbackListItemResponse from(Feedback feedback) {
        return new PublicFeedbackListItemResponse(
                feedback.getId(),
                feedback.getType(),
                feedback.getTitle(),
                feedback.getContent(),
                feedback.getAnswer(),
                "사용자",
                "관리자",
                feedback.getCreatedAt(),
                feedback.getAnsweredAt(),
                feedback.getPublishedAt()
        );
    }
}
