package com.cubinghub.domain.user.dto.response;

import lombok.Getter;

@Getter
public class MyProfileResponse {

    private final Long userId;
    private final String nickname;
    private final String mainEvent;
    private final MyProfileSummaryResponse summary;

    public MyProfileResponse(
            Long userId,
            String nickname,
            String mainEvent,
            MyProfileSummaryResponse summary
    ) {
        this.userId = userId;
        this.nickname = nickname;
        this.mainEvent = mainEvent;
        this.summary = summary;
    }
}
