package com.cubinghub.domain.record.repository;

import static com.cubinghub.domain.record.entity.QRecord.record;
import static com.cubinghub.domain.record.entity.QUserPB.userPB;
import static com.cubinghub.domain.user.entity.QUser.user;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
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

    private static final String SEARCH_RANKINGS_QUERY = """
            SELECT ranked.global_rank, ranked.nickname, ranked.event_type, ranked.time_ms
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY up.best_time_ms ASC, r.created_at ASC, r.id ASC) AS global_rank,
                    u.nickname AS nickname,
                    up.event_type AS event_type,
                    up.best_time_ms AS time_ms
                FROM user_pbs up
                JOIN users u ON up.user_id = u.id
                JOIN records r ON up.record_id = r.id
                WHERE up.event_type = :eventType
            ) ranked
            WHERE (:nickname IS NULL OR LOWER(ranked.nickname) LIKE CONCAT('%', LOWER(:nickname), '%'))
            ORDER BY ranked.global_rank
            LIMIT :limit OFFSET :offset
            """;

    private static final String SEARCH_RANKINGS_COUNT_QUERY = """
            SELECT COUNT(*)
            FROM user_pbs up
            JOIN users u ON up.user_id = u.id
            WHERE up.event_type = :eventType
              AND (:nickname IS NULL OR LOWER(u.nickname) LIKE CONCAT('%', LOWER(:nickname), '%'))
            """;

    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    @Override
    public Page<RankingQueryResult> searchRankings(EventType eventType, String nickname, Pageable pageable) {
        String normalizedNickname = normalizeSearchTerm(nickname);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(SEARCH_RANKINGS_QUERY)
                .setParameter("eventType", eventType.name())
                .setParameter("nickname", normalizedNickname)
                .setParameter("limit", pageable.getPageSize())
                .setParameter("offset", Math.toIntExact(pageable.getOffset()))
                .getResultList();

        List<RankingQueryResult> items = rows.stream()
                .map(this::mapRankingQueryResult)
                .toList();

        Number total = (Number) entityManager.createNativeQuery(SEARCH_RANKINGS_COUNT_QUERY)
                .setParameter("eventType", eventType.name())
                .setParameter("nickname", normalizedNickname)
                .getSingleResult();

        return new PageImpl<>(items, pageable, total.longValue());
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

    private String normalizeSearchTerm(String searchTerm) {
        if (!StringUtils.hasText(searchTerm)) {
            return null;
        }

        return searchTerm.trim();
    }

    private RankingQueryResult mapRankingQueryResult(Object[] row) {
        return new RankingQueryResult(
                ((Number) row[0]).intValue(),
                (String) row[1],
                EventType.valueOf((String) row[2]),
                ((Number) row[3]).intValue()
        );
    }
}
