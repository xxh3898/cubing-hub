package com.cubinghub.domain.user.dto.request;

import com.cubinghub.common.validation.InputConstraints;
import com.cubinghub.common.validation.Utf8ByteLength;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "현재 비밀번호는 필수입니다.")
    @Size(max = InputConstraints.PASSWORD_MAX_LENGTH, message = "현재 비밀번호는 64자 이하이어야 합니다.")
    @Utf8ByteLength(max = InputConstraints.PASSWORD_MAX_BYTES, message = "현재 비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.")
    private String currentPassword;

    @NotBlank(message = "새 비밀번호는 필수입니다.")
    @Size(min = 8, max = InputConstraints.PASSWORD_MAX_LENGTH, message = "새 비밀번호는 8자 이상 64자 이하여야 합니다.")
    @Utf8ByteLength(max = InputConstraints.PASSWORD_MAX_BYTES, message = "새 비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.")
    private String newPassword;

    public ChangePasswordRequest(String currentPassword, String newPassword) {
        this.currentPassword = currentPassword;
        this.newPassword = newPassword;
    }
}
