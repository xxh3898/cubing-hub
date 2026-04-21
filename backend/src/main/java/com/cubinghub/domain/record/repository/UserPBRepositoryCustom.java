package com.cubinghub.domain.record.repository;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserPBRepositoryCustom {
    Page<RankingQueryResult> searchRankings(EventType eventType, String nickname, Pageable pageable);

    Page<RankingRedisEntry> findRankingRedisEntries(EventType eventType, Pageable pageable);
}
