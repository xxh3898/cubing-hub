package com.cubinghub.domain.record.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.InputMethod;
import com.cubinghub.domain.record.entity.Penalty;
import java.util.HexFormat;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("RecordSubmissionFingerprint 단위 테스트")
class RecordSubmissionFingerprintTest {

    private final RecordSubmissionFingerprint fingerprint = new RecordSubmissionFingerprint();

    @Test
    @DisplayName("같은 logical payload는 같은 v1 SHA-256 fingerprint를 만든다")
    void should_create_same_hash_when_logical_payload_is_same() {
        RecordSaveRequest first = request(12345, "R U R' U'", InputMethod.KEYBOARD);
        RecordSaveRequest second = request(12345, "R U R' U'", InputMethod.KEYBOARD);

        assertThat(fingerprint.create(first)).isEqualTo(fingerprint.create(second));
    }

    @Test
    @DisplayName("InputMethod 누락과 UNKNOWN은 같은 logical payload로 정규화한다")
    void should_normalize_missing_input_method_to_unknown() {
        RecordSaveRequest missing = request(12345, "R U R' U'", null);
        RecordSaveRequest unknown = request(12345, "R U R' U'", InputMethod.UNKNOWN);

        assertThat(fingerprint.create(missing)).isEqualTo(fingerprint.create(unknown));
    }

    @Test
    @DisplayName("length prefix는 필드 경계가 다른 payload를 구분한다")
    void should_create_different_hash_when_field_boundaries_differ() {
        RecordSaveRequest first = request(1, "23", InputMethod.TOUCH);
        RecordSaveRequest second = request(12, "3", InputMethod.TOUCH);

        assertThat(fingerprint.create(first)).isNotEqualTo(fingerprint.create(second));
    }

    @Test
    @DisplayName("Unicode scramble을 포함한 v1 fingerprint는 고정된 golden value를 유지한다")
    void should_match_golden_hash_when_scramble_contains_unicode() {
        RecordSaveRequest request = request(9876, "R U 큐브 Ω", InputMethod.KEYBOARD);

        assertThat(HexFormat.of().formatHex(fingerprint.create(request)))
                .isEqualTo("1e08b62236cdaf076ff1b41598e2288ab4cb011730f9eddace19b0679d5cc636");
    }

    @Test
    @DisplayName("logical payload의 각 필드가 바뀌면 fingerprint가 바뀐다")
    void should_create_different_hash_when_each_logical_field_changes() {
        RecordSaveRequest baseline = request(12345, "R U R' U'", InputMethod.KEYBOARD);
        RecordSaveRequest changedEvent = request(
                EventType.WCA_222, 12345, Penalty.NONE, "R U R' U'", InputMethod.KEYBOARD
        );
        RecordSaveRequest changedPenalty = request(
                EventType.WCA_333, 12345, Penalty.PLUS_TWO, "R U R' U'", InputMethod.KEYBOARD
        );
        RecordSaveRequest changedTime = request(12346, "R U R' U'", InputMethod.KEYBOARD);
        RecordSaveRequest changedScramble = request(12345, "R U2 R' U'", InputMethod.KEYBOARD);
        RecordSaveRequest changedInput = request(12345, "R U R' U'", InputMethod.TOUCH);
        assertThat(fingerprint.create(changedEvent)).isNotEqualTo(fingerprint.create(baseline));
        assertThat(fingerprint.create(changedPenalty)).isNotEqualTo(fingerprint.create(baseline));
        assertThat(fingerprint.create(changedTime)).isNotEqualTo(fingerprint.create(baseline));
        assertThat(fingerprint.create(changedScramble)).isNotEqualTo(fingerprint.create(baseline));
        assertThat(fingerprint.create(changedInput)).isNotEqualTo(fingerprint.create(baseline));
    }

    private RecordSaveRequest request(int timeMs, String scramble, InputMethod inputMethod) {
        return request(EventType.WCA_333, timeMs, Penalty.NONE, scramble, inputMethod);
    }

    private RecordSaveRequest request(
            EventType eventType,
            int timeMs,
            Penalty penalty,
            String scramble,
            InputMethod inputMethod
    ) {
        return RecordSaveRequest.builder()
                .eventType(eventType)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble(scramble)
                .inputMethod(inputMethod)
                .build();
    }
}
