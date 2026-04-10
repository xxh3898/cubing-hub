package com.cubinghub.domain.record.dto;

import com.cubinghub.domain.record.entity.EventType;
import lombok.Getter;

@Getter
public class RankingResponse {

    private final Integer rank;
    private final String nickname;
    private final EventType eventType;
    private final Integer timeMs;

    public RankingResponse(Integer rank, String nickname, EventType eventType, Integer timeMs) {
        this.rank = rank;
        this.nickname = nickname;
        this.eventType = eventType;
        this.timeMs = timeMs;
    }
}
