package com.cubinghub.domain.record;

import com.cubinghub.domain.record.dto.RankingQueryResult;

import java.util.List;

public interface RecordRepositoryCustom {

    List<RankingQueryResult> findTop100RankingsByEventType(EventType eventType);
}
