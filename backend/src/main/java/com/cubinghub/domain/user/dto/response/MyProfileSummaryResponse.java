package com.cubinghub.domain.user.dto.response;

import lombok.Getter;

@Getter
public class MyProfileSummaryResponse {

    private final Integer totalSolveCount;
    private final Integer personalBestTimeMs;
    private final Integer averageTimeMs;

    public MyProfileSummaryResponse(Integer totalSolveCount, Integer personalBestTimeMs, Integer averageTimeMs) {
        this.totalSolveCount = totalSolveCount;
        this.personalBestTimeMs = personalBestTimeMs;
        this.averageTimeMs = averageTimeMs;
    }
}
