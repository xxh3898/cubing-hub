package com.cubinghub.domain.growth.metric;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("GrowthTimeWindows 단위 테스트")
class GrowthTimeWindowsTest {

    private static final Clock AS_OF_AUGUST_12_KST = Clock.fixed(
            Instant.parse("2026-08-11T15:01:00Z"),
            ZoneOffset.UTC
    );

    @Test
    @DisplayName("activity window는 Asia/Seoul 오늘을 포함한 7 calendar date를 만든다")
    void should_create_last_seven_activity_days_including_as_of_date_in_asia_seoul() {
        GrowthTimeWindows.ActivityWindow window = GrowthTimeWindows.activityWindow(AS_OF_AUGUST_12_KST, 7);

        assertThat(window.asOfDate()).hasToString("2026-08-12");
        assertThat(window.range().fromDate()).hasToString("2026-08-06");
        assertThat(window.range().toDateExclusive()).hasToString("2026-08-13");
        assertThat(window.range().fromInclusive()).isEqualTo(Instant.parse("2026-08-05T15:00:00Z"));
        assertThat(window.range().toExclusive()).isEqualTo(Instant.parse("2026-08-12T15:00:00Z"));
    }

    @Test
    @DisplayName("activity comparison은 오늘 포함 7일과 바로 앞 7일을 gap 없이 만든다")
    void should_create_consecutive_current_and_previous_activity_ranges() {
        GrowthTimeWindows.ActivityComparisonWindow window = GrowthTimeWindows.activityComparisonWindow(
                AS_OF_AUGUST_12_KST,
                7
        );

        assertThat(window.asOfDate()).hasToString("2026-08-12");
        assertThat(window.currentPeriod().fromDate()).hasToString("2026-08-06");
        assertThat(window.currentPeriod().toDateExclusive()).hasToString("2026-08-13");
        assertThat(window.currentPeriod().fromInclusive()).isEqualTo(Instant.parse("2026-08-05T15:00:00Z"));
        assertThat(window.currentPeriod().toExclusive()).isEqualTo(Instant.parse("2026-08-12T15:00:00Z"));
        assertThat(window.previousPeriod().fromDate()).hasToString("2026-07-30");
        assertThat(window.previousPeriod().toDateExclusive()).hasToString("2026-08-06");
        assertThat(window.previousPeriod().fromInclusive()).isEqualTo(Instant.parse("2026-07-29T15:00:00Z"));
        assertThat(window.previousPeriod().toExclusive()).isEqualTo(Instant.parse("2026-08-05T15:00:00Z"));
        assertThat(window.previousPeriod().toExclusive()).isEqualTo(window.currentPeriod().fromInclusive());
    }

    @Test
    @DisplayName("performance comparison은 partial today를 제외한 recent와 previous 7-day range를 만든다")
    void should_create_completed_recent_and_previous_seven_day_ranges() {
        GrowthTimeWindows.PerformanceComparisonWindow window = GrowthTimeWindows.performanceComparisonWindow(
                AS_OF_AUGUST_12_KST
        );

        assertThat(window.asOfDate()).hasToString("2026-08-12");
        assertThat(window.recentPeriod().fromInclusive()).isEqualTo(Instant.parse("2026-08-04T15:00:00Z"));
        assertThat(window.recentPeriod().toExclusive()).isEqualTo(Instant.parse("2026-08-11T15:00:00Z"));
        assertThat(window.previousPeriod().fromInclusive()).isEqualTo(Instant.parse("2026-07-28T15:00:00Z"));
        assertThat(window.previousPeriod().toExclusive()).isEqualTo(Instant.parse("2026-08-04T15:00:00Z"));
    }

    @Test
    @DisplayName("UTC previous-day instant는 Asia/Seoul next-day asOfDate로 해석한다")
    void should_resolve_utc_previous_day_instant_as_next_kst_calendar_date() {
        GrowthTimeWindows.PerformanceComparisonWindow beforeMidnight = GrowthTimeWindows.performanceComparisonWindow(
                Instant.parse("2026-08-11T14:59:59Z")
        );
        GrowthTimeWindows.PerformanceComparisonWindow afterMidnight = GrowthTimeWindows.performanceComparisonWindow(
                Instant.parse("2026-08-11T15:00:00Z")
        );

        assertThat(beforeMidnight.asOfDate()).hasToString("2026-08-11");
        assertThat(afterMidnight.asOfDate()).hasToString("2026-08-12");
    }

    @Test
    @DisplayName("partial today Record는 activity에는 포함하고 performance comparison에서는 제외한다")
    void should_include_partial_today_in_activity_but_exclude_it_from_performance_comparison() {
        Instant kstTodayStart = Instant.parse("2026-08-11T15:00:00Z");
        GrowthTimeWindows.ActivityWindow activityWindow = GrowthTimeWindows.activityWindow(AS_OF_AUGUST_12_KST, 7);
        GrowthTimeWindows.PerformanceComparisonWindow comparisonWindow = GrowthTimeWindows.performanceComparisonWindow(
                AS_OF_AUGUST_12_KST
        );

        assertThat(activityWindow.range().contains(kstTodayStart)).isTrue();
        assertThat(comparisonWindow.recentPeriod().contains(kstTodayStart)).isFalse();
    }
}
