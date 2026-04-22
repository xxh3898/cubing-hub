package com.cubinghub.domain.record.repository;

public record RecordSummaryQueryResult(
        Long totalSolveCount,
        Integer personalBestTimeMs,
        Double averageTimeMs
) {
}
