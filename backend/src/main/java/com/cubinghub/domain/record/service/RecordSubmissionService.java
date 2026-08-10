package com.cubinghub.domain.record.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.dto.internal.RecordSubmissionLookup;
import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.dto.response.RecordCreateResponse;
import com.cubinghub.domain.record.policy.PracticeEventCapabilities;
import java.security.MessageDigest;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RecordSubmissionService {

    private static final String SUBMISSION_CONFLICT_MESSAGE =
            "clientSubmissionId가 다른 기록 요청에 이미 사용되었습니다.";

    private final PracticeEventCapabilities eventCapabilities;
    private final RecordSubmissionFingerprint fingerprint;
    private final RecordService recordService;

    public RecordCreateResponse submit(String email, RecordSaveRequest request) {
        eventCapabilities.requirePracticeRecordSupported(request.getEventType());

        UUID submissionId = request.getClientSubmissionId();
        if (submissionId == null) {
            return recordService.createRecord(email, request, null, null);
        }

        validateUuidV4(submissionId);
        String canonicalSubmissionId = submissionId.toString();
        byte[] payloadHash = fingerprint.create(request);
        Optional<RecordSubmissionLookup> existing = recordService.findSubmission(email, canonicalSubmissionId);

        if (existing.isPresent()) {
            return resolveExisting(existing.get(), payloadHash);
        }

        try {
            return recordService.createRecord(email, request, canonicalSubmissionId, payloadHash);
        } catch (DataIntegrityViolationException exception) {
            Optional<RecordSubmissionLookup> winner = recordService.findSubmission(email, canonicalSubmissionId);
            if (winner.isEmpty()) {
                throw exception;
            }
            return resolveExisting(winner.get(), payloadHash);
        }
    }

    private void validateUuidV4(UUID submissionId) {
        if (submissionId.version() != 4 || submissionId.variant() != 2) {
            throw new IllegalArgumentException("clientSubmissionId는 UUID v4 형식이어야 합니다.");
        }
    }

    private RecordCreateResponse resolveExisting(RecordSubmissionLookup existing, byte[] payloadHash) {
        byte[] existingHash = existing.payloadHash();
        if (existingHash == null || !MessageDigest.isEqual(existingHash, payloadHash)) {
            throw new CustomApiException(SUBMISSION_CONFLICT_MESSAGE, HttpStatus.CONFLICT);
        }
        return existing.record();
    }
}
