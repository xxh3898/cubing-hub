package com.cubinghub.domain.record.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.record.dto.response.ScrambleResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.service.ScrambleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scramble")
@RequiredArgsConstructor
public class ScrambleController {

    private final ScrambleService scrambleService;

    @GetMapping
    public ResponseEntity<ApiResponse<ScrambleResponse>> getScramble(@RequestParam EventType eventType) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "스크램블을 생성했습니다.",
                        scrambleService.generate(eventType)
                )
        );
    }
}
