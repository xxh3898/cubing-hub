package com.cubinghub.domain.adminmemo.entity;

import com.cubinghub.common.BaseTimeEntity;
import com.cubinghub.common.validation.InputConstraints;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "admin_memos")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminMemo extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = InputConstraints.ADMIN_MEMO_QUESTION_MAX_LENGTH)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Size(max = InputConstraints.ADMIN_MEMO_ANSWER_MAX_LENGTH)
    @Column(columnDefinition = "TEXT")
    private String answer;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "answer_status", nullable = false, length = 20)
    private AdminMemoAnswerStatus answerStatus;

    @Column(name = "answered_at")
    private Instant answeredAt;

    @Builder
    public AdminMemo(String question, String answer, Instant answeredAt) {
        this.question = question;
        applyAnswer(answer, answeredAt);
    }

    public void update(String question, String answer, Instant answeredAt) {
        this.question = question;
        applyAnswer(answer, answeredAt);
    }

    private void applyAnswer(String answer, Instant answeredAt) {
        if (answer == null || answer.isBlank()) {
            this.answer = null;
            this.answerStatus = AdminMemoAnswerStatus.UNANSWERED;
            this.answeredAt = null;
            return;
        }

        this.answer = answer;
        this.answerStatus = AdminMemoAnswerStatus.ANSWERED;
        this.answeredAt = answeredAt;
    }
}
