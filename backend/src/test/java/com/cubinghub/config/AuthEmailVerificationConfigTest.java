package com.cubinghub.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.auth.service.SmtpVerificationEmailSender;
import com.cubinghub.domain.auth.service.UnavailableVerificationEmailSender;
import com.cubinghub.domain.auth.service.VerificationEmailSender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("AuthEmailVerificationConfig 단위 테스트")
class AuthEmailVerificationConfigTest {

    private final AuthEmailVerificationConfig config = new AuthEmailVerificationConfig();

    @Test
    @DisplayName("SMTP host가 비어 있으면 unavailable sender를 반환한다")
    void should_return_unavailable_sender_when_smtp_host_is_blank() {
        AuthEmailVerificationProperties authProperties = new AuthEmailVerificationProperties();
        SmtpProperties smtpProperties = new SmtpProperties();

        VerificationEmailSender sender = config.verificationEmailSender(authProperties, smtpProperties);

        assertThat(sender).isInstanceOf(UnavailableVerificationEmailSender.class);
    }

    @Test
    @DisplayName("SMTP host가 있으면 configured JavaMailSender를 가진 SMTP sender를 반환한다")
    void should_return_smtp_sender_with_configured_mail_sender_when_smtp_host_exists() {
        AuthEmailVerificationProperties authProperties = new AuthEmailVerificationProperties();
        SmtpProperties smtpProperties = new SmtpProperties();
        smtpProperties.setHost("smtp.cubinghub.com");
        smtpProperties.setPort(2525);
        smtpProperties.setUsername("mailer@cubinghub.com");
        smtpProperties.setPassword("secret");
        smtpProperties.setAuth(false);
        smtpProperties.setStarttlsEnable(false);
        smtpProperties.setConnectionTimeoutMs(1111L);
        smtpProperties.setTimeoutMs(2222L);
        smtpProperties.setWriteTimeoutMs(3333L);

        VerificationEmailSender sender = config.verificationEmailSender(authProperties, smtpProperties);

        assertThat(sender).isInstanceOf(SmtpVerificationEmailSender.class);

        JavaMailSenderImpl mailSender = (JavaMailSenderImpl) ReflectionTestUtils.getField(sender, "javaMailSender");
        assertThat(mailSender).isNotNull();
        assertThat(mailSender.getHost()).isEqualTo("smtp.cubinghub.com");
        assertThat(mailSender.getPort()).isEqualTo(2525);
        assertThat(mailSender.getUsername()).isEqualTo("mailer@cubinghub.com");
        assertThat(mailSender.getPassword()).isEqualTo("secret");
        assertThat(mailSender.getJavaMailProperties())
                .containsEntry("mail.smtp.auth", "false")
                .containsEntry("mail.smtp.starttls.enable", "false")
                .containsEntry("mail.smtp.connectiontimeout", 1111L)
                .containsEntry("mail.smtp.timeout", 2222L)
                .containsEntry("mail.smtp.writetimeout", 3333L);
    }
}
