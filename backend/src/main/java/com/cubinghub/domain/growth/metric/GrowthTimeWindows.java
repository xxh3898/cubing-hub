package com.cubinghub.domain.growth.metric;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;

public final class GrowthTimeWindows {

    public static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private GrowthTimeWindows() {
    }

    public static ActivityWindow activityWindow(Clock clock, int days) {
        Objects.requireNonNull(clock, "clock은 필수입니다.");
        return activityWindow(clock.instant(), days);
    }

    public static ActivityWindow activityWindow(Instant generatedAt, int days) {
        if (days < 1) {
            throw new IllegalArgumentException("activity window 일수는 1 이상이어야 합니다.");
        }

        LocalDate asOfDate = asOfDate(generatedAt);
        LocalDate fromDate = asOfDate.minusDays(days - 1L);
        return new ActivityWindow(asOfDate, calendarWindow(fromDate, asOfDate.plusDays(1)));
    }

    public static PerformanceComparisonWindow performanceComparisonWindow(Clock clock) {
        Objects.requireNonNull(clock, "clock은 필수입니다.");
        return performanceComparisonWindow(clock.instant());
    }

    public static PerformanceComparisonWindow performanceComparisonWindow(Instant generatedAt) {
        LocalDate asOfDate = asOfDate(generatedAt);
        CalendarWindow recentPeriod = calendarWindow(asOfDate.minusDays(7), asOfDate);
        CalendarWindow previousPeriod = calendarWindow(asOfDate.minusDays(14), asOfDate.minusDays(7));

        return new PerformanceComparisonWindow(asOfDate, recentPeriod, previousPeriod);
    }

    private static LocalDate asOfDate(Instant generatedAt) {
        return Objects.requireNonNull(generatedAt, "generatedAt은 필수입니다.")
                .atZone(SERVICE_ZONE)
                .toLocalDate();
    }

    private static CalendarWindow calendarWindow(LocalDate fromDate, LocalDate toDateExclusive) {
        Instant fromInclusive = fromDate.atStartOfDay(SERVICE_ZONE).toInstant();
        Instant toExclusive = toDateExclusive.atStartOfDay(SERVICE_ZONE).toInstant();
        return new CalendarWindow(fromDate, toDateExclusive, fromInclusive, toExclusive);
    }

    public record ActivityWindow(LocalDate asOfDate, CalendarWindow range) {

        public ActivityWindow {
            Objects.requireNonNull(asOfDate, "asOfDate는 필수입니다.");
            Objects.requireNonNull(range, "range는 필수입니다.");
        }
    }

    public record PerformanceComparisonWindow(
            LocalDate asOfDate,
            CalendarWindow recentPeriod,
            CalendarWindow previousPeriod
    ) {

        public PerformanceComparisonWindow {
            Objects.requireNonNull(asOfDate, "asOfDate는 필수입니다.");
            Objects.requireNonNull(recentPeriod, "recentPeriod는 필수입니다.");
            Objects.requireNonNull(previousPeriod, "previousPeriod는 필수입니다.");
        }
    }

    public record CalendarWindow(
            LocalDate fromDate,
            LocalDate toDateExclusive,
            Instant fromInclusive,
            Instant toExclusive
    ) {

        public CalendarWindow {
            Objects.requireNonNull(fromDate, "fromDate는 필수입니다.");
            Objects.requireNonNull(toDateExclusive, "toDateExclusive는 필수입니다.");
            Objects.requireNonNull(fromInclusive, "fromInclusive는 필수입니다.");
            Objects.requireNonNull(toExclusive, "toExclusive는 필수입니다.");
            if (!fromDate.isBefore(toDateExclusive) || !fromInclusive.isBefore(toExclusive)) {
                throw new IllegalArgumentException("calendar window는 양수 길이여야 합니다.");
            }
        }

        public boolean contains(Instant instant) {
            return !instant.isBefore(fromInclusive) && instant.isBefore(toExclusive);
        }
    }
}
