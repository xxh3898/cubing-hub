package com.cubinghub.domain.record.repository;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import static com.cubinghub.domain.record.entity.QRecord.record;
import static com.cubinghub.domain.user.entity.QUser.user;

@Repository
@RequiredArgsConstructor
public class RecordRepositoryImpl implements RecordRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<RankingQueryResult> findTop100RankingsByEventType(EventType eventType) {
        NumberExpression<Integer> effectiveTime = effectiveTimeExpression();

        return queryFactory
                .select(Projections.constructor(
                        RankingQueryResult.class,
                        user.nickname,
                        record.eventType,
                        effectiveTime
                ))
                .from(record)
                .join(record.user, user)
                .where(
                        record.eventType.eq(eventType),
                        record.penalty.ne(Penalty.DNF)
                )
                .orderBy(
                        effectiveTime.asc(),
                        record.createdAt.asc(),
                        record.id.asc()
                )
                .limit(100)
                .fetch();
    }

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

    private NumberExpression<Integer> effectiveTimeExpression() {
        return new CaseBuilder()
                .when(record.penalty.eq(Penalty.PLUS_TWO))
                .then(record.timeMs.add(Penalty.PLUS_TWO_MILLIS))
                .otherwise(record.timeMs);
    }
}
