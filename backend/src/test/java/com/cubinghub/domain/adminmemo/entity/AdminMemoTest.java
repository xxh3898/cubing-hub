package com.cubinghub.domain.adminmemo.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("AdminMemo 엔티티 단위 테스트")
class AdminMemoTest {

    private static final Instant ANSWERED_AT = Instant.parse("2026-04-24T09:00:00Z");
    private static final Instant UPDATED_AT = Instant.parse("2026-04-24T10:00:00Z");

    @Test
    @DisplayName("답변이 비어 있으면 생성 시 미답변 상태로 저장한다")
    void should_mark_unanswered_when_answer_is_blank_on_create() {
        AdminMemo memo = AdminMemo.builder()
                .question("질문")
                .answer(" ")
                .build();

        assertThat(memo.getAnswer()).isNull();
        assertThat(memo.getAnswerStatus()).isEqualTo(AdminMemoAnswerStatus.UNANSWERED);
        assertThat(memo.getAnsweredAt()).isNull();
    }

    @Test
    @DisplayName("답변이 있으면 생성 시 답변 상태와 answeredAt을 저장한다")
    void should_mark_answered_when_answer_is_present_on_create() {
        AdminMemo memo = AdminMemo.builder()
                .question("질문")
                .answer("답변")
                .answeredAt(ANSWERED_AT)
                .build();

        assertThat(memo.getAnswer()).isEqualTo("답변");
        assertThat(memo.getAnswerStatus()).isEqualTo(AdminMemoAnswerStatus.ANSWERED);
        assertThat(memo.getAnsweredAt()).isEqualTo(ANSWERED_AT);
    }

    @Test
    @DisplayName("업데이트로 답변이 비면 미답변 상태로 되돌린다")
    void should_clear_answer_state_when_answer_becomes_blank_on_update() {
        AdminMemo memo = AdminMemo.builder()
                .question("질문")
                .answer("기존 답변")
                .answeredAt(ANSWERED_AT)
                .build();

        memo.update("수정 질문", "", UPDATED_AT);

        assertThat(memo.getQuestion()).isEqualTo("수정 질문");
        assertThat(memo.getAnswer()).isNull();
        assertThat(memo.getAnswerStatus()).isEqualTo(AdminMemoAnswerStatus.UNANSWERED);
        assertThat(memo.getAnsweredAt()).isNull();
    }
}
