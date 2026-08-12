package com.cubinghub.domain.growth.dto.response;

import com.cubinghub.domain.growth.metric.GrowthMetricCalculator;
import com.cubinghub.domain.growth.metric.GrowthMetricStatus;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record GrowthSummaryResponse(
        EventType eventType,
        String timeZone,
        Instant generatedAt,
        LocalDate asOfDate,
        CurrentPbResponse currentPb,
        AverageMetricResponse recentAo5,
        AverageMetricResponse recentAo12,
        PerformanceComparisonResponse performanceComparison,
        ConsistencyResponse consistency,
        ActivityResponse activity
) {

    public record CurrentPbResponse(
            GrowthMetricStatus status,
            Long recordId,
            Integer timeMs,
            Penalty penalty,
            Integer effectiveTimeMs,
            Instant createdAt
    ) {
    }

    public record AverageMetricResponse(
            GrowthMetricStatus status,
            int windowSize,
            int recordCount,
            Integer valueMs
    ) {
    }

    public record PerformanceComparisonResponse(
            GrowthMetricStatus status,
            PeriodResponse recentPeriod,
            PeriodResponse previousPeriod,
            GrowthMetricCalculator.PerformanceDirection direction,
            BigDecimal improvementPercent
    ) {
    }

    public record PeriodResponse(
            LocalDate fromDate,
            LocalDate toDateExclusive,
            Integer medianTimeMs,
            int recordCount,
            int rankableCount,
            int activeDays,
            int dnfCount,
            int plusTwoCount
    ) {
    }

    public record ConsistencyResponse(
            GrowthMetricStatus status,
            ConsistencyWindowResponse current,
            ConsistencyWindowResponse previous,
            GrowthMetricCalculator.ConsistencyDirection direction,
            Integer differenceMs
    ) {
    }

    public record ConsistencyWindowResponse(
            GrowthMetricStatus status,
            int windowSize,
            int recordCount,
            int rankableCount,
            Integer iqrMs,
            int dnfCount,
            BigDecimal dnfRatePercent,
            int plusTwoCount,
            BigDecimal plusTwoRatePercent
    ) {
    }

    public record ActivityResponse(
            long totalSolveCount,
            long last7DaysSolveCount,
            long previous7DaysSolveCount,
            long last30DaysSolveCount,
            int activeDaysLast30Days,
            Instant firstRecordedAt,
            Instant latestRecordedAt
    ) {
    }
}
