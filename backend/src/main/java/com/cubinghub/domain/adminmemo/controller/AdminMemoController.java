package com.cubinghub.domain.adminmemo.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.common.response.IdResponse;
import com.cubinghub.domain.adminmemo.dto.request.AdminMemoCreateRequest;
import com.cubinghub.domain.adminmemo.dto.request.AdminMemoUpdateRequest;
import com.cubinghub.domain.adminmemo.dto.response.AdminMemoDetailResponse;
import com.cubinghub.domain.adminmemo.dto.response.AdminMemoPageResponse;
import com.cubinghub.domain.adminmemo.service.AdminMemoService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/memos")
@RequiredArgsConstructor
public class AdminMemoController {

    private final AdminMemoService adminMemoService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminMemoPageResponse>> getAdminMemos(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "8") Integer size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "관리자 메모 목록을 조회했습니다.",
                        adminMemoService.getMemos(page, size)
                )
        );
    }

    @GetMapping("/{memoId}")
    public ResponseEntity<ApiResponse<AdminMemoDetailResponse>> getAdminMemo(
            @PathVariable Long memoId
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "관리자 메모 상세를 조회했습니다.",
                        adminMemoService.getMemo(memoId)
                )
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<IdResponse>> createAdminMemo(
            @RequestBody @Valid AdminMemoCreateRequest request
    ) {
        Long memoId = adminMemoService.createMemo(request);
        return ResponseEntity.created(URI.create("/api/admin/memos/" + memoId))
                .body(ApiResponse.success(HttpStatus.CREATED, "관리자 메모를 생성했습니다.", new IdResponse(memoId)));
    }

    @PatchMapping("/{memoId}")
    public ResponseEntity<ApiResponse<AdminMemoDetailResponse>> updateAdminMemo(
            @PathVariable Long memoId,
            @RequestBody @Valid AdminMemoUpdateRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "관리자 메모를 수정했습니다.",
                        adminMemoService.updateMemo(memoId, request)
                )
        );
    }

    @DeleteMapping("/{memoId}")
    public ResponseEntity<ApiResponse<Void>> deleteAdminMemo(
            @PathVariable Long memoId
    ) {
        adminMemoService.deleteMemo(memoId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "관리자 메모를 삭제했습니다."));
    }
}
