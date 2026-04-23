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

    @NotNull
    private FeedbackType type;

    @NotBlank
    @Size(max = InputConstraints.FEEDBACK_TITLE_MAX_LENGTH, message = "제목은 100자 이하이어야 합니다.")
    private String title;

    @Email
    @NotBlank
    @Size(max = InputConstraints.EMAIL_MAX_LENGTH, message = "회신 이메일은 255자 이하이어야 합니다.")
    private String replyEmail;

    @NotBlank
    @Size(max = InputConstraints.FEEDBACK_CONTENT_MAX_LENGTH, message = "내용은 2000자 이하이어야 합니다.")
    private String content;
}
