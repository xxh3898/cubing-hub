package com.cubinghub.domain.growth.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.growth.dto.response.GrowthPbProgressionPageResponse;
import com.cubinghub.domain.growth.dto.response.GrowthPbProgressionPageResponse.PbProgressionPointResponse;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse.ActivityResponse;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse.AverageMetricResponse;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse.ConsistencyResponse;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse.ConsistencyWindowResponse;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse.CurrentPbResponse;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse.PerformanceComparisonResponse;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse.PeriodResponse;
import com.cubinghub.domain.growth.dto.response.GrowthTrendResponse;
import com.cubinghub.domain.growth.dto.response.GrowthTrendResponse.TrendPointResponse;
import com.cubinghub.domain.growth.metric.GrowthMetricCalculator;
import com.cubinghub.domain.growth.metric.GrowthMetricStatus;
import com.cubinghub.domain.growth.metric.GrowthRecord;
import com.cubinghub.domain.growth.metric.GrowthTimeWindows;
import com.cubinghub.domain.growth.repository.GrowthReadRepository;
import com.cubinghub.domain.growth.repository.GrowthReadRepository.ActivitySummary;
import com.cubinghub.domain.growth.repository.GrowthReadRepository.CurrentPb;
import com.cubinghub.domain.growth.repository.GrowthReadRepository.DailyAggregate;
import com.cubinghub.domain.growth.repository.GrowthReadRepository.PbProgressionPage;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.policy.PracticeEventCapabilities;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.repository.UserRepository;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GrowthReadService {

    public static final String SUPPORTED_TREND_PERIOD = "30D";
    public static final String PB_PROGRESSION_BASIS = "CURRENT_RECORD_STATE";
    private static final int RECENT_RECORD_LIMIT = 24;
    private static final int ACTIVITY_LAST_7_DAYS = 7;
    private static final int ACTIVITY_LAST_30_DAYS = 30;
    private static final int DEFAULT_PB_PAGE_SIZE = 50;
    private static final int MAX_PB_PAGE_SIZE = 100;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final UserRepository userRepository;
    private final GrowthReadRepository growthReadRepository;
    private final PracticeEventCapabilities eventCapabilities;
    private final Clock clock;

    public GrowthSummaryResponse getSummary(String email, EventType eventType) {
        eventCapabilities.requirePracticeRecordSupported(eventType);
        User user = findUser(email);
        Instant generatedAt = clock.instant();

        GrowthTimeWindows.ActivityComparisonWindow activity7Days = GrowthTimeWindows.activityComparisonWindow(
                generatedAt,
                ACTIVITY_LAST_7_DAYS
        );
        GrowthTimeWindows.ActivityWindow last30Days = GrowthTimeWindows.activityWindow(
                generatedAt,
                ACTIVITY_LAST_30_DAYS
        );
        GrowthTimeWindows.PerformanceComparisonWindow comparisonWindow =
                GrowthTimeWindows.performanceComparisonWindow(generatedAt);

        List<GrowthRecord> recentRecords = growthReadRepository.findRecentRecords(
                user.getId(),
                eventType,
                RECENT_RECORD_LIMIT
        );
        List<GrowthRecord> comparisonRecords = growthReadRepository.findRecordsInRange(
                user.getId(),
                eventType,
                comparisonWindow.previousPeriod().fromInclusive(),
                comparisonWindow.recentPeriod().toExclusive()
        );
        ActivitySummary activity = growthReadRepository.findActivitySummary(
                user.getId(),
                eventType,
                activity7Days.currentPeriod().fromInclusive(),
                activity7Days.currentPeriod().toExclusive(),
                activity7Days.previousPeriod().fromInclusive(),
                activity7Days.previousPeriod().toExclusive(),
                last30Days.range().fromInclusive(),
                last30Days.range().toExclusive()
        );

        return new GrowthSummaryResponse(
                eventType,
                GrowthTimeWindows.SERVICE_ZONE.getId(),
                generatedAt,
                last30Days.asOfDate(),
                toCurrentPb(growthReadRepository.findCurrentPb(user.getId(), eventType).orElse(null)),
                toAverage(GrowthMetricCalculator.calculateRecentAo5(recentRecords)),
                toAverage(GrowthMetricCalculator.calculateRecentAo12(recentRecords)),
                toComparison(GrowthMetricCalculator.comparePerformancePeriods(comparisonRecords, comparisonWindow)),
                toConsistency(GrowthMetricCalculator.calculateRecentConsistency(recentRecords)),
                toActivity(activity)
        );
    }

    public GrowthTrendResponse getTrend(String email, EventType eventType, String period) {
        eventCapabilities.requirePracticeRecordSupported(eventType);
        validateTrendPeriod(period);
        User user = findUser(email);
        Instant generatedAt = clock.instant();
        GrowthTimeWindows.ActivityWindow window = GrowthTimeWindows.activityWindow(
                generatedAt,
                ACTIVITY_LAST_30_DAYS
        );

        Map<LocalDate, DailyAggregate> aggregatesByDate = new HashMap<>();
        for (DailyAggregate aggregate : growthReadRepository.findDailyAggregates(
                user.getId(),
                eventType,
                window.range().fromInclusive(),
                window.range().toExclusive()
        )) {
            aggregatesByDate.put(aggregate.date(), aggregate);
        }

        List<TrendPointResponse> points = window.range().fromDate().datesUntil(window.range().toDateExclusive())
                .map(date -> toTrendPoint(date, aggregatesByDate.get(date)))
                .toList();

        return new GrowthTrendResponse(
                eventType,
                SUPPORTED_TREND_PERIOD,
                GrowthTimeWindows.SERVICE_ZONE.getId(),
                generatedAt,
                window.range().fromDate(),
                window.asOfDate(),
                true,
                points
        );
    }

    public GrowthPbProgressionPageResponse getPbProgression(
            String email,
            EventType eventType,
            Integer page,
            Integer size
    ) {
        eventCapabilities.requirePracticeRecordSupported(eventType);
        validatePbPageRequest(page, size);
        User user = findUser(email);
        PbProgressionPage progression = growthReadRepository.findPbProgression(user.getId(), eventType, page, size);
        int totalPages = (int) Math.ceil((double) progression.totalElements() / size);

        return new GrowthPbProgressionPageResponse(
                eventType,
                PB_PROGRESSION_BASIS,
                GrowthTimeWindows.SERVICE_ZONE.getId(),
                progression.content().stream()
                        .map(point -> new PbProgressionPointResponse(
                                point.recordId(),
                                point.timeMs(),
                                point.penalty(),
                                point.effectiveTimeMs(),
                                point.createdAt()
                        ))
                        .toList(),
                page,
                size,
                progression.totalElements(),
                totalPages,
                page < totalPages,
                page > 1
        );
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));
    }

    private void validateTrendPeriod(String period) {
        if (!SUPPORTED_TREND_PERIOD.equals(period)) {
            throw new IllegalArgumentException("지원하지 않는 Growth 기간입니다.");
        }
    }

    private void validatePbPageRequest(Integer page, Integer size) {
        if (page == null || page < 1) {
            throw new IllegalArgumentException("잘못된 페이지 번호입니다.");
        }
        if (size == null || size < 1 || size > MAX_PB_PAGE_SIZE) {
            throw new IllegalArgumentException("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
        }
    }

    private CurrentPbResponse toCurrentPb(CurrentPb currentPb) {
        if (currentPb == null) {
            return new CurrentPbResponse(GrowthMetricStatus.NO_DATA, null, null, null, null, null);
        }
        return new CurrentPbResponse(
                GrowthMetricStatus.AVAILABLE,
                currentPb.recordId(),
                currentPb.timeMs(),
                currentPb.penalty(),
                currentPb.effectiveTimeMs(),
                currentPb.createdAt()
        );
    }

    private AverageMetricResponse toAverage(GrowthMetricCalculator.AverageResult result) {
        return new AverageMetricResponse(result.status(), result.windowSize(), result.recordCount(), result.valueMs());
    }

    private PerformanceComparisonResponse toComparison(GrowthMetricCalculator.PeriodComparisonResult result) {
        return new PerformanceComparisonResponse(
                result.status(),
                toPeriod(result.recentPeriod()),
                toPeriod(result.previousPeriod()),
                result.direction(),
                result.improvementPercent()
        );
    }

    private PeriodResponse toPeriod(GrowthMetricCalculator.PeriodMetrics period) {
        return new PeriodResponse(
                period.window().fromDate(),
                period.window().toDateExclusive(),
                period.medianTimeMs(),
                period.recordCount(),
                period.rankableCount(),
                period.activeDays(),
                period.dnfCount(),
                period.plusTwoCount()
        );
    }

    private ConsistencyResponse toConsistency(GrowthMetricCalculator.ConsistencyResult result) {
        return new ConsistencyResponse(
                result.status(),
                toConsistencyWindow(result.current()),
                toConsistencyWindow(result.previous()),
                result.direction(),
                result.differenceMs()
        );
    }

    private ConsistencyWindowResponse toConsistencyWindow(GrowthMetricCalculator.ConsistencyWindow window) {
        return new ConsistencyWindowResponse(
                window.status(),
                window.windowSize(),
                window.recordCount(),
                window.rankableCount(),
                window.iqrMs(),
                window.dnfCount(),
                ratePercent(window.dnfCount(), window.recordCount()),
                window.plusTwoCount(),
                ratePercent(window.plusTwoCount(), window.recordCount())
        );
    }

    private BigDecimal ratePercent(int count, int total) {
        if (total == 0) {
            return null;
        }
        return BigDecimal.valueOf(count)
                .multiply(HUNDRED)
                .divide(BigDecimal.valueOf(total), MathContext.DECIMAL64);
    }

    private ActivityResponse toActivity(ActivitySummary activity) {
        return new ActivityResponse(
                activity.totalSolveCount(),
                activity.last7DaysSolveCount(),
                activity.previous7DaysSolveCount(),
                activity.last30DaysSolveCount(),
                activity.activeDaysLast30Days(),
                activity.firstRecordedAt(),
                activity.latestRecordedAt()
        );
    }

    private TrendPointResponse toTrendPoint(LocalDate date, DailyAggregate aggregate) {
        if (aggregate == null) {
            return new TrendPointResponse(date, 0, 0, null, 0, 0);
        }
        return new TrendPointResponse(
                aggregate.date(),
                aggregate.recordCount(),
                aggregate.rankableCount(),
                aggregate.medianTimeMs(),
                aggregate.dnfCount(),
                aggregate.plusTwoCount()
        );
    }
}
