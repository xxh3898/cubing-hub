package com.cubinghub.domain.adminmemo.dto.request;

import com.cubinghub.common.validation.InputConstraints;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AdminMemoUpdateRequest {

    @NotBlank(message = "질문은 필수입니다.")
    @Size(max = InputConstraints.ADMIN_MEMO_QUESTION_MAX_LENGTH, message = "질문은 500자 이하이어야 합니다.")
    private String question;

    @Size(max = InputConstraints.ADMIN_MEMO_ANSWER_MAX_LENGTH, message = "답변은 2000자 이하이어야 합니다.")
    private String answer;
}
