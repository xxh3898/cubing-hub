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
public class SignUpRequest {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    @Size(max = InputConstraints.EMAIL_MAX_LENGTH, message = "이메일은 255자 이하이어야 합니다.")
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(min = 8, max = InputConstraints.PASSWORD_MAX_LENGTH, message = "비밀번호는 8자 이상 64자 이하여야 합니다.")
    @Utf8ByteLength(max = InputConstraints.PASSWORD_MAX_BYTES, message = "비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.")
    private String password;

    @NotBlank(message = "닉네임은 필수입니다.")
    @Size(min = 2, max = InputConstraints.NICKNAME_MAX_LENGTH, message = "닉네임은 2자 이상 50자 이하이어야 합니다.")
    private String nickname;

    private String mainEvent;

    public SignUpRequest(String email, String password, String nickname, String mainEvent) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.mainEvent = mainEvent;
    }
}
