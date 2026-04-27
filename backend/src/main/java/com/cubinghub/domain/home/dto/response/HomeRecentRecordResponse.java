package com.cubinghub.domain.home.dto.response;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import java.time.Instant;
import lombok.Getter;

@Getter
public class HomeRecentRecordResponse {

    private final Long id;
    private final EventType eventType;
    private final Integer timeMs;
    private final Integer effectiveTimeMs;
    private final Penalty penalty;
    private final String scramble;
    private final Instant createdAt;

    public HomeRecentRecordResponse(
            Long id,
            EventType eventType,
            Integer timeMs,
            Integer effectiveTimeMs,
            Penalty penalty,
            String scramble,
            Instant createdAt
    ) {
        this.id = id;
        this.eventType = eventType;
        this.timeMs = timeMs;
        this.effectiveTimeMs = effectiveTimeMs;
        this.penalty = penalty;
        this.scramble = scramble;
        this.createdAt = createdAt;
    }

    public static HomeRecentRecordResponse from(Record record) {
        return new HomeRecentRecordResponse(
                record.getId(),
                record.getEventType(),
                record.getTimeMs(),
                record.getEffectiveTimeMs(),
                record.getPenalty(),
                record.getScramble(),
                record.getCreatedAt()
        );
    }
}
