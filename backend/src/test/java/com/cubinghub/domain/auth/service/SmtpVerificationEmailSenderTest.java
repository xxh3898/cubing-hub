package com.cubinghub.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

import com.cubinghub.config.AuthEmailVerificationProperties;
import com.cubinghub.config.SmtpProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
@DisplayName("SmtpVerificationEmailSender 단위 테스트")
class SmtpVerificationEmailSenderTest {

    @Mock
    private JavaMailSender javaMailSender;

    private SmtpProperties smtpProperties;
    private AuthEmailVerificationProperties authProperties;
    private SmtpVerificationEmailSender sender;

    @BeforeEach
    void setUp() {
        smtpProperties = new SmtpProperties();
        authProperties = new AuthEmailVerificationProperties();
        authProperties.setSubject("Cubing Hub 인증 메일");
        authProperties.setCodeExpirationMs(180000L);
        sender = new SmtpVerificationEmailSender(javaMailSender, smtpProperties, authProperties);
    }

    @Test
    @DisplayName("fromAddress가 있으면 회원가입 인증 메일의 발신 주소로 사용한다")
    void should_use_from_address_when_it_is_configured_for_verification_email() {
        smtpProperties.setFromAddress("noreply@cubinghub.com");
        smtpProperties.setUsername("fallback@cubinghub.com");

        sender.sendVerificationCode("user@cubinghub.com", "123456");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(javaMailSender).send(captor.capture());

        SimpleMailMessage message = captor.getValue();
        assertThat(message.getTo()).containsExactly("user@cubinghub.com");
        assertThat(message.getFrom()).isEqualTo("noreply@cubinghub.com");
        assertThat(message.getSubject()).isEqualTo("Cubing Hub 인증 메일");
        assertThat(message.getText()).contains("123456");
        assertThat(message.getText()).contains("3분 안에 회원가입 화면에 입력해주세요.");
    }

    @Test
    @DisplayName("fromAddress가 없으면 username을 비밀번호 재설정 메일 발신 주소로 사용한다")
    void should_fallback_to_username_when_from_address_is_blank_for_password_reset_email() {
        smtpProperties.setUsername("mailer@cubinghub.com");

        sender.sendPasswordResetCode("user@cubinghub.com", "654321");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(javaMailSender).send(captor.capture());

        SimpleMailMessage message = captor.getValue();
        assertThat(message.getFrom()).isEqualTo("mailer@cubinghub.com");
        assertThat(message.getSubject()).isEqualTo("Cubing Hub 비밀번호 재설정 인증번호");
        assertThat(message.getText()).contains("654321");
        assertThat(message.getText()).contains("3분 안에 비밀번호 재설정 화면에 입력해주세요.");
    }

    @Test
    @DisplayName("fromAddress와 username이 모두 비어 있으면 예외를 던진다")
    void should_throw_exception_when_from_address_and_username_are_blank() {
        assertThatThrownBy(() -> sender.sendVerificationCode("user@cubinghub.com", "123456"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("SMTP 발신 주소 설정이 필요합니다.");
    }
}
