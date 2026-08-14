package com.cubinghub.domain.growth.metric;

import static com.cubinghub.domain.growth.metric.GrowthMetricCalculator.ConsistencyDirection.NARROWER;
import static com.cubinghub.domain.growth.metric.GrowthMetricCalculator.ConsistencyDirection.WIDER;
import static com.cubinghub.domain.growth.metric.GrowthMetricCalculator.PerformanceDirection.FASTER;
import static com.cubinghub.domain.growth.metric.GrowthMetricCalculator.PerformanceDirection.NOT_AVAILABLE;
import static com.cubinghub.domain.growth.metric.GrowthMetricCalculator.PerformanceDirection.SLOWER;
import static com.cubinghub.domain.growth.metric.GrowthMetricCalculator.PerformanceDirection.UNCHANGED;
import static com.cubinghub.domain.growth.metric.GrowthMetricFixtures.record;
import static com.cubinghub.domain.growth.metric.GrowthMetricFixtures.recordsForConsistency;
import static com.cubinghub.domain.growth.metric.GrowthMetricFixtures.values;
import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.record.entity.Penalty;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("GrowthMetricCalculator 단위 테스트")
class GrowthMetricCalculatorTest {

    private static final GrowthTimeWindows.PerformanceComparisonWindow COMPARISON_WINDOW =
            GrowthTimeWindows.performanceComparisonWindow(Instant.parse("2026-08-11T15:01:00Z"));

    @Test
    @DisplayName("NONE, PLUS_TWO, DNF의 effective result를 Penalty 규칙으로 계산한다")
    void should_apply_canonical_effective_result_when_penalty_is_none_plus_two_or_dnf() {
        assertThat(record(1L, 10000, Penalty.NONE, "2026-08-01T00:00:00Z").effectiveTimeMs()).isEqualTo(10000);
        assertThat(record(2L, 10000, Penalty.PLUS_TWO, "2026-08-01T00:01:00Z").effectiveTimeMs()).isEqualTo(12000);
        assertThat(record(3L, 10000, Penalty.DNF, "2026-08-01T00:02:00Z").effectiveTimeMs()).isNull();
    }

    @Test
    @DisplayName("latest Record 수가 부족하면 Ao5와 Ao12를 INSUFFICIENT_DATA로 반환한다")
    void should_return_insufficient_data_when_recent_record_count_is_less_than_ao_window() {
        List<GrowthRecord> fourRecords = List.of(
                record(1L, 10000, Penalty.NONE, "2026-08-01T00:00:00Z"),
                record(2L, 11000, Penalty.NONE, "2026-08-01T00:01:00Z"),
                record(3L, 12000, Penalty.NONE, "2026-08-01T00:02:00Z"),
                record(4L, 13000, Penalty.NONE, "2026-08-01T00:03:00Z")
        );

        GrowthMetricCalculator.AverageResult ao5 = GrowthMetricCalculator.calculateRecentAo5(fourRecords);
        GrowthMetricCalculator.AverageResult ao12 = GrowthMetricCalculator.calculateRecentAo12(fourRecords);

        assertThat(ao5.status()).isEqualTo(GrowthMetricStatus.INSUFFICIENT_DATA);
        assertThat(ao5.valueMs()).isNull();
        assertThat(ao12.status()).isEqualTo(GrowthMetricStatus.INSUFFICIENT_DATA);
        assertThat(ao12.recordCount()).isEqualTo(4);
    }

    @Test
    @DisplayName("Ao는 createdAt DESC, id DESC의 latest window에서 best와 worst를 trim한다")
    void should_calculate_ao_from_stably_ordered_latest_records() {
        List<GrowthRecord> shuffledRecords = List.of(
                record(1L, 10000, Penalty.NONE, "2026-08-01T00:00:00Z"),
                record(5L, 14000, Penalty.NONE, "2026-08-01T00:04:00Z"),
                record(3L, 12000, Penalty.NONE, "2026-08-01T00:02:00Z"),
                record(4L, 13000, Penalty.NONE, "2026-08-01T00:03:00Z"),
                record(2L, 11000, Penalty.NONE, "2026-08-01T00:01:00Z")
        );

        GrowthMetricCalculator.AverageResult result = GrowthMetricCalculator.calculateRecentAo5(shuffledRecords);

        assertThat(result.status()).isEqualTo(GrowthMetricStatus.AVAILABLE);
        assertThat(result.valueMs()).isEqualTo(12000);
    }

    @Test
    @DisplayName("Ao12는 latest 12 Record의 numeric trim result를 반환한다")
    void should_calculate_numeric_ao12_when_twelve_recent_records_exist() {
        List<GrowthRecord> records = new java.util.ArrayList<>();
        for (int index = 0; index < 12; index++) {
            records.add(record(
                    index + 1L,
                    10000 + index * 1000,
                    Penalty.NONE,
                    "2026-08-01T00:" + String.format("%02d", index) + ":00Z"
            ));
        }

        GrowthMetricCalculator.AverageResult result = GrowthMetricCalculator.calculateRecentAo12(records);

        assertThat(result.status()).isEqualTo(GrowthMetricStatus.AVAILABLE);
        assertThat(result.recordCount()).isEqualTo(12);
        assertThat(result.valueMs()).isEqualTo(15500);
    }

    @Test
    @DisplayName("Ao는 PLUS_TWO의 effective time과 integer millisecond 반올림을 사용한다")
    void should_use_plus_two_effective_time_and_round_ao_to_integer_milliseconds() {
        List<GrowthRecord> plusTwoRecords = List.of(
                record(1L, 10000, Penalty.NONE, "2026-08-01T00:00:00Z"),
                record(2L, 9001, Penalty.PLUS_TWO, "2026-08-01T00:01:00Z"),
                record(3L, 12000, Penalty.NONE, "2026-08-01T00:02:00Z"),
                record(4L, 13001, Penalty.NONE, "2026-08-01T00:03:00Z"),
                record(5L, 14000, Penalty.NONE, "2026-08-01T00:04:00Z")
        );
        List<GrowthRecord> roundingRecords = List.of(
                record(6L, 10000, Penalty.NONE, "2026-08-01T00:05:00Z"),
                record(7L, 10001, Penalty.NONE, "2026-08-01T00:06:00Z"),
                record(8L, 10003, Penalty.NONE, "2026-08-01T00:07:00Z"),
                record(9L, 10004, Penalty.NONE, "2026-08-01T00:08:00Z"),
                record(10L, 10005, Penalty.NONE, "2026-08-01T00:09:00Z")
        );

        assertThat(GrowthMetricCalculator.calculateRecentAo5(plusTwoRecords).valueMs()).isEqualTo(12001);
        assertThat(GrowthMetricCalculator.calculateRecentAo5(roundingRecords).valueMs()).isEqualTo(10003);
    }

    @Test
    @DisplayName("Ao는 DNF 한 개를 worst로 trim하고 DNF 두 개 이상을 DNF로 반환한다")
    void should_trim_one_dnf_but_return_dnf_when_two_or_more_dnfs_exist() {
        List<GrowthRecord> oneDnf = List.of(
                record(1L, 10000, Penalty.NONE, "2026-08-01T00:00:00Z"),
                record(2L, 11000, Penalty.NONE, "2026-08-01T00:01:00Z"),
                record(3L, 12000, Penalty.DNF, "2026-08-01T00:02:00Z"),
                record(4L, 13000, Penalty.NONE, "2026-08-01T00:03:00Z"),
                record(5L, 14000, Penalty.NONE, "2026-08-01T00:04:00Z")
        );
        List<GrowthRecord> twoDnfs = List.of(
                record(6L, 10000, Penalty.NONE, "2026-08-01T00:05:00Z"),
                record(7L, 11000, Penalty.DNF, "2026-08-01T00:06:00Z"),
                record(8L, 12000, Penalty.DNF, "2026-08-01T00:07:00Z"),
                record(9L, 13000, Penalty.NONE, "2026-08-01T00:08:00Z"),
                record(10L, 14000, Penalty.NONE, "2026-08-01T00:09:00Z")
        );

        assertThat(GrowthMetricCalculator.calculateRecentAo5(oneDnf).valueMs()).isEqualTo(12667);
        assertThat(GrowthMetricCalculator.calculateRecentAo5(twoDnfs).status()).isEqualTo(GrowthMetricStatus.DNF);
    }

    @Test
    @DisplayName("Ao tie는 같은 effective time을 그대로 포함하고 trim 결과를 안정적으로 계산한다")
    void should_calculate_ao_when_effective_times_are_tied() {
        List<GrowthRecord> records = List.of(
                record(1L, 10000, Penalty.NONE, "2026-08-01T00:00:00Z"),
                record(2L, 10000, Penalty.NONE, "2026-08-01T00:01:00Z"),
                record(3L, 11000, Penalty.NONE, "2026-08-01T00:02:00Z"),
                record(4L, 12000, Penalty.NONE, "2026-08-01T00:03:00Z"),
                record(5L, 12000, Penalty.NONE, "2026-08-01T00:04:00Z")
        );

        assertThat(GrowthMetricCalculator.calculateRecentAo5(records).valueMs()).isEqualTo(11000);
    }

    @Test
    @DisplayName("median은 홀수와 짝수 rankable population을 integer millisecond로 계산한다")
    void should_calculate_odd_and_even_median_with_integer_millisecond_rounding() {
        GrowthMetricCalculator.MedianResult odd = GrowthMetricCalculator.calculateMedian(List.of(
                record(1L, 12000, Penalty.NONE, "2026-08-01T00:00:00Z"),
                record(2L, 10000, Penalty.NONE, "2026-08-01T00:01:00Z"),
                record(3L, 11000, Penalty.NONE, "2026-08-01T00:02:00Z")
        ));
        GrowthMetricCalculator.MedianResult even = GrowthMetricCalculator.calculateMedian(List.of(
                record(4L, 10000, Penalty.NONE, "2026-08-01T00:03:00Z"),
                record(5L, 10001, Penalty.NONE, "2026-08-01T00:04:00Z")
        ));

        assertThat(odd.valueMs()).isEqualTo(11000);
        assertThat(even.valueMs()).isEqualTo(10001);
    }

    @Test
    @DisplayName("median은 DNF를 제외하고 PLUS_TWO와 penalty count를 보존한다")
    void should_exclude_dnf_from_median_and_preserve_plus_two_and_dnf_counts() {
        GrowthMetricCalculator.MedianResult result = GrowthMetricCalculator.calculateMedian(List.of(
                record(1L, 9000, Penalty.PLUS_TWO, "2026-08-01T00:00:00Z"),
                record(2L, 11000, Penalty.DNF, "2026-08-01T00:01:00Z"),
                record(3L, 12000, Penalty.NONE, "2026-08-01T00:02:00Z")
        ));

        assertThat(result.status()).isEqualTo(GrowthMetricStatus.AVAILABLE);
        assertThat(result.valueMs()).isEqualTo(11500);
        assertThat(result.rankableCount()).isEqualTo(2);
        assertThat(result.dnfCount()).isEqualTo(1);
        assertThat(result.plusTwoCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("빈 median population은 NO_DATA로 반환한다")
    void should_return_no_data_when_median_population_is_empty() {
        GrowthMetricCalculator.MedianResult result = GrowthMetricCalculator.calculateMedian(List.of());

        assertThat(result.status()).isEqualTo(GrowthMetricStatus.NO_DATA);
        assertThat(result.valueMs()).isNull();
        assertThat(result.rankableCount()).isZero();
    }

    @Test
    @DisplayName("comparison은 한 period에 record가 없으면 NO_DATA를 반환한다")
    void should_return_no_data_when_one_comparison_period_has_no_records() {
        GrowthMetricCalculator.PeriodComparisonResult result = GrowthMetricCalculator.comparePerformancePeriods(
                periodRecords(1L, new int[] {18000, 19000, 20000, 21000, 22000}, "2026-08-06"),
                COMPARISON_WINDOW
        );

        assertThat(result.status()).isEqualTo(GrowthMetricStatus.NO_DATA);
        assertThat(result.direction()).isEqualTo(NOT_AVAILABLE);
    }

    @Test
    @DisplayName("comparison은 rankable Record 수가 부족하면 INSUFFICIENT_SAMPLE을 반환한다")
    void should_return_insufficient_sample_when_rankable_record_count_is_below_minimum() {
        List<GrowthRecord> records = new java.util.ArrayList<>();
        records.addAll(periodRecords(1L, new int[] {18000, 19000, 20000, 21000}, "2026-08-06"));
        records.addAll(periodRecords(10L, new int[] {22000, 23000, 24000, 25000}, "2026-08-01"));

        GrowthMetricCalculator.PeriodComparisonResult result = GrowthMetricCalculator.comparePerformancePeriods(
                records,
                COMPARISON_WINDOW
        );

        assertThat(result.status()).isEqualTo(GrowthMetricStatus.INSUFFICIENT_SAMPLE);
        assertThat(result.recentPeriod().rankableCount()).isEqualTo(4);
        assertThat(result.previousPeriod().rankableCount()).isEqualTo(4);
    }

    @Test
    @DisplayName("comparison은 rankable Record가 한 active day에만 있으면 INSUFFICIENT_SAMPLE을 반환한다")
    void should_return_insufficient_sample_when_rankable_records_exist_on_only_one_active_day() {
        List<GrowthRecord> records = new java.util.ArrayList<>();
        records.addAll(periodRecordsOnOneDay(1L, new int[] {18000, 19000, 20000, 21000, 22000}, "2026-08-06"));
        records.addAll(periodRecordsOnOneDay(10L, new int[] {22000, 23000, 24000, 25000, 26000}, "2026-08-01"));

        GrowthMetricCalculator.PeriodComparisonResult result = GrowthMetricCalculator.comparePerformancePeriods(
                records,
                COMPARISON_WINDOW
        );

        assertThat(result.status()).isEqualTo(GrowthMetricStatus.INSUFFICIENT_SAMPLE);
        assertThat(result.recentPeriod().activeDays()).isEqualTo(1);
        assertThat(result.previousPeriod().activeDays()).isEqualTo(1);
    }

    @Test
    @DisplayName("comparison은 faster, slower, unchanged 방향과 raw millisecond improvement percent를 계산한다")
    void should_calculate_comparison_direction_and_improvement_percent_when_sample_is_eligible() {
        GrowthMetricCalculator.PeriodComparisonResult faster = GrowthMetricCalculator.comparePerformancePeriods(
                comparisonRecords(new int[] {18000, 19000, 20000, 21000, 22000}, new int[] {20000, 21000, 22000, 23000, 24000}),
                COMPARISON_WINDOW
        );
        GrowthMetricCalculator.PeriodComparisonResult slower = GrowthMetricCalculator.comparePerformancePeriods(
                comparisonRecords(new int[] {22000, 23000, 24000, 25000, 26000}, new int[] {20000, 21000, 22000, 23000, 24000}),
                COMPARISON_WINDOW
        );
        GrowthMetricCalculator.PeriodComparisonResult unchanged = GrowthMetricCalculator.comparePerformancePeriods(
                comparisonRecords(new int[] {20000, 21000, 22000, 23000, 24000}, new int[] {20000, 21000, 22000, 23000, 24000}),
                COMPARISON_WINDOW
        );

        assertThat(faster.status()).isEqualTo(GrowthMetricStatus.AVAILABLE);
        assertThat(faster.direction()).isEqualTo(FASTER);
        assertThat(faster.improvementPercent()).isEqualByComparingTo(new BigDecimal("9.090909090909091"));
        assertThat(slower.direction()).isEqualTo(SLOWER);
        assertThat(slower.improvementPercent()).isEqualByComparingTo(new BigDecimal("-9.090909090909091"));
        assertThat(unchanged.direction()).isEqualTo(UNCHANGED);
        assertThat(unchanged.improvementPercent()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("IQR은 rankable Record가 8개 미만이면 계산하지 않는다")
    void should_not_calculate_iqr_when_rankable_record_count_is_below_eight() {
        GrowthMetricCalculator.ConsistencyResult result = GrowthMetricCalculator.calculateRecentConsistency(
                recordsForConsistency(values(10000, 1000, 7), new int[0])
        );

        assertThat(result.status()).isEqualTo(GrowthMetricStatus.INSUFFICIENT_DATA);
        assertThat(result.current().status()).isEqualTo(GrowthMetricStatus.INSUFFICIENT_DATA);
        assertThat(result.current().iqrMs()).isNull();
    }

    @Test
    @DisplayName("IQR은 exact 8 rankable Record에서 linear interpolation을 사용한다")
    void should_calculate_iqr_with_linear_interpolation_when_eight_rankable_records_exist() {
        GrowthMetricCalculator.ConsistencyResult result = GrowthMetricCalculator.calculateRecentConsistency(
                recordsForConsistency(values(10000, 1000, 8), new int[0])
        );

        assertThat(result.current().status()).isEqualTo(GrowthMetricStatus.AVAILABLE);
        assertThat(result.current().q1Ms()).isEqualTo(11750);
        assertThat(result.current().q3Ms()).isEqualTo(15250);
        assertThat(result.current().iqrMs()).isEqualTo(3500);
    }

    @Test
    @DisplayName("IQR은 odd와 even rankable population에 같은 percentile contract를 적용한다")
    void should_apply_percentile_contract_to_odd_and_even_rankable_populations() {
        GrowthMetricCalculator.ConsistencyResult odd = GrowthMetricCalculator.calculateRecentConsistency(
                recordsForConsistency(values(10000, 1000, 9), new int[0])
        );
        GrowthMetricCalculator.ConsistencyResult even = GrowthMetricCalculator.calculateRecentConsistency(
                recordsForConsistency(values(10000, 1000, 10), new int[0])
        );

        assertThat(odd.current().iqrMs()).isEqualTo(4000);
        assertThat(even.current().q1Ms()).isEqualTo(12250);
        assertThat(even.current().q3Ms()).isEqualTo(16750);
        assertThat(even.current().iqrMs()).isEqualTo(4500);
    }

    @Test
    @DisplayName("IQR window는 DNF와 PLUS_TWO count를 보존하고 PLUS_TWO effective time을 사용한다")
    void should_preserve_dnf_and_plus_two_counts_when_calculating_iqr() {
        List<GrowthRecord> records = new java.util.ArrayList<>();
        records.add(record(100L, 8000, Penalty.PLUS_TWO, "2026-08-12T00:00:00Z"));
        records.add(record(99L, 9000, Penalty.DNF, "2026-08-11T23:59:00Z"));
        for (int index = 0; index < 10; index++) {
            records.add(record(98L - index, 11000 + index * 1000, Penalty.NONE, "2026-08-11T23:" + String.format("%02d", 58 - index) + ":00Z"));
        }

        GrowthMetricCalculator.ConsistencyResult result = GrowthMetricCalculator.calculateRecentConsistency(records);

        assertThat(result.current().status()).isEqualTo(GrowthMetricStatus.AVAILABLE);
        assertThat(result.current().recordCount()).isEqualTo(12);
        assertThat(result.current().rankableCount()).isEqualTo(11);
        assertThat(result.current().dnfCount()).isEqualTo(1);
        assertThat(result.current().plusTwoCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("IQR comparison은 narrower, wider, unchanged를 시간 성과와 분리해 반환한다")
    void should_return_consistency_direction_without_interpreting_it_as_speed() {
        GrowthMetricCalculator.ConsistencyResult narrower = GrowthMetricCalculator.calculateRecentConsistency(
                recordsForConsistency(values(10000, 100, 12), values(10000, 200, 12))
        );
        GrowthMetricCalculator.ConsistencyResult wider = GrowthMetricCalculator.calculateRecentConsistency(
                recordsForConsistency(values(10000, 200, 12), values(10000, 100, 12))
        );
        GrowthMetricCalculator.ConsistencyResult unchanged = GrowthMetricCalculator.calculateRecentConsistency(
                recordsForConsistency(values(10000, 100, 12), values(10000, 100, 12))
        );

        assertThat(narrower.status()).isEqualTo(GrowthMetricStatus.AVAILABLE);
        assertThat(narrower.direction()).isEqualTo(NARROWER);
        assertThat(wider.direction()).isEqualTo(WIDER);
        assertThat(unchanged.direction()).isEqualTo(GrowthMetricCalculator.ConsistencyDirection.UNCHANGED);
    }

    @Test
    @DisplayName("PB progression은 첫 rankable Record와 strictly improving running minimum만 남긴다")
    void should_emit_only_strictly_improving_pb_progression_points() {
        List<GrowthRecord> records = List.of(
                record(5L, 21000, Penalty.NONE, "2026-08-01T00:04:00Z"),
                record(4L, 23000, Penalty.NONE, "2026-08-01T00:03:00Z"),
                record(3L, 22000, Penalty.NONE, "2026-08-01T00:02:00Z"),
                record(2L, 22000, Penalty.NONE, "2026-08-01T00:01:00Z"),
                record(1L, 23000, Penalty.NONE, "2026-08-01T00:00:00Z")
        );

        assertThat(GrowthMetricCalculator.calculatePbProgression(records))
                .extracting(GrowthMetricCalculator.PbProgressionPoint::recordId)
                .containsExactly(1L, 2L, 5L);
    }

    @Test
    @DisplayName("PB progression은 PLUS_TWO effective time을 사용하고 DNF를 point로 만들지 않는다")
    void should_use_plus_two_effective_time_and_exclude_dnf_from_pb_progression() {
        List<GrowthRecord> records = List.of(
                record(1L, 19000, Penalty.PLUS_TWO, "2026-08-01T00:00:00Z"),
                record(2L, 18000, Penalty.DNF, "2026-08-01T00:01:00Z"),
                record(3L, 20500, Penalty.NONE, "2026-08-01T00:02:00Z")
        );

        assertThat(GrowthMetricCalculator.calculatePbProgression(records))
                .extracting(
                        GrowthMetricCalculator.PbProgressionPoint::recordId,
                        GrowthMetricCalculator.PbProgressionPoint::effectiveTimeMs
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1L, 21000),
                        org.assertj.core.groups.Tuple.tuple(3L, 20500)
                );
    }

    @Test
    @DisplayName("PB progression은 같은 timestamp에서 id ASC를 chronological tie-break로 사용한다")
    void should_use_id_ascending_when_pb_progression_records_share_created_at() {
        List<GrowthRecord> records = List.of(
                record(3L, 23000, Penalty.NONE, "2026-08-01T00:00:00Z"),
                record(2L, 22000, Penalty.NONE, "2026-08-01T00:00:00Z"),
                record(1L, 24000, Penalty.NONE, "2026-08-01T00:00:00Z")
        );

        assertThat(GrowthMetricCalculator.calculatePbProgression(records))
                .extracting(GrowthMetricCalculator.PbProgressionPoint::recordId)
                .containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("PB progression은 penalty mutation 뒤 current retained state에서 다시 계산한다")
    void should_recalculate_pb_progression_from_current_penalty_state() {
        List<GrowthRecord> beforePenaltyMutation = List.of(
                record(1L, 20000, Penalty.NONE, "2026-08-01T00:00:00Z"),
                record(2L, 20500, Penalty.NONE, "2026-08-01T00:01:00Z")
        );
        List<GrowthRecord> afterPenaltyMutation = List.of(
                record(1L, 20000, Penalty.DNF, "2026-08-01T00:00:00Z"),
                record(2L, 20500, Penalty.NONE, "2026-08-01T00:01:00Z")
        );

        assertThat(GrowthMetricCalculator.calculatePbProgression(beforePenaltyMutation))
                .extracting(GrowthMetricCalculator.PbProgressionPoint::recordId)
                .containsExactly(1L);
        assertThat(GrowthMetricCalculator.calculatePbProgression(afterPenaltyMutation))
                .extracting(GrowthMetricCalculator.PbProgressionPoint::recordId)
                .containsExactly(2L);
    }

    @Test
    @DisplayName("PB progression은 삭제된 Record가 없는 current retained fixture만 사용한다")
    void should_not_include_deleted_record_in_pb_progression_fixture() {
        List<GrowthRecord> retainedRecords = List.of(
                record(1L, 20000, Penalty.NONE, "2026-08-01T00:00:00Z")
        );

        assertThat(GrowthMetricCalculator.calculatePbProgression(retainedRecords))
                .extracting(GrowthMetricCalculator.PbProgressionPoint::recordId)
                .containsExactly(1L);
    }

    private static List<GrowthRecord> comparisonRecords(int[] recentValues, int[] previousValues) {
        List<GrowthRecord> records = new java.util.ArrayList<>();
        records.addAll(periodRecords(1L, recentValues, "2026-08-06"));
        records.addAll(periodRecords(100L, previousValues, "2026-08-01"));
        return records;
    }

    private static List<GrowthRecord> periodRecords(long firstId, int[] values, String kstDate) {
        List<GrowthRecord> records = new java.util.ArrayList<>(values.length);
        for (int index = 0; index < values.length; index++) {
            String day = index < 3 ? kstDate : incrementKstDate(kstDate);
            records.add(record(
                    firstId + index,
                    values[index],
                    Penalty.NONE,
                    day + (index < 3 ? "T00:0" + index + ":00+09:00" : "T00:0" + (index - 3) + ":00+09:00")
            ));
        }
        return records;
    }

    private static List<GrowthRecord> periodRecordsOnOneDay(long firstId, int[] values, String kstDate) {
        List<GrowthRecord> records = new java.util.ArrayList<>(values.length);
        for (int index = 0; index < values.length; index++) {
            records.add(record(
                    firstId + index,
                    values[index],
                    Penalty.NONE,
                    kstDate + "T00:0" + index + ":00+09:00"
            ));
        }
        return records;
    }

    private static String incrementKstDate(String date) {
        return java.time.LocalDate.parse(date).plusDays(1).toString();
    }
}
