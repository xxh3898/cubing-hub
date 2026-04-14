package com.cubinghub.domain.record.dto.response;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import lombok.Getter;

@Getter
public class RecordPenaltyUpdateResponse {

    private final Long id;
    private final EventType eventType;
    private final Integer timeMs;
    private final Integer effectiveTimeMs;
    private final Penalty penalty;

    public RecordPenaltyUpdateResponse(Long id, EventType eventType, Integer timeMs, Integer effectiveTimeMs, Penalty penalty) {
        this.id = id;
        this.eventType = eventType;
        this.timeMs = timeMs;
        this.effectiveTimeMs = effectiveTimeMs;
        this.penalty = penalty;
    }

    public static RecordPenaltyUpdateResponse from(Record record) {
        return new RecordPenaltyUpdateResponse(
                record.getId(),
                record.getEventType(),
                record.getTimeMs(),
                record.getEffectiveTimeMs(),
                record.getPenalty()
        );
    }
}
