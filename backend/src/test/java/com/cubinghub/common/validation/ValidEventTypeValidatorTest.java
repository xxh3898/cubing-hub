package com.cubinghub.common.validation;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ValidEventTypeValidator 단위 테스트")
class ValidEventTypeValidatorTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    @DisplayName("유효한 WCA 코드면 검증을 통과한다")
    void should_accept_valid_event_type_when_value_matches_enum_name() {
        var violations = validator.validate(new RequiredEventTypeRequest("WCA_333"));

        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("유효하지 않은 문자열이면 검증에 실패한다")
    void should_reject_invalid_event_type_when_value_does_not_match_enum_name() {
        var violations = validator.validate(new RequiredEventTypeRequest("3x3x3"));

        assertThat(violations)
                .extracting(violation -> violation.getMessage())
                .containsExactly("유효한 WCA 종목 코드여야 합니다.");
    }

    @Test
    @DisplayName("필수 입력에서 null이면 검증에 실패한다")
    void should_reject_null_when_event_type_is_required() {
        var violations = validator.validate(new RequiredEventTypeRequest(null));

        assertThat(violations)
                .extracting(violation -> violation.getMessage())
                .containsExactly("유효한 WCA 종목 코드여야 합니다.");
    }

    @Test
    @DisplayName("선택 입력에서 null이면 검증을 통과한다")
    void should_allow_null_when_event_type_is_optional() {
        var violations = validator.validate(new OptionalEventTypeRequest(null));

        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("공백 문자열이면 검증에 실패한다")
    void should_reject_blank_when_event_type_is_blank() {
        var violations = validator.validate(new OptionalEventTypeRequest(" "));

        assertThat(violations)
                .extracting(violation -> violation.getMessage())
                .containsExactly("유효한 WCA 종목 코드여야 합니다.");
    }

    private record RequiredEventTypeRequest(
            @ValidEventType String mainEvent
    ) {
    }

    private record OptionalEventTypeRequest(
            @ValidEventType(allowNull = true) String mainEvent
    ) {
    }
}
