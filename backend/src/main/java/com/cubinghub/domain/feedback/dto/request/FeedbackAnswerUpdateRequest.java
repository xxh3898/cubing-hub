package com.cubinghub.domain.feedback.dto.request;

import com.cubinghub.common.validation.InputConstraints;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackAnswerUpdateRequest {

    @NotBlank(message = "답변은 필수입니다.")
    @Size(max = InputConstraints.FEEDBACK_ANSWER_MAX_LENGTH, message = "답변은 2000자 이하여야 합니다.")
    private String answer;
}
