package com.cubinghub.domain.record.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.dto.internal.RecordSubmissionLookup;
import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.dto.response.RecordCreateResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.InputMethod;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.policy.PracticeEventCapabilities;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecordSubmissionService 단위 테스트")
class RecordSubmissionServiceTest {

    private static final String EMAIL = "tester@cubinghub.com";
    private static final UUID SUBMISSION_ID = UUID.fromString("d9428888-122b-4d3e-a58e-790c4e5f97ad");

    @Mock
    private RecordSubmissionFingerprint fingerprint;

    @Mock
    private RecordService recordService;

    private RecordSubmissionService submissionService;

    @BeforeEach
    void setUp() {
        submissionService = new RecordSubmissionService(
                new PracticeEventCapabilities(),
                fingerprint,
                recordService
        );
    }

    @Test
    @DisplayName("최초 submission은 transactional create 결과를 반환한다")
    void should_create_record_when_submission_id_is_new() {
        RecordSaveRequest request = request(SUBMISSION_ID, 12345);
        byte[] payloadHash = {1, 2, 3};
        RecordCreateResponse created = response(10L);
        when(fingerprint.create(request)).thenReturn(payloadHash);
        when(recordService.findSubmission(EMAIL, SUBMISSION_ID.toString())).thenReturn(Optional.empty());
        when(recordService.createRecord(EMAIL, request, SUBMISSION_ID.toString(), payloadHash)).thenReturn(created);

        RecordCreateResponse result = submissionService.submit(EMAIL, request);

        assertThat(result).isSameAs(created);
    }

    @Test
    @DisplayName("같은 submission ID와 payload replay는 기존 Record를 반환한다")
    void should_return_existing_record_when_submission_payload_matches() {
        RecordSaveRequest request = request(SUBMISSION_ID, 12345);
        byte[] payloadHash = {1, 2, 3};
        RecordCreateResponse existing = response(10L);
        when(fingerprint.create(request)).thenReturn(payloadHash);
        when(recordService.findSubmission(EMAIL, SUBMISSION_ID.toString()))
                .thenReturn(Optional.of(new RecordSubmissionLookup(existing, payloadHash)));

        RecordCreateResponse result = submissionService.submit(EMAIL, request);

        assertThat(result).isSameAs(existing);
        verify(recordService, never()).createRecord(any(), any(), any(), any());
    }

    @Test
    @DisplayName("같은 submission ID와 다른 payload는 409를 반환한다")
    void should_throw_conflict_when_submission_payload_differs() {
        RecordSaveRequest request = request(SUBMISSION_ID, 12345);
        when(fingerprint.create(request)).thenReturn(new byte[]{1, 2, 3});
        when(recordService.findSubmission(EMAIL, SUBMISSION_ID.toString()))
                .thenReturn(Optional.of(new RecordSubmissionLookup(response(10L), new byte[]{9, 9, 9})));

        assertThatThrownBy(() -> submissionService.submit(EMAIL, request))
                .isInstanceOfSatisfying(CustomApiException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getMessage())
                            .isEqualTo("clientSubmissionId가 다른 기록 요청에 이미 사용되었습니다.");
                });
        verify(recordService, never()).createRecord(any(), any(), any(), any());
    }

    @Test
    @DisplayName("concurrent unique loser는 실패 transaction 밖에서 winner를 읽어 replay한다")
    void should_return_winner_when_unique_constraint_loses_concurrent_race() {
        RecordSaveRequest request = request(SUBMISSION_ID, 12345);
        byte[] payloadHash = {1, 2, 3};
        RecordCreateResponse winner = response(10L);
        when(fingerprint.create(request)).thenReturn(payloadHash);
        when(recordService.findSubmission(EMAIL, SUBMISSION_ID.toString()))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(new RecordSubmissionLookup(winner, payloadHash)));
        when(recordService.createRecord(EMAIL, request, SUBMISSION_ID.toString(), payloadHash))
                .thenThrow(new DataIntegrityViolationException("duplicate"));

        RecordCreateResponse result = submissionService.submit(EMAIL, request);

        assertThat(result).isSameAs(winner);
        verify(recordService).createRecord(EMAIL, request, SUBMISSION_ID.toString(), payloadHash);
    }

    @Test
    @DisplayName("concurrent unique loser payload가 winner와 다르면 409를 반환한다")
    void should_throw_conflict_when_concurrent_winner_payload_differs() {
        RecordSaveRequest request = request(SUBMISSION_ID, 12345);
        byte[] payloadHash = {1, 2, 3};
        when(fingerprint.create(request)).thenReturn(payloadHash);
        when(recordService.findSubmission(EMAIL, SUBMISSION_ID.toString()))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(new RecordSubmissionLookup(response(10L), new byte[]{9, 9, 9})));
        when(recordService.createRecord(EMAIL, request, SUBMISSION_ID.toString(), payloadHash))
                .thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> submissionService.submit(EMAIL, request))
                .isInstanceOfSatisfying(CustomApiException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getMessage())
                            .isEqualTo("clientSubmissionId가 다른 기록 요청에 이미 사용되었습니다.");
                });
    }

    @Test
    @DisplayName("unique 위반 뒤 winner가 없으면 원래 persistence 예외를 다시 던진다")
    void should_rethrow_data_integrity_exception_when_unique_winner_does_not_exist() {
        RecordSaveRequest request = request(SUBMISSION_ID, 12345);
        byte[] payloadHash = {1, 2, 3};
        DataIntegrityViolationException failure = new DataIntegrityViolationException("not submission duplicate");
        when(fingerprint.create(request)).thenReturn(payloadHash);
        when(recordService.findSubmission(EMAIL, SUBMISSION_ID.toString())).thenReturn(Optional.empty());
        when(recordService.createRecord(EMAIL, request, SUBMISSION_ID.toString(), payloadHash)).thenThrow(failure);

        assertThatThrownBy(() -> submissionService.submit(EMAIL, request)).isSameAs(failure);
    }

    @Test
    @DisplayName("legacy request는 fingerprint 없이 기존 non-idempotent create를 유지한다")
    void should_create_without_idempotency_when_submission_id_is_missing() {
        RecordSaveRequest request = request(null, 12345);
        RecordCreateResponse created = response(10L);
        when(recordService.createRecord(EMAIL, request, null, null)).thenReturn(created);

        RecordCreateResponse result = submissionService.submit(EMAIL, request);

        assertThat(result).isSameAs(created);
        verify(fingerprint, never()).create(any());
        verify(recordService, never()).findSubmission(any(), any());
    }

    @Test
    @DisplayName("UUID v4가 아닌 submission ID는 400으로 거절한다")
    void should_throw_bad_request_when_submission_id_is_not_uuid_v4() {
        UUID versionOne = UUID.fromString("f47ac10b-58cc-11cf-a447-001122334455");
        RecordSaveRequest request = request(versionOne, 12345);

        assertThatThrownBy(() -> submissionService.submit(EMAIL, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("clientSubmissionId는 UUID v4 형식이어야 합니다.");
        verify(recordService, never()).createRecord(any(), any(), any(), any());
    }

    @Test
    @DisplayName("RFC 4122 variant가 아닌 UUID v4 모양의 submission ID는 400으로 거절한다")
    void should_throw_bad_request_when_submission_id_has_invalid_uuid_variant() {
        UUID invalidVariant = UUID.fromString("d9428888-122b-4d3e-258e-790c4e5f97ad");
        RecordSaveRequest request = request(invalidVariant, 12345);

        assertThatThrownBy(() -> submissionService.submit(EMAIL, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("clientSubmissionId는 UUID v4 형식이어야 합니다.");
        verify(recordService, never()).createRecord(any(), any(), any(), any());
    }

    @Test
    @DisplayName("미지원 Practice event는 persistence 전에 거절한다")
    void should_throw_bad_request_before_persistence_when_event_is_not_supported() {
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_222)
                .timeMs(12345)
                .penalty(Penalty.NONE)
                .scramble("R U")
                .inputMethod(InputMethod.KEYBOARD)
                .clientSubmissionId(SUBMISSION_ID)
                .build();

        assertThatThrownBy(() -> submissionService.submit(EMAIL, request))
                .isInstanceOf(CustomApiException.class)
                .hasMessage("지원하지 않는 Practice 종목입니다.");
        verify(recordService, never()).createRecord(any(), any(), any(), any());
    }

    private RecordSaveRequest request(UUID submissionId, int timeMs) {
        return RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(timeMs)
                .penalty(Penalty.NONE)
                .scramble("R U R' U'")
                .inputMethod(InputMethod.KEYBOARD)
                .clientSubmissionId(submissionId)
                .build();
    }

    private RecordCreateResponse response(Long id) {
        return new RecordCreateResponse(
                id,
                EventType.WCA_333,
                12345,
                Penalty.NONE,
                12345,
                "R U R' U'",
                InputMethod.KEYBOARD,
                Instant.parse("2026-08-10T11:15:30.123Z")
        );
    }
}
