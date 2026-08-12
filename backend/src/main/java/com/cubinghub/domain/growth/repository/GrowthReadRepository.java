package com.cubinghub.domain.growth.repository;

import com.cubinghub.domain.growth.metric.GrowthRecord;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class GrowthReadRepository {

    static final String LATEST_RECORDS_QUERY = """
            SELECT id, time_ms, penalty, created_at
            FROM records FORCE INDEX (idx_record_user_event_created_at_id)
            WHERE user_id = :userId
              AND event_type = :eventType
            ORDER BY created_at DESC, id DESC
            LIMIT :limit
            """;

    static final String RANGE_RECORDS_QUERY = """
            SELECT id, time_ms, penalty, created_at
            FROM records FORCE INDEX (idx_record_user_event_created_at_id)
            WHERE user_id = :userId
              AND event_type = :eventType
              AND created_at >= :fromUtc
              AND created_at < :toUtc
            ORDER BY created_at DESC, id DESC
            """;

    static final String CURRENT_PB_QUERY = """
            SELECT r.id, r.time_ms, r.penalty, up.best_time_ms, r.created_at
            FROM user_pbs up
            JOIN records r ON r.id = up.record_id
            WHERE up.user_id = :userId
              AND up.event_type = :eventType
            """;

    static final String ACTIVITY_SUMMARY_QUERY = """
            SELECT
                COUNT(*) AS total_solve_count,
                SUM(CASE
                    WHEN created_at >= :last7FromUtc AND created_at < :last7ToUtc THEN 1
                    ELSE 0
                END) AS last_7_days_solve_count,
                SUM(CASE
                    WHEN created_at >= :previous7FromUtc AND created_at < :previous7ToUtc THEN 1
                    ELSE 0
                END) AS previous_7_days_solve_count,
                SUM(CASE
                    WHEN created_at >= :last30FromUtc AND created_at < :last30ToUtc THEN 1
                    ELSE 0
                END) AS last_30_days_solve_count,
                COUNT(DISTINCT CASE
                    WHEN created_at >= :last30FromUtc AND created_at < :last30ToUtc
                    THEN DATE(DATE_ADD(created_at, INTERVAL 9 HOUR))
                END) AS active_days_last_30_days,
                MIN(created_at) AS first_recorded_at,
                MAX(created_at) AS latest_recorded_at
            FROM records FORCE INDEX (idx_record_user_event_created_at_id)
            WHERE user_id = :userId
              AND event_type = :eventType
            """;

    static final String DAILY_AGGREGATE_QUERY = """
            WITH ranged AS (
                SELECT
                    DATE(DATE_ADD(created_at, INTERVAL 9 HOUR)) AS practice_date,
                    penalty,
                    CASE penalty
                        WHEN 'NONE' THEN time_ms
                        WHEN 'PLUS_TWO' THEN time_ms + 2000
                        ELSE NULL
                    END AS effective_time_ms
                FROM records FORCE INDEX (idx_record_user_event_created_at_id)
                WHERE user_id = :userId
                  AND event_type = :eventType
                  AND created_at >= :fromUtc
                  AND created_at < :toUtc
            ),
            ranked AS (
                SELECT
                    practice_date,
                    effective_time_ms,
                    ROW_NUMBER() OVER (
                        PARTITION BY practice_date
                        ORDER BY effective_time_ms
                    ) AS position_in_day,
                    COUNT(*) OVER (PARTITION BY practice_date) AS rankable_count
                FROM ranged
                WHERE effective_time_ms IS NOT NULL
            ),
            daily_medians AS (
                SELECT practice_date, ROUND(AVG(effective_time_ms)) AS median_time_ms
                FROM ranked
                WHERE position_in_day IN (
                    FLOOR((rankable_count + 1) / 2),
                    FLOOR((rankable_count + 2) / 2)
                )
                GROUP BY practice_date
            ),
            daily_counts AS (
                SELECT
                    practice_date,
                    COUNT(*) AS record_count,
                    SUM(CASE WHEN penalty <> 'DNF' THEN 1 ELSE 0 END) AS rankable_count,
                    SUM(CASE WHEN penalty = 'DNF' THEN 1 ELSE 0 END) AS dnf_count,
                    SUM(CASE WHEN penalty = 'PLUS_TWO' THEN 1 ELSE 0 END) AS plus_two_count
                FROM ranged
                GROUP BY practice_date
            )
            SELECT
                daily_counts.practice_date,
                daily_counts.record_count,
                daily_counts.rankable_count,
                daily_medians.median_time_ms,
                daily_counts.dnf_count,
                daily_counts.plus_two_count
            FROM daily_counts
            LEFT JOIN daily_medians ON daily_medians.practice_date = daily_counts.practice_date
            ORDER BY daily_counts.practice_date ASC
            """;

    static final String PB_PROGRESSION_CTE = """
            WITH canonical AS (
                SELECT
                    id,
                    time_ms,
                    penalty,
                    created_at,
                    CASE penalty
                        WHEN 'NONE' THEN time_ms
                        WHEN 'PLUS_TWO' THEN time_ms + 2000
                    END AS effective_time_ms
                FROM records FORCE INDEX (idx_record_user_event_created_at_id)
                WHERE user_id = :userId
                  AND event_type = :eventType
                  AND penalty <> 'DNF'
            ),
            running AS (
                SELECT
                    canonical.*,
                    MIN(effective_time_ms) OVER (
                        ORDER BY created_at ASC, id ASC
                        ROWS UNBOUNDED PRECEDING
                    ) AS running_best_time_ms
                FROM canonical
            ),
            scanned AS (
                SELECT
                    running.*,
                    LAG(running_best_time_ms) OVER (
                        ORDER BY created_at ASC, id ASC
                    ) AS previous_best_time_ms
                FROM running
            )
            """;

    static final String PB_PROGRESSION_POINTS_QUERY = PB_PROGRESSION_CTE + """
            SELECT id, time_ms, penalty, effective_time_ms, created_at
            FROM scanned
            WHERE previous_best_time_ms IS NULL
               OR effective_time_ms < previous_best_time_ms
            ORDER BY created_at DESC, id DESC
            LIMIT :limit OFFSET :offset
            """;

    static final String PB_PROGRESSION_COUNT_QUERY = PB_PROGRESSION_CTE + """
            SELECT COUNT(*)
            FROM scanned
            WHERE previous_best_time_ms IS NULL
               OR effective_time_ms < previous_best_time_ms
            """;

    private final EntityManager entityManager;

    public List<GrowthRecord> findRecentRecords(Long userId, EventType eventType, int limit) {
        if (limit < 1) {
            throw new IllegalArgumentException("recent Record limit은 1 이상이어야 합니다.");
        }

        return resultList(entityManager.createNativeQuery(LATEST_RECORDS_QUERY)
                .setParameter("userId", userId)
                .setParameter("eventType", eventType.name())
                .setParameter("limit", limit))
                .stream()
                .map(this::toGrowthRecord)
                .toList();
    }

    public List<GrowthRecord> findRecordsInRange(
            Long userId,
            EventType eventType,
            Instant fromUtc,
            Instant toUtc
    ) {
        return resultList(entityManager.createNativeQuery(RANGE_RECORDS_QUERY)
                .setParameter("userId", userId)
                .setParameter("eventType", eventType.name())
                .setParameter("fromUtc", Timestamp.from(fromUtc))
                .setParameter("toUtc", Timestamp.from(toUtc)))
                .stream()
                .map(this::toGrowthRecord)
                .toList();
    }

    public Optional<CurrentPb> findCurrentPb(Long userId, EventType eventType) {
        return resultList(entityManager.createNativeQuery(CURRENT_PB_QUERY)
                .setParameter("userId", userId)
                .setParameter("eventType", eventType.name()))
                .stream()
                .findFirst()
                .map(row -> new CurrentPb(
                        number(row[0]).longValue(),
                        number(row[1]).intValue(),
                        Penalty.valueOf((String) row[2]),
                        number(row[3]).intValue(),
                        toInstant(row[4])
                ));
    }

    public ActivitySummary findActivitySummary(
            Long userId,
            EventType eventType,
            Instant last7FromUtc,
            Instant last7ToUtc,
            Instant previous7FromUtc,
            Instant previous7ToUtc,
            Instant last30FromUtc,
            Instant last30ToUtc
    ) {
        Object[] row = (Object[]) entityManager.createNativeQuery(ACTIVITY_SUMMARY_QUERY)
                .setParameter("userId", userId)
                .setParameter("eventType", eventType.name())
                .setParameter("last7FromUtc", Timestamp.from(last7FromUtc))
                .setParameter("last7ToUtc", Timestamp.from(last7ToUtc))
                .setParameter("previous7FromUtc", Timestamp.from(previous7FromUtc))
                .setParameter("previous7ToUtc", Timestamp.from(previous7ToUtc))
                .setParameter("last30FromUtc", Timestamp.from(last30FromUtc))
                .setParameter("last30ToUtc", Timestamp.from(last30ToUtc))
                .getSingleResult();

        return new ActivitySummary(
                numberOrZero(row[0]).longValue(),
                numberOrZero(row[1]).longValue(),
                numberOrZero(row[2]).longValue(),
                numberOrZero(row[3]).longValue(),
                numberOrZero(row[4]).intValue(),
                row[5] == null ? null : toInstant(row[5]),
                row[6] == null ? null : toInstant(row[6])
        );
    }

    public List<DailyAggregate> findDailyAggregates(
            Long userId,
            EventType eventType,
            Instant fromUtc,
            Instant toUtc
    ) {
        return resultList(entityManager.createNativeQuery(DAILY_AGGREGATE_QUERY)
                .setParameter("userId", userId)
                .setParameter("eventType", eventType.name())
                .setParameter("fromUtc", Timestamp.from(fromUtc))
                .setParameter("toUtc", Timestamp.from(toUtc)))
                .stream()
                .map(row -> new DailyAggregate(
                        toLocalDate(row[0]),
                        number(row[1]).intValue(),
                        number(row[2]).intValue(),
                        row[3] == null ? null : number(row[3]).intValue(),
                        number(row[4]).intValue(),
                        number(row[5]).intValue()
                ))
                .toList();
    }

    public PbProgressionPage findPbProgression(Long userId, EventType eventType, int page, int size) {
        long offset = (long) (page - 1) * size;
        List<PbProgressionRecord> content = resultList(entityManager.createNativeQuery(PB_PROGRESSION_POINTS_QUERY)
                .setParameter("userId", userId)
                .setParameter("eventType", eventType.name())
                .setParameter("limit", size)
                .setParameter("offset", offset))
                .stream()
                .map(row -> new PbProgressionRecord(
                        number(row[0]).longValue(),
                        number(row[1]).intValue(),
                        Penalty.valueOf((String) row[2]),
                        number(row[3]).intValue(),
                        toInstant(row[4])
                ))
                .toList();

        Number total = (Number) entityManager.createNativeQuery(PB_PROGRESSION_COUNT_QUERY)
                .setParameter("userId", userId)
                .setParameter("eventType", eventType.name())
                .getSingleResult();

        return new PbProgressionPage(content, total.longValue());
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> resultList(Query query) {
        return (List<Object[]>) query.getResultList();
    }

    private GrowthRecord toGrowthRecord(Object[] row) {
        return new GrowthRecord(
                number(row[0]).longValue(),
                number(row[1]).intValue(),
                Penalty.valueOf((String) row[2]),
                toInstant(row[3])
        );
    }

    private Number number(Object value) {
        if (!(value instanceof Number number)) {
            throw new IllegalStateException("Growth query가 numeric 값을 반환하지 않았습니다.");
        }
        return number;
    }

    private Number numberOrZero(Object value) {
        return value == null ? 0 : number(value);
    }

    private Instant toInstant(Object value) {
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant();
        }
        throw new IllegalStateException("Growth query가 timestamp 값을 반환하지 않았습니다.");
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date date) {
            return date.toLocalDate();
        }
        return LocalDate.parse(value.toString());
    }

    public record CurrentPb(
            long recordId,
            int timeMs,
            Penalty penalty,
            int effectiveTimeMs,
            Instant createdAt
    ) {
    }

    public record ActivitySummary(
            long totalSolveCount,
            long last7DaysSolveCount,
            long previous7DaysSolveCount,
            long last30DaysSolveCount,
            int activeDaysLast30Days,
            Instant firstRecordedAt,
            Instant latestRecordedAt
    ) {
    }

    public record DailyAggregate(
            LocalDate date,
            int recordCount,
            int rankableCount,
            Integer medianTimeMs,
            int dnfCount,
            int plusTwoCount
    ) {
    }

    public record PbProgressionRecord(
            long recordId,
            int timeMs,
            Penalty penalty,
            int effectiveTimeMs,
            Instant createdAt
    ) {
    }

    public record PbProgressionPage(List<PbProgressionRecord> content, long totalElements) {

        public PbProgressionPage {
            content = List.copyOf(content);
        }
    }
}
