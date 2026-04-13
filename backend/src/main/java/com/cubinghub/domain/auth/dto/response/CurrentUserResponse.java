package com.cubinghub.domain.auth.dto.response;

import lombok.Getter;

@Getter
public class CurrentUserResponse {

    private final Long userId;
    private final String email;
    private final String nickname;

    public CurrentUserResponse(Long userId, String email, String nickname) {
        this.userId = userId;
        this.email = email;
        this.nickname = nickname;
    }
}
