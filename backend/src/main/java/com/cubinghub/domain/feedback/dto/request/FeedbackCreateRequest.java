package com.cubinghub.domain.feedback.dto.request;

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
    @Size(max = 100)
    private String title;

    @Email
    @NotBlank
    @Size(max = 255)
    private String replyEmail;

    @NotBlank
    private String content;
}
