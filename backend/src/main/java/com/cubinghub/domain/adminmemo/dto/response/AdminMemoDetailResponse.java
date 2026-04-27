package com.cubinghub.domain.adminmemo.dto.response;

import com.cubinghub.domain.adminmemo.entity.AdminMemo;
import com.cubinghub.domain.adminmemo.entity.AdminMemoAnswerStatus;
import java.time.Instant;
import lombok.Getter;

@Getter
public class AdminMemoDetailResponse {

    private final Long id;
    private final String question;
    private final String answer;
    private final AdminMemoAnswerStatus answerStatus;
    private final Instant createdAt;
    private final Instant updatedAt;
    private final Instant answeredAt;

    public AdminMemoDetailResponse(
            Long id,
            String question,
            String answer,
            AdminMemoAnswerStatus answerStatus,
            Instant createdAt,
            Instant updatedAt,
            Instant answeredAt
    ) {
        this.id = id;
        this.question = question;
        this.answer = answer;
        this.answerStatus = answerStatus;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.answeredAt = answeredAt;
    }

    public static AdminMemoDetailResponse from(AdminMemo memo) {
        return new AdminMemoDetailResponse(
                memo.getId(),
                memo.getQuestion(),
                memo.getAnswer(),
                memo.getAnswerStatus(),
                memo.getCreatedAt(),
                memo.getUpdatedAt(),
                memo.getAnsweredAt()
        );
    }
}
