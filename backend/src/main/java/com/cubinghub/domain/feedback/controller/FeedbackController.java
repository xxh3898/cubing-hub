package com.cubinghub.domain.feedback.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.dto.response.FeedbackSubmissionResponse;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import com.cubinghub.domain.feedback.service.FeedbackNotificationService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackNotificationService feedbackNotificationService;

    @PostMapping
    public ResponseEntity<ApiResponse<FeedbackSubmissionResponse>> createFeedback(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid FeedbackCreateRequest request
    ) {
        FeedbackSubmissionResponse response = feedbackNotificationService.createFeedbackAndNotify(
                userDetails != null ? userDetails.getUsername() : null,
                request
        );

        return ResponseEntity.created(URI.create("/api/feedbacks/" + response.getId()))
                .body(ApiResponse.success(HttpStatus.CREATED, buildCreateMessage(response.getNotificationStatus()), response));
    }

    @PostMapping("/{feedbackId}/notification-retry")
    public ResponseEntity<ApiResponse<FeedbackSubmissionResponse>> retryFeedbackNotification(
            @PathVariable Long feedbackId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        FeedbackSubmissionResponse response = feedbackNotificationService.retryNotification(
                feedbackId,
                userDetails != null ? userDetails.getUsername() : null
        );

        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, buildRetryMessage(response.getNotificationStatus()), response));
    }

    private String buildCreateMessage(FeedbackNotificationStatus notificationStatus) {
        if (notificationStatus == FeedbackNotificationStatus.SUCCESS) {
            return "피드백이 접수되었고 Discord 운영 알림 전송을 완료했습니다.";
        }

        return "피드백이 저장되었지만 Discord 운영 알림 전송에 실패했습니다. 다시 시도해주세요.";
    }

    private String buildRetryMessage(FeedbackNotificationStatus notificationStatus) {
        if (notificationStatus == FeedbackNotificationStatus.SUCCESS) {
            return "Discord 운영 알림 재전송을 완료했습니다.";
        }

        return "Discord 운영 알림 재전송에 실패했습니다. 다시 시도해주세요.";
    }
}
