package com.cubinghub.domain.feedback.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.common.response.IdResponse;
import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.service.FeedbackService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<ApiResponse<IdResponse>> createFeedback(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid FeedbackCreateRequest request
    ) {
        Long feedbackId = feedbackService.createFeedback(userDetails != null ? userDetails.getUsername() : null, request);

        return ResponseEntity.created(URI.create("/api/feedbacks/" + feedbackId))
                .body(ApiResponse.success(HttpStatus.CREATED, "피드백이 접수되었습니다.", new IdResponse(feedbackId)));
    }
}
