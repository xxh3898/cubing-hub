package com.cubinghub.domain.growth.metric;

import com.cubinghub.domain.record.entity.Penalty;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

public final class GrowthMetricCalculator {

    public static final int AO5_WINDOW_SIZE = 5;
    public static final int AO12_WINDOW_SIZE = 12;
    public static final int CONSISTENCY_WINDOW_SIZE = 12;
    public static final int MIN_PERIOD_RANKABLE_RECORD_COUNT = 5;
    public static final int MIN_PERIOD_ACTIVE_DAY_COUNT = 2;
    public static final int MIN_IQR_RANKABLE_RECORD_COUNT = 8;

    private static final Comparator<GrowthRecord> RECENT_ORDER = Comparator
            .comparing(GrowthRecord::createdAt)
            .thenComparingLong(GrowthRecord::id)
            .reversed();

    private static final Comparator<GrowthRecord> CHRONOLOGICAL_ORDER = Comparator
            .comparing(GrowthRecord::createdAt)
            .thenComparingLong(GrowthRecord::id);

    private GrowthMetricCalculator() {
    }

    public static AverageResult calculateRecentAo5(Collection<GrowthRecord> records) {
        return calculateRecentAo(records, AO5_WINDOW_SIZE);
    }

    public static AverageResult calculateRecentAo12(Collection<GrowthRecord> records) {
        return calculateRecentAo(records, AO12_WINDOW_SIZE);
    }

    public static AverageResult calculateRecentAo(Collection<GrowthRecord> records, int windowSize) {
        if (windowSize < 3) {
            throw new IllegalArgumentException("Ao window size는 3 이상이어야 합니다.");
        }

        List<GrowthRecord> recentRecords = recentRecords(records).stream()
                .limit(windowSize)
                .toList();

        if (recentRecords.size() < windowSize) {
            return new AverageResult(
                    GrowthMetricStatus.INSUFFICIENT_DATA,
                    windowSize,
                    recentRecords.size(),
                    null
            );
        }

        List<Integer> effectiveTimes = recentRecords.stream()
                .map(GrowthRecord::effectiveTimeMs)
                .toList();
        long dnfCount = effectiveTimes.stream().filter(Objects::isNull).count();
        if (dnfCount >= 2) {
            return new AverageResult(GrowthMetricStatus.DNF, windowSize, windowSize, null);
        }

        List<Integer> trimmedTimes = new ArrayList<>(effectiveTimes);
        trimmedTimes.sort(GrowthMetricCalculator::compareAoTime);
        trimmedTimes = trimmedTimes.subList(1, trimmedTimes.size() - 1);

        if (trimmedTimes.stream().anyMatch(Objects::isNull)) {
            return new AverageResult(GrowthMetricStatus.DNF, windowSize, windowSize, null);
        }

        long sum = trimmedTimes.stream().mapToLong(Integer::longValue).sum();
        return new AverageResult(
                GrowthMetricStatus.AVAILABLE,
                windowSize,
                windowSize,
                roundToInt((double) sum / trimmedTimes.size())
        );
    }

    public static MedianResult calculateMedian(Collection<GrowthRecord> records) {
        List<GrowthRecord> values = copyRecords(records);
        List<Integer> rankableTimes = sortedRankableTimes(values);
        int dnfCount = (int) values.stream().filter(record -> record.penalty() == Penalty.DNF).count();
        int plusTwoCount = (int) values.stream().filter(record -> record.penalty() == Penalty.PLUS_TWO).count();

        if (rankableTimes.isEmpty()) {
            return new MedianResult(
                    GrowthMetricStatus.NO_DATA,
                    values.size(),
                    0,
                    dnfCount,
                    plusTwoCount,
                    null
            );
        }

        int middle = rankableTimes.size() / 2;
        Integer medianTimeMs = rankableTimes.size() % 2 == 1
                ? rankableTimes.get(middle)
                : roundToInt(((long) rankableTimes.get(middle - 1) + rankableTimes.get(middle)) / 2.0d);

        return new MedianResult(
                GrowthMetricStatus.AVAILABLE,
                values.size(),
                rankableTimes.size(),
                dnfCount,
                plusTwoCount,
                medianTimeMs
        );
    }

    public static PeriodComparisonResult comparePerformancePeriods(
            Collection<GrowthRecord> records,
            GrowthTimeWindows.PerformanceComparisonWindow window
    ) {
        Objects.requireNonNull(window, "window는 필수입니다.");
        List<GrowthRecord> allRecords = copyRecords(records);
        PeriodMetrics recentPeriod = calculatePeriodMetrics(allRecords, window.recentPeriod());
        PeriodMetrics previousPeriod = calculatePeriodMetrics(allRecords, window.previousPeriod());

        if (recentPeriod.recordCount() == 0 || previousPeriod.recordCount() == 0) {
            return new PeriodComparisonResult(
                    GrowthMetricStatus.NO_DATA,
                    recentPeriod,
                    previousPeriod,
                    PerformanceDirection.NOT_AVAILABLE,
                    null
            );
        }

        if (!isPeriodEligible(recentPeriod) || !isPeriodEligible(previousPeriod)) {
            return new PeriodComparisonResult(
                    GrowthMetricStatus.INSUFFICIENT_SAMPLE,
                    recentPeriod,
                    previousPeriod,
                    PerformanceDirection.NOT_AVAILABLE,
                    null
            );
        }

        int recentMedian = recentPeriod.medianTimeMs();
        int previousMedian = previousPeriod.medianTimeMs();
        PerformanceDirection direction = directionFor(previousMedian, recentMedian);
        BigDecimal improvementPercent = BigDecimal.valueOf((long) previousMedian - recentMedian)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(previousMedian), MathContext.DECIMAL64);

        return new PeriodComparisonResult(
                GrowthMetricStatus.AVAILABLE,
                recentPeriod,
                previousPeriod,
                direction,
                improvementPercent
        );
    }

    public static ConsistencyResult calculateRecentConsistency(Collection<GrowthRecord> records) {
        List<GrowthRecord> recentRecords = recentRecords(records);
        ConsistencyWindow current = calculateConsistencyWindow(
                recentRecords.subList(0, Math.min(CONSISTENCY_WINDOW_SIZE, recentRecords.size()))
        );
        ConsistencyWindow previous = calculateConsistencyWindow(
                recentRecords.subList(
                        Math.min(CONSISTENCY_WINDOW_SIZE, recentRecords.size()),
                        Math.min(CONSISTENCY_WINDOW_SIZE * 2, recentRecords.size())
                )
        );

        if (current.status() != GrowthMetricStatus.AVAILABLE
                || previous.status() != GrowthMetricStatus.AVAILABLE) {
            GrowthMetricStatus status = current.recordCount() == 0 && previous.recordCount() == 0
                    ? GrowthMetricStatus.NO_DATA
                    : GrowthMetricStatus.INSUFFICIENT_DATA;
            return new ConsistencyResult(
                    status,
                    current,
                    previous,
                    ConsistencyDirection.NOT_AVAILABLE,
                    null
            );
        }

        int differenceMs = previous.iqrMs() - current.iqrMs();
        ConsistencyDirection direction = differenceMs > 0
                ? ConsistencyDirection.NARROWER
                : differenceMs < 0 ? ConsistencyDirection.WIDER : ConsistencyDirection.UNCHANGED;

        return new ConsistencyResult(
                GrowthMetricStatus.AVAILABLE,
                current,
                previous,
                direction,
                differenceMs
        );
    }

    public static List<PbProgressionPoint> calculatePbProgression(Collection<GrowthRecord> records) {
        List<GrowthRecord> chronologicalRecords = copyRecords(records).stream()
                .sorted(CHRONOLOGICAL_ORDER)
                .toList();
        List<PbProgressionPoint> points = new ArrayList<>();
        Integer runningMinimum = null;

        for (GrowthRecord record : chronologicalRecords) {
            Integer effectiveTimeMs = record.effectiveTimeMs();
            if (effectiveTimeMs == null || (runningMinimum != null && effectiveTimeMs >= runningMinimum)) {
                continue;
            }

            points.add(PbProgressionPoint.from(record, effectiveTimeMs));
            runningMinimum = effectiveTimeMs;
        }

        return List.copyOf(points);
    }

    private static PeriodMetrics calculatePeriodMetrics(
            List<GrowthRecord> records,
            GrowthTimeWindows.CalendarWindow window
    ) {
        List<GrowthRecord> periodRecords = records.stream()
                .filter(record -> window.contains(record.createdAt()))
                .toList();
        MedianResult median = calculateMedian(periodRecords);
        int activeDays = (int) periodRecords.stream()
                .filter(GrowthRecord::isRankable)
                .map(record -> activityDate(record.createdAt()))
                .distinct()
                .count();

        return new PeriodMetrics(
                window,
                periodRecords.size(),
                median.rankableCount(),
                activeDays,
                median.dnfCount(),
                median.plusTwoCount(),
                median.valueMs()
        );
    }

    private static ConsistencyWindow calculateConsistencyWindow(List<GrowthRecord> records) {
        MedianResult median = calculateMedian(records);
        if (median.rankableCount() < MIN_IQR_RANKABLE_RECORD_COUNT) {
            GrowthMetricStatus status = records.isEmpty()
                    ? GrowthMetricStatus.NO_DATA
                    : GrowthMetricStatus.INSUFFICIENT_DATA;
            return new ConsistencyWindow(
                    status,
                    CONSISTENCY_WINDOW_SIZE,
                    median.recordCount(),
                    median.rankableCount(),
                    median.dnfCount(),
                    median.plusTwoCount(),
                    null,
                    null,
                    null
            );
        }

        List<Integer> rankableTimes = sortedRankableTimes(records);
        int q1 = percentile(rankableTimes, 0.25d);
        int q3 = percentile(rankableTimes, 0.75d);
        return new ConsistencyWindow(
                GrowthMetricStatus.AVAILABLE,
                CONSISTENCY_WINDOW_SIZE,
                median.recordCount(),
                median.rankableCount(),
                median.dnfCount(),
                median.plusTwoCount(),
                q1,
                q3,
                q3 - q1
        );
    }

    private static boolean isPeriodEligible(PeriodMetrics period) {
        return period.rankableCount() >= MIN_PERIOD_RANKABLE_RECORD_COUNT
                && period.activeDays() >= MIN_PERIOD_ACTIVE_DAY_COUNT;
    }

    private static PerformanceDirection directionFor(int previousMedian, int recentMedian) {
        if (recentMedian < previousMedian) {
            return PerformanceDirection.FASTER;
        }
        if (recentMedian > previousMedian) {
            return PerformanceDirection.SLOWER;
        }
        return PerformanceDirection.UNCHANGED;
    }

    private static LocalDate activityDate(Instant createdAt) {
        return createdAt.atZone(GrowthTimeWindows.SERVICE_ZONE).toLocalDate();
    }

    private static int percentile(List<Integer> sortedValues, double percentile) {
        double index = (sortedValues.size() - 1) * percentile;
        int lowerIndex = (int) Math.floor(index);
        int upperIndex = (int) Math.ceil(index);
        double lowerValue = sortedValues.get(lowerIndex);
        double upperValue = sortedValues.get(upperIndex);
        return roundToInt(lowerValue + (upperValue - lowerValue) * (index - lowerIndex));
    }

    private static List<Integer> sortedRankableTimes(Collection<GrowthRecord> records) {
        return records.stream()
                .map(GrowthRecord::effectiveTimeMs)
                .filter(Objects::nonNull)
                .sorted()
                .toList();
    }

    private static List<GrowthRecord> recentRecords(Collection<GrowthRecord> records) {
        return copyRecords(records).stream()
                .sorted(RECENT_ORDER)
                .toList();
    }

    private static List<GrowthRecord> copyRecords(Collection<GrowthRecord> records) {
        Objects.requireNonNull(records, "records는 필수입니다.");
        return List.copyOf(records);
    }

    private static int compareAoTime(Integer left, Integer right) {
        if (left == null && right == null) {
            return 0;
        }
        if (left == null) {
            return 1;
        }
        if (right == null) {
            return -1;
        }
        return Integer.compare(left, right);
    }

    private static int roundToInt(double value) {
        return Math.toIntExact(Math.round(value));
    }

    public record AverageResult(
            GrowthMetricStatus status,
            int windowSize,
            int recordCount,
            Integer valueMs
    ) {

        public AverageResult {
            Objects.requireNonNull(status, "status는 필수입니다.");
        }
    }

    public record MedianResult(
            GrowthMetricStatus status,
            int recordCount,
            int rankableCount,
            int dnfCount,
            int plusTwoCount,
            Integer valueMs
    ) {

        public MedianResult {
            Objects.requireNonNull(status, "status는 필수입니다.");
        }
    }

    public record PeriodMetrics(
            GrowthTimeWindows.CalendarWindow window,
            int recordCount,
            int rankableCount,
            int activeDays,
            int dnfCount,
            int plusTwoCount,
            Integer medianTimeMs
    ) {

        public PeriodMetrics {
            Objects.requireNonNull(window, "window는 필수입니다.");
        }
    }

    public record PeriodComparisonResult(
            GrowthMetricStatus status,
            PeriodMetrics recentPeriod,
            PeriodMetrics previousPeriod,
            PerformanceDirection direction,
            BigDecimal improvementPercent
    ) {

        public PeriodComparisonResult {
            Objects.requireNonNull(status, "status는 필수입니다.");
            Objects.requireNonNull(recentPeriod, "recentPeriod는 필수입니다.");
            Objects.requireNonNull(previousPeriod, "previousPeriod는 필수입니다.");
            Objects.requireNonNull(direction, "direction은 필수입니다.");
        }
    }

    public record ConsistencyWindow(
            GrowthMetricStatus status,
            int windowSize,
            int recordCount,
            int rankableCount,
            int dnfCount,
            int plusTwoCount,
            Integer q1Ms,
            Integer q3Ms,
            Integer iqrMs
    ) {

        public ConsistencyWindow {
            Objects.requireNonNull(status, "status는 필수입니다.");
        }
    }

    public record ConsistencyResult(
            GrowthMetricStatus status,
            ConsistencyWindow current,
            ConsistencyWindow previous,
            ConsistencyDirection direction,
            Integer differenceMs
    ) {

        public ConsistencyResult {
            Objects.requireNonNull(status, "status는 필수입니다.");
            Objects.requireNonNull(current, "current는 필수입니다.");
            Objects.requireNonNull(previous, "previous는 필수입니다.");
            Objects.requireNonNull(direction, "direction은 필수입니다.");
        }
    }

    public record PbProgressionPoint(
            long recordId,
            int timeMs,
            Penalty penalty,
            int effectiveTimeMs,
            Instant createdAt
    ) {

        private static PbProgressionPoint from(GrowthRecord record, int effectiveTimeMs) {
            return new PbProgressionPoint(
                    record.id(),
                    record.timeMs(),
                    record.penalty(),
                    effectiveTimeMs,
                    record.createdAt()
            );
        }
    }

    public enum PerformanceDirection {
        FASTER,
        SLOWER,
        UNCHANGED,
        NOT_AVAILABLE
    }

    public enum ConsistencyDirection {
        NARROWER,
        WIDER,
        UNCHANGED,
        NOT_AVAILABLE
    }
}
