package com.cubinghub.domain.record;

import com.cubinghub.domain.record.dto.RankingQueryResult;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.cubinghub.domain.record.QRecord.record;
import static com.cubinghub.domain.user.QUser.user;

@Repository
@RequiredArgsConstructor
public class RecordRepositoryImpl implements RecordRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<RankingQueryResult> findTop100RankingsByEventType(EventType eventType) {
        return queryFactory
                .select(Projections.constructor(
                        RankingQueryResult.class,
                        user.nickname,
                        record.eventType,
                        record.timeMs
                ))
                .from(record)
                .join(record.user, user)
                .where(
                        record.eventType.eq(eventType),
                        record.penalty.ne(Penalty.DNF)
                )
                .orderBy(
                        record.timeMs.asc(),
                        record.createdAt.asc(),
                        record.id.asc()
                )
                .limit(100)
                .fetch();
    }
}
