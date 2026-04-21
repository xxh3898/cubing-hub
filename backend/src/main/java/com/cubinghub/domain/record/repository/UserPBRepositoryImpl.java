package com.cubinghub.domain.record.repository;

import static com.cubinghub.domain.record.entity.QRecord.record;
import static com.cubinghub.domain.record.entity.QUserPB.userPB;
import static com.cubinghub.domain.user.entity.QUser.user;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

@Repository
@RequiredArgsConstructor
public class UserPBRepositoryImpl implements UserPBRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<RankingQueryResult> searchRankings(EventType eventType, String nickname, Pageable pageable) {
        List<RankingQueryResult> items = queryFactory
                .select(Projections.constructor(
                        RankingQueryResult.class,
                        user.nickname,
                        userPB.eventType,
                        userPB.bestTimeMs
                ))
                .from(userPB)
                .join(userPB.user, user)
                .join(userPB.record, record)
                .where(
                        userPB.eventType.eq(eventType),
                        nicknameContains(nickname)
                )
                .orderBy(
                        userPB.bestTimeMs.asc(),
                        record.createdAt.asc(),
                        record.id.asc()
                )
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(userPB.count())
                .from(userPB)
                .join(userPB.user, user)
                .where(
                        userPB.eventType.eq(eventType),
                        nicknameContains(nickname)
                )
                .fetchOne();

        return new PageImpl<>(items, pageable, total);
    }

    @Override
    public Page<RankingRedisEntry> findRankingRedisEntries(EventType eventType, Pageable pageable) {
        List<RankingRedisEntry> items = queryFactory
                .select(Projections.constructor(
                        RankingRedisEntry.class,
                        user.id,
                        user.nickname,
                        userPB.eventType,
                        userPB.bestTimeMs,
                        record.id,
                        record.createdAt
                ))
                .from(userPB)
                .join(userPB.user, user)
                .join(userPB.record, record)
                .where(userPB.eventType.eq(eventType))
                .orderBy(
                        userPB.bestTimeMs.asc(),
                        record.createdAt.asc(),
                        record.id.asc()
                )
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(userPB.count())
                .from(userPB)
                .where(userPB.eventType.eq(eventType))
                .fetchOne();

        return new PageImpl<>(items, pageable, total);
    }

    private BooleanExpression nicknameContains(String nickname) {
        if (!StringUtils.hasText(nickname)) {
            return null;
        }

        return user.nickname.containsIgnoreCase(nickname.trim());
    }
}
