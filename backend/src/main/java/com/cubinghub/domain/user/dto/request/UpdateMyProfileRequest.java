package com.cubinghub.domain.user.dto.request;

import com.cubinghub.common.validation.InputConstraints;
import com.cubinghub.common.validation.ValidEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateMyProfileRequest {

    @NotBlank(message = "닉네임은 필수입니다.")
    @Size(min = 2, max = InputConstraints.NICKNAME_MAX_LENGTH, message = "닉네임은 2자 이상 50자 이하이어야 합니다.")
    private String nickname;

    @NotBlank(message = "주 종목은 필수입니다.")
    @Size(max = 50, message = "주 종목은 50자 이하이어야 합니다.")
    @ValidEventType(message = "주 종목은 유효한 WCA 종목 코드여야 합니다.")
    private String mainEvent;

    public UpdateMyProfileRequest(String nickname, String mainEvent) {
        this.nickname = nickname;
        this.mainEvent = mainEvent;
    }
}
