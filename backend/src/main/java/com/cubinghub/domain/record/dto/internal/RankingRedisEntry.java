package com.cubinghub.domain.record.dto.internal;

import com.cubinghub.domain.record.entity.EventType;
import java.time.Instant;
import lombok.Getter;

@Getter
public class RankingRedisEntry {

    private final Long userId;
    private final String nickname;
    private final EventType eventType;
    private final Integer timeMs;
    private final Long recordId;
    private final Instant recordCreatedAt;

    public RankingRedisEntry(
            Long userId,
            String nickname,
            EventType eventType,
            Integer timeMs,
            Long recordId,
            Instant recordCreatedAt
    ) {
        this.userId = userId;
        this.nickname = nickname;
        this.eventType = eventType;
        this.timeMs = timeMs;
        this.recordId = recordId;
        this.recordCreatedAt = recordCreatedAt;
    }

    public static RankingRedisEntry forRead(Long userId, String nickname, EventType eventType, Integer timeMs) {
        return new RankingRedisEntry(userId, nickname, eventType, timeMs, null, null);
    }
}
