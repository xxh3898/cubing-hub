package com.cubinghub.domain.growth.dto.response;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import java.time.Instant;
import java.util.List;

public record GrowthPbProgressionPageResponse(
        EventType eventType,
        String basis,
        String timeZone,
        List<PbProgressionPointResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious
) {

    public GrowthPbProgressionPageResponse {
        content = List.copyOf(content);
    }

    public record PbProgressionPointResponse(
            long recordId,
            int timeMs,
            Penalty penalty,
            int effectiveTimeMs,
            Instant createdAt
    ) {
    }
}
