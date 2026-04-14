package com.cubinghub.domain.record.repository;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Record;

import java.util.List;
import java.util.Optional;

public interface RecordRepositoryCustom {

    List<RankingQueryResult> findTop100RankingsByEventType(EventType eventType);

    Optional<Record> findBestRecordByUserIdAndEventType(Long userId, EventType eventType);
}
