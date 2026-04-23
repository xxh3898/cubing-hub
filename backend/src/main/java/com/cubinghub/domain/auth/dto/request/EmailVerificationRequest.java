package com.cubinghub.domain.auth.dto.request;

import com.cubinghub.common.validation.InputConstraints;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class EmailVerificationRequest {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    @Size(max = InputConstraints.EMAIL_MAX_LENGTH, message = "이메일은 255자 이하이어야 합니다.")
    private String email;

    public EmailVerificationRequest(String email) {
        this.email = email;
    }
}
