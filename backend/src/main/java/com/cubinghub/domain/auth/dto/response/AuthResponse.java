package com.cubinghub.domain.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
public class AuthResponse {

    private final String accessToken;
    private final String tokenType = "Bearer";

    @Builder
    public AuthResponse(String accessToken) {
        this.accessToken = accessToken;
    }
}
