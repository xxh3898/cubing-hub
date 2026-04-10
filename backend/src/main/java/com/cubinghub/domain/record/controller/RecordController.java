package com.cubinghub.domain.record.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.record.dto.RecordSaveRequest;
import com.cubinghub.domain.record.service.RecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
public class RecordController {

    private final RecordService recordService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> saveRecord(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid RecordSaveRequest request
    ) {
        Long recordId = recordService.saveRecord(userDetails.getUsername(), request);
        return ResponseEntity.created(URI.create("/api/records/" + recordId)).body(ApiResponse.success());
    }
}
