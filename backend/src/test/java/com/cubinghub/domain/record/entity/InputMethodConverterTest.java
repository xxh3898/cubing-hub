package com.cubinghub.domain.record.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("InputMethodConverter 단위 테스트")
class InputMethodConverterTest {

    private final InputMethodConverter converter = new InputMethodConverter();

    @Test
    @DisplayName("알려진 InputMethod는 VARCHAR 이름으로 왕복한다")
    void should_round_trip_known_input_method() {
        assertThat(converter.convertToDatabaseColumn(InputMethod.KEYBOARD)).isEqualTo("KEYBOARD");
        assertThat(converter.convertToEntityAttribute("TOUCH")).isEqualTo(InputMethod.TOUCH);
    }

    @Test
    @DisplayName("legacy DB NULL은 entity field NULL로 보존해 aggregate getter가 UNKNOWN으로 정규화하게 한다")
    void should_preserve_database_null_for_legacy_normalization() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    @DisplayName("알 수 없는 DB InputMethod를 UNKNOWN으로 조용히 바꾸지 않는다")
    void should_reject_unknown_database_input_method() {
        assertThatThrownBy(() -> converter.convertToEntityAttribute("STACKMAT"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
