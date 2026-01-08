package com.cube.cube_server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class AuthDto {

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginRequest {

        @NotBlank(message = "사용자 ID는 필수입니다")
        private String id;

        @NotBlank(message = "비밀번호는 필수입니다")
        private String password;
    }

    @Getter
    @AllArgsConstructor
    @Builder
    public static class LoginResponse {

        private String token;
        private String id;
        private String name;
        private String role;
    }
}
