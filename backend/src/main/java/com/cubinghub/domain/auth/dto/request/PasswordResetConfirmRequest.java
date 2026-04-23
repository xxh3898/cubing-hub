package com.cubinghub.domain.auth.dto.request;

import com.cubinghub.common.validation.InputConstraints;
import com.cubinghub.common.validation.Utf8ByteLength;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PasswordResetConfirmRequest {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    @Size(max = InputConstraints.EMAIL_MAX_LENGTH, message = "이메일은 255자 이하여야 합니다.")
    private String email;

    @NotBlank(message = "인증번호는 필수입니다.")
    @Size(min = 6, max = 6, message = "인증번호는 6자리여야 합니다.")
    private String code;

    @NotBlank(message = "새 비밀번호는 필수입니다.")
    @Size(min = 8, max = InputConstraints.PASSWORD_MAX_LENGTH, message = "새 비밀번호는 8자 이상 64자 이하여야 합니다.")
    @Utf8ByteLength(max = InputConstraints.PASSWORD_MAX_BYTES, message = "새 비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.")
    private String newPassword;

    public PasswordResetConfirmRequest(String email, String code, String newPassword) {
        this.email = email;
        this.code = code;
        this.newPassword = newPassword;
    }
}
