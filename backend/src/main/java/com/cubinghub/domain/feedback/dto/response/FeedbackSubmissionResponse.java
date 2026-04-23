package com.cubinghub.domain.feedback.dto.response;

import com.cubinghub.domain.feedback.entity.Feedback;
import lombok.Getter;

@Getter
public class FeedbackSubmissionResponse {

    private final Long id;

    public FeedbackSubmissionResponse(Long id) {
        this.id = id;
    }

    public static FeedbackSubmissionResponse from(Feedback feedback) {
        return new FeedbackSubmissionResponse(feedback.getId());
    }
}
