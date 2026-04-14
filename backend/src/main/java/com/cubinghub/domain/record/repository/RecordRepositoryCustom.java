package com.cubinghub.domain.record.repository;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Record;
import java.util.Optional;

public interface RecordRepositoryCustom {

    Optional<Record> findBestRecordByUserIdAndEventType(Long userId, EventType eventType);
}
