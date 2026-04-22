package com.cubinghub.common.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cubinghub.domain.record.entity.EventType;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

@DisplayName("ScrambleGenerator 단위 테스트")
class ScrambleGeneratorTest {

    private static final Set<String> THREE_BY_THREE_FACES = Set.of("U", "D", "L", "R", "F", "B");
    private static final Set<String> TWO_BY_TWO_FACES = Set.of("U", "R", "F");

    @ParameterizedTest
    @EnumSource(value = EventType.class, names = {"WCA_333", "WCA_333OH"})
    @DisplayName("3x3 규칙을 사용하는 종목은 20개 무브와 축 규칙을 만족한다")
    void should_generate_three_by_three_style_scramble_when_event_type_requires_three_by_three_rules(EventType eventType) {
        String scramble = ScrambleGenerator.generate(eventType);

        List<String> moves = splitMoves(scramble);

        assertThat(moves).hasSize(20);
        assertMovesUseAllowedFaces(moves, THREE_BY_THREE_FACES);
        assertMovesUseAllowedModifiers(moves);
        assertMovesDoNotRepeatSameFaceConsecutively(moves);
        assertMovesDoNotRepeatSameAxisThreeTimes(moves);
    }

    @Test
    @DisplayName("2x2 종목은 U R F 면만 사용한 10개 무브를 생성한다")
    void should_generate_two_by_two_scramble_using_allowed_faces_when_event_type_is_wca_222() {
        String scramble = ScrambleGenerator.generate(EventType.WCA_222);

        List<String> moves = splitMoves(scramble);

        assertThat(moves).hasSize(10);
        assertThat(moves).allSatisfy(move -> assertThat(extractFace(move)).isIn(TWO_BY_TWO_FACES));
        assertMovesUseAllowedModifiers(moves);
        assertMovesDoNotRepeatSameFaceConsecutively(moves);
    }

    @Test
    @DisplayName("종목이 null이면 예외를 던진다")
    void should_throw_illegal_argument_exception_when_event_type_is_null() {
        assertThatThrownBy(() -> ScrambleGenerator.generate(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("EventType cannot be null");
    }

    @Test
    @DisplayName("같은 날짜의 daily scramble은 같은 결과를 반환한다")
    void should_return_same_daily_scramble_when_same_event_type_and_date_are_provided() {
        LocalDate date = LocalDate.of(2026, 4, 22);

        String first = ScrambleGenerator.generateDaily(EventType.WCA_333, date);
        String second = ScrambleGenerator.generateDaily(EventType.WCA_333, date);

        assertThat(first).isEqualTo(second);
    }

    @Test
    @DisplayName("different 날짜의 daily scramble은 다른 결과를 반환한다")
    void should_return_different_daily_scramble_when_date_changes() {
        String first = ScrambleGenerator.generateDaily(EventType.WCA_333, LocalDate.of(2026, 4, 22));
        String second = ScrambleGenerator.generateDaily(EventType.WCA_333, LocalDate.of(2026, 4, 23));

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    @DisplayName("daily scramble 날짜가 null이면 예외를 던진다")
    void should_throw_illegal_argument_exception_when_daily_scramble_date_is_null() {
        assertThatThrownBy(() -> ScrambleGenerator.generateDaily(EventType.WCA_333, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Date cannot be null");
    }

    @Test
    @DisplayName("미지원 종목이면 fallback 메시지를 반환한다")
    void should_return_fallback_message_when_event_type_is_not_supported() {
        String scramble = ScrambleGenerator.generate(EventType.WCA_CLOCK);

        assertThat(scramble).isEqualTo("Scramble for clock is not yet implemented");
    }

    private List<String> splitMoves(String scramble) {
        return Arrays.asList(scramble.split(" "));
    }

    private void assertMovesUseAllowedFaces(List<String> moves, Set<String> allowedFaces) {
        assertThat(moves).allSatisfy(move -> assertThat(extractFace(move)).isIn(allowedFaces));
    }

    private void assertMovesUseAllowedModifiers(List<String> moves) {
        assertThat(moves).allSatisfy(move -> assertThat(move).matches("[UDLRFB](2|')?"));
    }

    private void assertMovesDoNotRepeatSameFaceConsecutively(List<String> moves) {
        for (int index = 1; index < moves.size(); index++) {
            assertThat(extractFace(moves.get(index))).isNotEqualTo(extractFace(moves.get(index - 1)));
        }
    }

    private void assertMovesDoNotRepeatSameAxisThreeTimes(List<String> moves) {
        for (int index = 2; index < moves.size(); index++) {
            String currentFace = extractFace(moves.get(index));
            String previousFace = extractFace(moves.get(index - 1));
            String secondPreviousFace = extractFace(moves.get(index - 2));

            assertThat(axisOf(currentFace) == axisOf(previousFace) && axisOf(previousFace) == axisOf(secondPreviousFace))
                    .isFalse();
        }
    }

    private String extractFace(String move) {
        return move.substring(0, 1);
    }

    private int axisOf(String face) {
        return switch (face) {
            case "U", "D" -> 0;
            case "L", "R" -> 1;
            case "F", "B" -> 2;
            default -> throw new IllegalArgumentException("Unknown face: " + face);
        };
    }
}
