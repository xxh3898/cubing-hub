package com.cubinghub.domain.auth.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.auth.dto.response.CurrentUserResponse;
import com.cubinghub.domain.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserContextController {

    private final AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CurrentUserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "현재 로그인 사용자를 조회했습니다.",
                        authService.getCurrentUser(userDetails.getUsername())
                )
        );
    }
}
