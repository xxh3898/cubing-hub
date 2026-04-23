package com.cubinghub.domain.feedback.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.feedback.dto.request.FeedbackAnswerUpdateRequest;
import com.cubinghub.domain.feedback.dto.request.FeedbackVisibilityUpdateRequest;
import com.cubinghub.domain.feedback.dto.response.AdminFeedbackDetailResponse;
import com.cubinghub.domain.feedback.dto.response.AdminFeedbackPageResponse;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
import com.cubinghub.domain.feedback.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/feedbacks")
@RequiredArgsConstructor
public class AdminFeedbackController {

    private final FeedbackService feedbackService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminFeedbackPageResponse>> getAdminFeedbacks(
            @RequestParam(required = false) Boolean answered,
            @RequestParam(required = false) FeedbackVisibility visibility,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "8") Integer size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "관리자 피드백 목록을 조회했습니다.",
                        feedbackService.getAdminFeedbacks(answered, visibility, page, size)
                )
        );
    }

    @GetMapping("/{feedbackId}")
    public ResponseEntity<ApiResponse<AdminFeedbackDetailResponse>> getAdminFeedback(
            @PathVariable Long feedbackId
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "관리자 피드백 상세를 조회했습니다.",
                        feedbackService.getAdminFeedbackDetail(feedbackId)
                )
        );
    }

    @PatchMapping("/{feedbackId}/answer")
    public ResponseEntity<ApiResponse<AdminFeedbackDetailResponse>> updateFeedbackAnswer(
            @PathVariable Long feedbackId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid FeedbackAnswerUpdateRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "피드백 답변을 저장했습니다.",
                        feedbackService.updateAnswer(feedbackId, userDetails.getUsername(), request.getAnswer())
                )
        );
    }

    @PatchMapping("/{feedbackId}/visibility")
    public ResponseEntity<ApiResponse<AdminFeedbackDetailResponse>> updateFeedbackVisibility(
            @PathVariable Long feedbackId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid FeedbackVisibilityUpdateRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "피드백 공개 상태를 변경했습니다.",
                        feedbackService.updateVisibility(feedbackId, userDetails.getUsername(), request.getVisibility())
                )
        );
    }
}
