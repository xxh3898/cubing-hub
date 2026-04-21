package com.cubinghub.domain.record.service;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.repository.RankingRedisRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RankingRedisBackfillService {

    private final UserPBRepository userPBRepository;
    private final RankingRedisRepository rankingRedisRepository;

    @Value("${ranking.redis.batch-size:1000}")
    private int batchSize;

    public void rebuildAll() {
        for (EventType eventType : EventType.values()) {
            rebuild(eventType);
        }
    }

    public void rebuild(EventType eventType) {
        int safeBatchSize = Math.max(batchSize, 1);
        int page = 0;
        Page<RankingRedisEntry> rankings;

        rankingRedisRepository.clear(eventType);

        do {
            rankings = userPBRepository.findRankingRedisEntries(eventType, PageRequest.of(page, safeBatchSize));
            for (RankingRedisEntry ranking : rankings.getContent()) {
                rankingRedisRepository.upsert(ranking);
            }
            page++;
        } while (rankings.hasNext());

        rankingRedisRepository.markReady(eventType);
        log.info("Redis ranking rebuild completed - eventType: {}, total: {}", eventType, rankings.getTotalElements());
    }
}
