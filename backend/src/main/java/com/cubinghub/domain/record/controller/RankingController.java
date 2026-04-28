package com.cubinghub.domain.record.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.record.dto.response.RankingPageResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.service.RecordService;
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
@RequestMapping("/api/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RecordService recordService;

    @GetMapping
    public ResponseEntity<ApiResponse<RankingPageResponse>> getRankings(
            @RequestParam EventType eventType,
            @RequestParam(required = false) String nickname,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "25") Integer size,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "랭킹을 조회했습니다.",
                        recordService.getRankings(
                                eventType,
                                nickname,
                                page,
                                size,
                                userDetails != null ? userDetails.getUsername() : null
                        )
                )
        );
    }
}
