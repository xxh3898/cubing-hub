package com.cubinghub.domain.record.dto.response;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.InputMethod;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import java.time.Instant;
import lombok.Getter;

@Getter
public class RecordCreateResponse {

    private final Long id;
    private final EventType eventType;
    private final Integer timeMs;
    private final Penalty penalty;
    private final Integer effectiveTimeMs;
    private final String scramble;
    private final InputMethod inputMethod;
    private final Instant createdAt;

    public RecordCreateResponse(
            Long id,
            EventType eventType,
            Integer timeMs,
            Penalty penalty,
            Integer effectiveTimeMs,
            String scramble,
            InputMethod inputMethod,
            Instant createdAt
    ) {
        this.id = id;
        this.eventType = eventType;
        this.timeMs = timeMs;
        this.penalty = penalty;
        this.effectiveTimeMs = effectiveTimeMs;
        this.scramble = scramble;
        this.inputMethod = inputMethod;
        this.createdAt = createdAt;
    }

    public static RecordCreateResponse from(Record record) {
        return new RecordCreateResponse(
                record.getId(),
                record.getEventType(),
                record.getTimeMs(),
                record.getPenalty(),
                record.getEffectiveTimeMs(),
                record.getScramble(),
                record.getInputMethod(),
                record.getCreatedAt()
        );
    }
}
