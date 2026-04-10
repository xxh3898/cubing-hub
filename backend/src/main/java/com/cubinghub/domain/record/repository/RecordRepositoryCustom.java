package com.cubinghub.domain.record.repository;

import com.cubinghub.domain.record.dto.RankingQueryResult;
import com.cubinghub.domain.record.entity.EventType;

import java.util.List;

public interface RecordRepositoryCustom {
    List<RankingQueryResult> findTop100RankingsByEventType(EventType eventType);
}
