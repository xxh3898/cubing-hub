package com.cubinghub.domain.user.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.user.dto.response.MyRecordPageResponse;
import com.cubinghub.domain.user.dto.response.MyProfileResponse;
import com.cubinghub.domain.user.service.UserProfileService;
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
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<MyProfileResponse>> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "마이페이지 정보를 조회했습니다.",
                        userProfileService.getMyProfile(userDetails.getUsername())
                )
        );
    }

    @GetMapping("/records")
    public ResponseEntity<ApiResponse<MyRecordPageResponse>> getMyRecords(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "내 기록을 조회했습니다.",
                        userProfileService.getMyRecords(userDetails.getUsername(), page, size)
                )
        );
    }
}
