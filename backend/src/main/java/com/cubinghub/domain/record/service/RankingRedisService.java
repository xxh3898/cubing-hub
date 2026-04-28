package com.cubinghub.domain.record.service;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.dto.response.RankingPageResponse;
import com.cubinghub.domain.record.dto.response.RankingResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RankingQueryResult;
import com.cubinghub.domain.record.repository.RankingRedisRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RankingRedisService {

    private final RankingRedisRepository rankingRedisRepository;

    public boolean isReady(EventType eventType) {
        return rankingRedisRepository.isReady(eventType);
    }

    public RankingPageResponse getRankings(EventType eventType, Integer page, Integer size) {
        Page<RankingRedisEntry> rankings = rankingRedisRepository.readPage(eventType, PageRequest.of(page - 1, size));
        List<RankingResponse> responses = new ArrayList<>(rankings.getNumberOfElements());
        int startRank = (page - 1) * size;

        for (int i = 0; i < rankings.getContent().size(); i++) {
            RankingRedisEntry ranking = rankings.getContent().get(i);
            responses.add(new RankingResponse(
                    startRank + i + 1,
                    ranking.getNickname(),
                    ranking.getEventType(),
                    ranking.getTimeMs()
            ));
        }

        return new RankingPageResponse(
                responses,
                page,
                size,
                rankings.getTotalElements(),
                rankings.getTotalPages(),
                rankings.hasNext(),
                rankings.hasPrevious()
        );
    }

    public void sync(UserPB userPB) {
        rankingRedisRepository.upsert(new RankingRedisEntry(
                userPB.getUser().getId(),
                userPB.getUser().getNickname(),
                userPB.getEventType(),
                userPB.getBestTimeMs(),
                userPB.getRecord().getId(),
                userPB.getRecord().getCreatedAt()
        ));
    }

    public void remove(EventType eventType, Long userId) {
        rankingRedisRepository.remove(eventType, userId);
    }

    public Optional<RankingQueryResult> getRanking(EventType eventType, Long userId) {
        return rankingRedisRepository.findRankingByUserId(eventType, userId);
    }
}
