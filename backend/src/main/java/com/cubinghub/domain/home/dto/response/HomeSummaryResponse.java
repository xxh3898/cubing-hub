package com.cubinghub.domain.home.dto.response;

import com.cubinghub.domain.user.dto.response.MyProfileResponse;
import lombok.Getter;

@Getter
public class HomeSummaryResponse {

    private final String nickname;
    private final String mainEvent;
    private final Integer totalSolveCount;
    private final Integer personalBestTimeMs;
    private final Integer averageTimeMs;

    public HomeSummaryResponse(
            String nickname,
            String mainEvent,
            Integer totalSolveCount,
            Integer personalBestTimeMs,
            Integer averageTimeMs
    ) {
        this.nickname = nickname;
        this.mainEvent = mainEvent;
        this.totalSolveCount = totalSolveCount;
        this.personalBestTimeMs = personalBestTimeMs;
        this.averageTimeMs = averageTimeMs;
    }

    public static HomeSummaryResponse from(MyProfileResponse profile) {
        return new HomeSummaryResponse(
                profile.getNickname(),
                profile.getMainEvent(),
                profile.getSummary().getTotalSolveCount(),
                profile.getSummary().getPersonalBestTimeMs(),
                profile.getSummary().getAverageTimeMs()
        );
    }
}
