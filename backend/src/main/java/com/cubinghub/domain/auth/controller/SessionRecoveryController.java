package com.cubinghub.domain.auth.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.auth.cookie.RefreshTokenCookieManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/session")
@RequiredArgsConstructor
public class SessionRecoveryController {

    private final RefreshTokenCookieManager refreshTokenCookieManager;

    @PostMapping("/clear-refresh-cookie")
    public ResponseEntity<ApiResponse<Void>> clearRefreshCookie() {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieManager.expire().toString())
                .body(ApiResponse.success(HttpStatus.OK, "refresh_token 쿠키를 정리했습니다."));
    }
}
