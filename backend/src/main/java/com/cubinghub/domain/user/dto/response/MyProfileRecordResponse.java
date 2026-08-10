package com.cubinghub.domain.user.dto.response;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.InputMethod;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import java.time.Instant;
import lombok.Getter;

@Getter
public class MyProfileRecordResponse {

    private final Long id;
    private final EventType eventType;
    private final Integer timeMs;
    private final Integer effectiveTimeMs;
    private final Penalty penalty;
    private final InputMethod inputMethod;
    private final Instant createdAt;

    public MyProfileRecordResponse(
            Long id,
            EventType eventType,
            Integer timeMs,
            Integer effectiveTimeMs,
            Penalty penalty,
            InputMethod inputMethod,
            Instant createdAt
    ) {
        this.id = id;
        this.eventType = eventType;
        this.timeMs = timeMs;
        this.effectiveTimeMs = effectiveTimeMs;
        this.penalty = penalty;
        this.inputMethod = inputMethod;
        this.createdAt = createdAt;
    }

    public static MyProfileRecordResponse from(Record record) {
        return new MyProfileRecordResponse(
                record.getId(),
                record.getEventType(),
                record.getTimeMs(),
                record.getEffectiveTimeMs(),
                record.getPenalty(),
                record.getInputMethod(),
                record.getCreatedAt()
        );
    }
}
