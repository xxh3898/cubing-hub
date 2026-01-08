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
    public static class LoginRequest {

        @JsonProperty("user_id")
        @NotBlank(message = "사용자 ID는 필수입니다")
        private String userId;

        @JsonProperty("user_pwd")
        @NotBlank(message = "비밀번호는 필수입니다")
        private String userPwd;
    }

    @Getter
    @AllArgsConstructor
    @Builder
    public static class LoginResponse {

        @JsonProperty("token")
        private String token;
        @JsonProperty("id")
        private String userId;
        @JsonProperty("name")
        private String userName;
        @JsonProperty("age")
        private Integer age;
        @JsonProperty("role")
        private String role;
    }
}
