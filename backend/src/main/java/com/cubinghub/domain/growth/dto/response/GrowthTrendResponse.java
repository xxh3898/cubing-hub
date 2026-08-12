package com.cubinghub.domain.growth.dto.response;

import com.cubinghub.domain.record.entity.EventType;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record GrowthTrendResponse(
        EventType eventType,
        String period,
        String timeZone,
        Instant generatedAt,
        LocalDate fromDate,
        LocalDate toDate,
        boolean todayPartial,
        List<TrendPointResponse> points
) {

    public GrowthTrendResponse {
        points = List.copyOf(points);
    }

    public record TrendPointResponse(
            LocalDate date,
            int recordCount,
            int rankableCount,
            @JsonInclude(JsonInclude.Include.ALWAYS)
            Integer medianTimeMs,
            int dnfCount,
            int plusTwoCount
    ) {
    }
}
