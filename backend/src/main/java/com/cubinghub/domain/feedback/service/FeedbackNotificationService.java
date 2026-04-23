package com.cubinghub.domain.feedback.service;

import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.dto.response.FeedbackSubmissionResponse;
import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.notification.DiscordFeedbackNotifier;
import com.cubinghub.domain.feedback.notification.FeedbackNotificationAttemptResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FeedbackNotificationService {

    private final FeedbackService feedbackService;
    private final DiscordFeedbackNotifier discordFeedbackNotifier;

    public FeedbackSubmissionResponse createFeedbackAndNotify(String email, FeedbackCreateRequest request) {
        Feedback feedback = feedbackService.createFeedback(email, request);
        return attemptNotification(feedback.getId());
    }

    private FeedbackSubmissionResponse attemptNotification(Long feedbackId) {
        Feedback feedback = feedbackService.getFeedbackWithUser(feedbackId);
        FeedbackNotificationAttemptResult result = discordFeedbackNotifier.send(feedback);

        Feedback updatedFeedback = result.success()
                ? feedbackService.markNotificationSuccess(feedbackId, result.attemptedAt())
                : feedbackService.markNotificationFailure(feedbackId, result.attemptedAt(), result.errorMessage());

        return FeedbackSubmissionResponse.from(updatedFeedback);
    }
}
