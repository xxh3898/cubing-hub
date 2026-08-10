package com.cubinghub.domain.record.policy;

import com.cubinghub.domain.record.entity.EventType;

public record PracticeEventCapability(
        EventType eventType,
        ResultKind resultKind,
        boolean practiceTimerSupported,
        boolean scrambleSupported,
        boolean practiceRecordSupported,
        boolean practiceRankingSupported
) {
}
