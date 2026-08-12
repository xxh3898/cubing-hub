package com.cubinghub.domain.growth.metric;

import com.cubinghub.domain.record.entity.Penalty;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

final class GrowthMetricFixtures {

    private GrowthMetricFixtures() {
    }

    static GrowthRecord record(long id, int timeMs, Penalty penalty, String createdAt) {
        return new GrowthRecord(id, timeMs, penalty, OffsetDateTime.parse(createdAt).toInstant());
    }

    static List<GrowthRecord> recordsForConsistency(int[] currentValues, int[] previousValues) {
        Instant newest = Instant.parse("2026-08-12T00:00:00Z");
        List<GrowthRecord> records = new ArrayList<>(currentValues.length + previousValues.length);
        long id = 100L;

        for (int index = 0; index < currentValues.length; index++) {
            records.add(new GrowthRecord(id--, currentValues[index], Penalty.NONE, newest.minusSeconds(index * 60L)));
        }
        for (int index = 0; index < previousValues.length; index++) {
            records.add(new GrowthRecord(
                    id--,
                    previousValues[index],
                    Penalty.NONE,
                    newest.minusSeconds((currentValues.length + index) * 60L)
            ));
        }

        return records;
    }

    static int[] values(int base, int step, int count) {
        int[] values = new int[count];
        for (int index = 0; index < count; index++) {
            values[index] = base + step * index;
        }
        return values;
    }
}
