package com.cubinghub.domain.auth.dto.response;

import com.cubinghub.domain.user.entity.UserRole;
import lombok.Getter;

@Getter
public class CurrentUserResponse {

    private final Long userId;
    private final String email;
    private final String nickname;
    private final UserRole role;

    public CurrentUserResponse(Long userId, String email, String nickname, UserRole role) {
        this.userId = userId;
        this.email = email;
        this.nickname = nickname;
        this.role = role;
    }
}
