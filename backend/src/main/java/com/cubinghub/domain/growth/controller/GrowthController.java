package com.cubinghub.domain.growth.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.growth.dto.response.GrowthPbProgressionPageResponse;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse;
import com.cubinghub.domain.growth.dto.response.GrowthTrendResponse;
import com.cubinghub.domain.growth.service.GrowthReadService;
import com.cubinghub.domain.record.entity.EventType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/growth")
@RequiredArgsConstructor
public class GrowthController {

    private final GrowthReadService growthReadService;

    @GetMapping
    public ResponseEntity<ApiResponse<GrowthSummaryResponse>> getSummary(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam EventType eventType
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "성장 요약을 조회했습니다.",
                        growthReadService.getSummary(userDetails.getUsername(), eventType)
                )
        );
    }

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<GrowthTrendResponse>> getTrend(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam EventType eventType,
            @RequestParam String period
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "성장 추세를 조회했습니다.",
                        growthReadService.getTrend(userDetails.getUsername(), eventType, period)
                )
        );
    }

    @GetMapping("/pb-progression")
    public ResponseEntity<ApiResponse<GrowthPbProgressionPageResponse>> getPbProgression(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam EventType eventType,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "50") Integer size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "PB progression을 조회했습니다.",
                        growthReadService.getPbProgression(userDetails.getUsername(), eventType, page, size)
                )
        );
    }
}
