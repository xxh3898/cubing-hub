package com.cubinghub.domain.growth.metric;

import com.cubinghub.domain.record.entity.Penalty;
import java.time.Instant;
import java.util.Objects;

/**
 * Current retained Practice Record를 Growth metric 계산에 필요한 값만으로 표현한다.
 * event ownership과 capability 검증은 read service 경계에서 처리한다.
 */
public record GrowthRecord(
        long id,
        int timeMs,
        Penalty penalty,
        Instant createdAt
) {

    public GrowthRecord {
        if (id <= 0) {
            throw new IllegalArgumentException("Record id는 양수여야 합니다.");
        }
        if (timeMs <= 0) {
            throw new IllegalArgumentException("Record timeMs는 양수여야 합니다.");
        }
        Objects.requireNonNull(penalty, "penalty는 필수입니다.");
        Objects.requireNonNull(createdAt, "createdAt은 필수입니다.");
    }

    public Integer effectiveTimeMs() {
        return penalty.applyTo(timeMs);
    }

    public boolean isRankable() {
        return penalty.isRankable();
    }
}
