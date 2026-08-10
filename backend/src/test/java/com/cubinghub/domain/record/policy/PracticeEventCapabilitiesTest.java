package com.cubinghub.domain.record.policy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.entity.EventType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

@DisplayName("PracticeEventCapabilities 단위 테스트")
class PracticeEventCapabilitiesTest {

    private final PracticeEventCapabilities capabilities = new PracticeEventCapabilities();

    @Test
    @DisplayName("WCA_333은 TIME Practice 기능 전체를 지원한다")
    void should_return_time_capability_when_event_type_is_wca_333() {
        PracticeEventCapability capability = capabilities.get(EventType.WCA_333).orElseThrow();

        assertThat(capability.eventType()).isEqualTo(EventType.WCA_333);
        assertThat(capability.resultKind()).isEqualTo(ResultKind.TIME);
        assertThat(capability.practiceTimerSupported()).isTrue();
        assertThat(capability.scrambleSupported()).isTrue();
        assertThat(capability.practiceRecordSupported()).isTrue();
        assertThat(capability.practiceRankingSupported()).isTrue();
    }

    @Test
    @DisplayName("등록되지 않은 EventType은 Practice Record에서 거절한다")
    void should_throw_bad_request_when_practice_record_event_is_not_supported() {
        assertThatThrownBy(() -> capabilities.requirePracticeRecordSupported(EventType.WCA_222))
                .isInstanceOfSatisfying(CustomApiException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(exception.getMessage()).isEqualTo("지원하지 않는 Practice 종목입니다.");
                });
    }

    @Test
    @DisplayName("등록되지 않은 EventType은 Scramble과 Practice Ranking에서도 같은 메시지로 거절한다")
    void should_use_same_error_contract_when_scramble_or_ranking_event_is_not_supported() {
        assertThatThrownBy(() -> capabilities.requireScrambleSupported(EventType.WCA_333FM))
                .isInstanceOf(CustomApiException.class)
                .hasMessage("지원하지 않는 Practice 종목입니다.");
        assertThatThrownBy(() -> capabilities.requirePracticeRankingSupported(EventType.WCA_333MBF))
                .isInstanceOf(CustomApiException.class)
                .hasMessage("지원하지 않는 Practice 종목입니다.");
    }
}
