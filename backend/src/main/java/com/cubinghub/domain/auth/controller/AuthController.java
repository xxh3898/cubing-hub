package com.cubinghub.domain.auth.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.auth.dto.AuthResponse;
import com.cubinghub.domain.auth.dto.LoginRequest;
import com.cubinghub.domain.auth.dto.SignUpRequest;
import com.cubinghub.domain.auth.dto.TokenDto;
import com.cubinghub.domain.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> signUp(@Valid @RequestBody SignUpRequest request) {
        authService.signUp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success());
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        TokenDto tokenDto = authService.login(request);
        ResponseCookie cookie = createRefreshCookie(tokenDto.getRefreshToken(), 7 * 24 * 60 * 60);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.success(new AuthResponse(tokenDto.getAccessToken())));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@CookieValue("refresh_token") String refreshToken) {
        TokenDto tokenDto = authService.refresh(refreshToken);
        ResponseCookie cookie = createRefreshCookie(tokenDto.getRefreshToken(), 7 * 24 * 60 * 60);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.success(new AuthResponse(tokenDto.getAccessToken())));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @CookieValue(value = "refresh_token", required = false) String refreshToken
    ) {
        String accessToken = authHeader != null && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
        authService.logout(refreshToken, accessToken);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, createRefreshCookie("", 0).toString())
                .body(ApiResponse.success());
    }

    private ResponseCookie createRefreshCookie(String token, long maxAgeSeconds) {
        return ResponseCookie.from("refresh_token", token)
                .httpOnly(true)
                .secure(true)
                .path("/api/auth")
                .maxAge(maxAgeSeconds)
                .sameSite("Strict")
                .build();
    }
}
