package com.cubinghub.domain.record.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.common.response.IdResponse;
import com.cubinghub.domain.record.dto.request.RecordPenaltyUpdateRequest;
import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.dto.response.RecordPenaltyUpdateResponse;
import com.cubinghub.domain.record.service.RecordService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
public class RecordController {

    private final RecordService recordService;

    @PostMapping
    public ResponseEntity<ApiResponse<IdResponse>> saveRecord(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid RecordSaveRequest request
    ) {
        Long recordId = recordService.saveRecord(userDetails.getUsername(), request);
        return ResponseEntity.created(URI.create("/api/records/" + recordId))
                .body(ApiResponse.success(HttpStatus.CREATED, "기록이 저장되었습니다.", new IdResponse(recordId)));
    }

    @PatchMapping("/{recordId}")
    public ResponseEntity<ApiResponse<RecordPenaltyUpdateResponse>> updateRecordPenalty(
            @PathVariable Long recordId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid RecordPenaltyUpdateRequest request
    ) {
        RecordPenaltyUpdateResponse response = recordService.updateRecordPenalty(recordId, userDetails.getUsername(), request);
        return ResponseEntity.ok(
                ApiResponse.success(HttpStatus.OK, "기록 페널티가 수정되었습니다.", response)
        );
    }

    @DeleteMapping("/{recordId}")
    public ResponseEntity<ApiResponse<Void>> deleteRecord(
            @PathVariable Long recordId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        recordService.deleteRecord(recordId, userDetails.getUsername());
        return ResponseEntity.ok(
                ApiResponse.success(HttpStatus.OK, "기록이 삭제되었습니다.", null)
        );
    }
}
