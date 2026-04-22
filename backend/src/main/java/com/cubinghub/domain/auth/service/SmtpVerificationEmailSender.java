package com.cubinghub.domain.auth.service;

import com.cubinghub.config.AuthEmailVerificationProperties;
import com.cubinghub.config.SmtpProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.util.StringUtils;

public class SmtpVerificationEmailSender implements VerificationEmailSender {

    private final JavaMailSender javaMailSender;
    private final SmtpProperties smtpProperties;
    private final AuthEmailVerificationProperties authEmailVerificationProperties;

    public SmtpVerificationEmailSender(
            JavaMailSender javaMailSender,
            SmtpProperties smtpProperties,
            AuthEmailVerificationProperties authEmailVerificationProperties
    ) {
        this.javaMailSender = javaMailSender;
        this.smtpProperties = smtpProperties;
        this.authEmailVerificationProperties = authEmailVerificationProperties;
    }

    @Override
    public void sendVerificationCode(String email, String code) {
        String fromAddress = resolveFromAddress();
        long expirationMinutes = authEmailVerificationProperties.getCodeExpirationMs() / 60000L;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setFrom(fromAddress);
        message.setSubject(authEmailVerificationProperties.getSubject());
        message.setText("""
                Cubing Hub 이메일 인증번호는 %s 입니다.

                %d분 안에 회원가입 화면에 입력해주세요.
                """
                .formatted(code, expirationMinutes));

        javaMailSender.send(message);
    }

    private String resolveFromAddress() {
        if (StringUtils.hasText(smtpProperties.getFromAddress())) {
            return smtpProperties.getFromAddress();
        }
        if (StringUtils.hasText(smtpProperties.getUsername())) {
            return smtpProperties.getUsername();
        }
        throw new IllegalStateException("SMTP 발신 주소 설정이 필요합니다.");
    }
}
