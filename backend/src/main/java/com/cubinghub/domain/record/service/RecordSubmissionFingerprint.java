package com.cubinghub.domain.record.service;

import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.stereotype.Component;

@Component
public class RecordSubmissionFingerprint {

    private static final String CONTRACT_VERSION = "v1";

    public byte[] create(RecordSaveRequest request) {
        return sha256(encodeV1(request));
    }

    byte[] encodeV1(RecordSaveRequest request) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            DataOutputStream fields = new DataOutputStream(output);
            writeLengthPrefixed(fields, CONTRACT_VERSION);
            writeLengthPrefixed(fields, request.getEventType().name());
            writeLengthPrefixed(fields, request.getTimeMs().toString());
            writeLengthPrefixed(fields, request.getPenalty().name());
            writeLengthPrefixed(fields, request.getScramble());
            writeLengthPrefixed(fields, request.normalizedInputMethod().name());
            fields.flush();
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Record fingerprint canonicalization failed", exception);
        }
    }

    private void writeLengthPrefixed(DataOutputStream output, String value) throws IOException {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        output.writeInt(bytes.length);
        output.write(bytes);
    }

    private byte[] sha256(byte[] payload) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(payload);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
