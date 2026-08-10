package com.cubinghub.domain.record.dto.internal;

import com.cubinghub.domain.record.dto.response.RecordCreateResponse;
import com.cubinghub.domain.record.entity.Record;

public record RecordSubmissionLookup(RecordCreateResponse record, byte[] payloadHash) {

    public RecordSubmissionLookup {
        payloadHash = payloadHash == null ? null : payloadHash.clone();
    }

    @Override
    public byte[] payloadHash() {
        return payloadHash == null ? null : payloadHash.clone();
    }

    public static RecordSubmissionLookup from(Record record) {
        return new RecordSubmissionLookup(
                RecordCreateResponse.from(record),
                record.getClientSubmissionPayloadHash()
        );
    }
}
