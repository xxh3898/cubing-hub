package com.cubinghub.domain.home.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.home.dto.response.HomeResponse;
import com.cubinghub.domain.home.service.HomeService;
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
public class HomeController {

    private final HomeService homeService;

    @GetMapping("/home")
    public ResponseEntity<ApiResponse<HomeResponse>> getHome(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "홈 대시보드를 조회했습니다.",
                        homeService.getHome(userDetails != null ? userDetails.getUsername() : null)
                )
        );
    }
}
