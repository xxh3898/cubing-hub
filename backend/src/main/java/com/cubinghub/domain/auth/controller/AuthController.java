package com.cubinghub.domain.auth.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.auth.cookie.RefreshTokenCookieManager;
import com.cubinghub.domain.auth.dto.request.EmailVerificationConfirmRequest;
import com.cubinghub.domain.auth.dto.request.EmailVerificationRequest;
import com.cubinghub.domain.auth.dto.response.AuthResponse;
import com.cubinghub.domain.auth.dto.request.LoginRequest;
import com.cubinghub.domain.auth.dto.request.SignUpRequest;
import com.cubinghub.domain.auth.service.AuthService;
import com.cubinghub.domain.auth.service.TokenDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieManager refreshTokenCookieManager;

    @PostMapping("/email-verification/request")
    public ResponseEntity<ApiResponse<Void>> requestEmailVerification(
            @Valid @RequestBody EmailVerificationRequest request
    ) {
        authService.requestEmailVerification(request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "인증번호를 이메일로 전송했습니다."));
    }

    @PostMapping("/email-verification/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmEmailVerification(
            @Valid @RequestBody EmailVerificationConfirmRequest request
    ) {
        authService.confirmEmailVerification(request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "이메일 인증이 완료되었습니다."));
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> signUp(@Valid @RequestBody SignUpRequest request) {
        authService.signUp(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(HttpStatus.CREATED, "회원가입이 완료되었습니다."));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        TokenDto tokenDto = authService.login(request);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieManager.create(tokenDto.getRefreshToken()).toString())
                .body(ApiResponse.success(HttpStatus.OK, "로그인에 성공했습니다.", new AuthResponse(tokenDto.getAccessToken())));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@CookieValue(value = "refresh_token", required = true) String refreshToken) {
        TokenDto tokenDto = authService.refresh(refreshToken);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieManager.create(tokenDto.getRefreshToken()).toString())
                .body(ApiResponse.success(HttpStatus.OK, "토큰이 재발급되었습니다.", new AuthResponse(tokenDto.getAccessToken())));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @CookieValue(value = "refresh_token", required = false) String refreshToken) {
            
        String accessToken = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }

        authService.logout(refreshToken, accessToken);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieManager.expire().toString())
                .body(ApiResponse.success(HttpStatus.OK, "로그아웃이 완료되었습니다."));
    }
}
