package com.cubinghub.common.validation;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Utf8ByteLengthValidator 단위 테스트")
class Utf8ByteLengthValidatorTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    @DisplayName("null 값은 검증을 통과한다")
    void should_accept_null_when_value_is_null() {
        assertThat(validator.validate(new Utf8Request(null))).isEmpty();
    }

    @Test
    @DisplayName("공백 문자열은 검증을 통과한다")
    void should_accept_blank_when_value_is_blank() {
        assertThat(validator.validate(new Utf8Request(" "))).isEmpty();
    }

    @Test
    @DisplayName("UTF-8 바이트 길이가 제한 이하면 통과한다")
    void should_accept_value_when_utf8_byte_length_is_within_limit() {
        assertThat(validator.validate(new Utf8Request("가a"))).isEmpty();
    }

    @Test
    @DisplayName("UTF-8 바이트 길이가 제한을 넘으면 실패한다")
    void should_reject_value_when_utf8_byte_length_exceeds_limit() {
        assertThat(validator.validate(new Utf8Request("가나다")))
                .extracting(violation -> violation.getMessage())
                .containsExactly("UTF-8 바이트 길이가 너무 깁니다.");
    }

    private record Utf8Request(
            @Utf8ByteLength(max = 7) String value
    ) {
    }
}
