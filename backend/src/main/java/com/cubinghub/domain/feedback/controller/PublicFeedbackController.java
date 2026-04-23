package com.cubinghub.domain.feedback.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.feedback.dto.response.PublicFeedbackDetailResponse;
import com.cubinghub.domain.feedback.dto.response.PublicFeedbackPageResponse;
import com.cubinghub.domain.feedback.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/qna")
@RequiredArgsConstructor
public class PublicFeedbackController {

    private final FeedbackService feedbackService;

    @GetMapping
    public ResponseEntity<ApiResponse<PublicFeedbackPageResponse>> getPublicQna(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "8") Integer size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "공개 질문 목록을 조회했습니다.",
                        feedbackService.getPublicFeedbacks(page, size)
                )
        );
    }

    @GetMapping("/{feedbackId}")
    public ResponseEntity<ApiResponse<PublicFeedbackDetailResponse>> getPublicQnaDetail(
            @PathVariable Long feedbackId
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "공개 질문 상세를 조회했습니다.",
                        feedbackService.getPublicFeedbackDetail(feedbackId)
                )
        );
    }
}
