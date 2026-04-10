package com.cubinghub.domain.record.dto;

import com.cubinghub.domain.record.entity.EventType;
import lombok.Getter;

@Getter
public class RankingQueryResult {

    private final String nickname;
    private final EventType eventType;
    private final Integer timeMs;

    public RankingQueryResult(String nickname, EventType eventType, Integer timeMs) {
        this.nickname = nickname;
        this.eventType = eventType;
        this.timeMs = timeMs;
    }
}
