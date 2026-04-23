package com.cubinghub.domain.record.repository;

import static com.cubinghub.domain.record.entity.QRecord.record;
import static com.cubinghub.domain.record.entity.QUserPB.userPB;
import static com.cubinghub.domain.user.entity.QUser.user;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

@Repository
@RequiredArgsConstructor
public class UserPBRepositoryImpl implements UserPBRepositoryCustom {

    private static final String SEARCH_RANKINGS_QUERY_BASE = """
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
            """;

    private static final String SEARCH_RANKINGS_QUERY_WITH_NICKNAME = SEARCH_RANKINGS_QUERY_BASE + """
            WHERE LOWER(ranked.nickname) LIKE CONCAT('%', :nickname, '%')
            ORDER BY ranked.global_rank
            LIMIT :limit OFFSET :offset
            """;

    private static final String SEARCH_RANKINGS_QUERY_WITHOUT_NICKNAME = SEARCH_RANKINGS_QUERY_BASE + """
            ORDER BY ranked.global_rank
            LIMIT :limit OFFSET :offset
            """;

    private static final String SEARCH_RANKINGS_COUNT_QUERY_BASE = """
            SELECT COUNT(*)
            FROM user_pbs up
            WHERE up.event_type = :eventType
            """;

    private static final String SEARCH_RANKINGS_COUNT_QUERY_WITH_NICKNAME = """
            SELECT COUNT(*)
            FROM user_pbs up
            JOIN users u ON up.user_id = u.id
            WHERE up.event_type = :eventType
              AND LOWER(u.nickname) LIKE CONCAT('%', :nickname, '%')
            """;

    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    @Override
    public Page<RankingQueryResult> searchRankings(EventType eventType, String nickname, Pageable pageable) {
        String normalizedNickname = normalizeSearchTerm(nickname);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = createSearchRankingsQuery(eventType, normalizedNickname, pageable)
                .getResultList();

        List<RankingQueryResult> items = rows.stream()
                .map(this::mapRankingQueryResult)
                .toList();

        Number total = (Number) createSearchRankingsCountQuery(eventType, normalizedNickname)
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

        return searchTerm.trim().toLowerCase(Locale.ROOT);
    }

    private RankingQueryResult mapRankingQueryResult(Object[] row) {
        return new RankingQueryResult(
                ((Number) row[0]).intValue(),
                (String) row[1],
                EventType.valueOf((String) row[2]),
                ((Number) row[3]).intValue()
        );
    }

    private Query createSearchRankingsQuery(EventType eventType, String normalizedNickname, Pageable pageable) {
        Query query = entityManager.createNativeQuery(
                normalizedNickname == null ? SEARCH_RANKINGS_QUERY_WITHOUT_NICKNAME : SEARCH_RANKINGS_QUERY_WITH_NICKNAME
        )
                .setParameter("eventType", eventType.name())
                .setParameter("limit", pageable.getPageSize())
                .setParameter("offset", Math.toIntExact(pageable.getOffset()));

        if (normalizedNickname != null) {
            query.setParameter("nickname", normalizedNickname);
        }

        return query;
    }

    private Query createSearchRankingsCountQuery(EventType eventType, String normalizedNickname) {
        Query query = entityManager.createNativeQuery(
                normalizedNickname == null ? SEARCH_RANKINGS_COUNT_QUERY_BASE : SEARCH_RANKINGS_COUNT_QUERY_WITH_NICKNAME
        )
                .setParameter("eventType", eventType.name());

        if (normalizedNickname != null) {
            query.setParameter("nickname", normalizedNickname);
        }

        return query;
    }
}
