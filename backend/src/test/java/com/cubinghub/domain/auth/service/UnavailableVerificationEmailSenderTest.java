package com.cubinghub.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("UnavailableVerificationEmailSender 단위 테스트")
class UnavailableVerificationEmailSenderTest {

    private final UnavailableVerificationEmailSender sender = new UnavailableVerificationEmailSender();

    @Test
    @DisplayName("이메일 인증 메일 발송 요청은 설정 예외를 반환한다")
    void should_throw_illegal_state_exception_when_verification_code_email_is_requested() {
        Throwable thrown = catchThrowable(() -> sender.sendVerificationCode("member@cubinghub.com", "123456"));

        assertThat(thrown)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("SMTP 설정이 필요합니다.");
    }

    @Test
    @DisplayName("비밀번호 재설정 메일 발송 요청은 설정 예외를 반환한다")
    void should_throw_illegal_state_exception_when_password_reset_email_is_requested() {
        Throwable thrown = catchThrowable(() -> sender.sendPasswordResetCode("member@cubinghub.com", "123456"));

        assertThat(thrown)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("SMTP 설정이 필요합니다.");
    }
}
