package com.cubinghub.domain.record.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.dto.response.ScrambleResponse;
import com.cubinghub.domain.record.entity.EventType;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

@DisplayName("ScrambleService 단위 테스트")
class ScrambleServiceTest {

    private final ScrambleService scrambleService = new ScrambleService();

    @Test
    @DisplayName("지원 종목이면 scramble을 생성한다")
    void should_return_scramble_when_event_type_is_supported() {
        ScrambleResponse response = scrambleService.generate(EventType.WCA_333);

        assertThat(response.eventType()).isEqualTo(EventType.WCA_333.name());
        assertThat(response.scramble()).isNotBlank();
    }

    @Test
    @DisplayName("지원 종목이면 daily scramble을 생성한다")
    void should_return_daily_scramble_when_event_type_is_supported() {
        ScrambleResponse response = scrambleService.generateDaily(EventType.WCA_333, LocalDate.of(2026, 4, 24));

        assertThat(response.eventType()).isEqualTo(EventType.WCA_333.name());
        assertThat(response.scramble()).isNotBlank();
    }

    @Test
    @DisplayName("미지원 종목이면 daily scramble 생성은 400 예외를 던진다")
    void should_throw_bad_request_when_daily_scramble_event_type_is_not_supported() {
        Throwable thrown = catchThrowable(() ->
                scrambleService.generateDaily(EventType.WCA_444, LocalDate.of(2026, 4, 24))
        );

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.getMessage()).isEqualTo("아직 구현되지 않은 종목입니다.");
    }
}
