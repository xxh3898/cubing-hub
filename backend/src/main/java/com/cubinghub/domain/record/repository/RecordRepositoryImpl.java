package com.cubinghub.domain.record.repository;

import com.querydsl.core.Tuple;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import static com.cubinghub.domain.record.entity.QRecord.record;

@Repository
@RequiredArgsConstructor
public class RecordRepositoryImpl implements RecordRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Optional<Record> findBestRecordByUserIdAndEventType(Long userId, EventType eventType) {
        NumberExpression<Integer> effectiveTime = effectiveTimeExpression();

        return Optional.ofNullable(
                queryFactory
                        .selectFrom(record)
                        .where(
                                record.user.id.eq(userId),
                                record.eventType.eq(eventType),
                                record.penalty.ne(Penalty.DNF)
                        )
                        .orderBy(
                                effectiveTime.asc(),
                                record.createdAt.asc(),
                                record.id.asc()
                        )
                        .limit(1)
                        .fetchOne()
        );
    }

    @Override
    public RecordSummaryQueryResult findSummaryByUserId(Long userId) {
        NumberExpression<Long> totalSolveCountExpression = record.count();
        Long totalSolveCount = queryFactory
                .select(totalSolveCountExpression)
                .from(record)
                .where(record.user.id.eq(userId))
                .fetchOne();

        NumberExpression<Integer> effectiveTimeExpression = effectiveTimeExpression();
        NumberExpression<Integer> personalBestTimeExpression = effectiveTimeExpression.min();
        NumberExpression<Double> averageTimeExpression = effectiveTimeExpression.avg();

        Tuple result = queryFactory
                .select(
                        personalBestTimeExpression,
                        averageTimeExpression
                )
                .from(record)
                .where(
                        record.user.id.eq(userId),
                        record.penalty.ne(Penalty.DNF)
                )
                .fetchOne();

        return new RecordSummaryQueryResult(
                totalSolveCount == null ? 0L : totalSolveCount,
                result == null ? null : result.get(personalBestTimeExpression),
                result == null ? null : result.get(averageTimeExpression)
        );
    }

    private NumberExpression<Integer> effectiveTimeExpression() {
        return new CaseBuilder()
                .when(record.penalty.eq(Penalty.PLUS_TWO))
                .then(record.timeMs.add(Penalty.PLUS_TWO_MILLIS))
                .otherwise(record.timeMs);
    }
}
