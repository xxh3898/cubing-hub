package com.cubinghub.domain.feedback.dto.request;

import com.cubinghub.common.validation.InputConstraints;
import com.cubinghub.domain.feedback.entity.FeedbackType;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCreateRequest {

    @NotNull(message = "피드백 종류는 필수입니다.")
    private FeedbackType type;

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = InputConstraints.FEEDBACK_TITLE_MAX_LENGTH, message = "제목은 100자 이하여야 합니다.")
    private String title;

    @Email(message = "올바른 이메일 형식이 아닙니다.")
    @NotBlank(message = "회신 이메일은 필수입니다.")
    @Size(max = InputConstraints.EMAIL_MAX_LENGTH, message = "회신 이메일은 255자 이하여야 합니다.")
    private String replyEmail;

    @NotBlank(message = "내용은 필수입니다.")
    @Size(max = InputConstraints.FEEDBACK_CONTENT_MAX_LENGTH, message = "내용은 2000자 이하여야 합니다.")
    private String content;
}
