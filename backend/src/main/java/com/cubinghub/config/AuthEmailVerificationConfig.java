package com.cubinghub.config;

import com.cubinghub.domain.auth.service.SmtpVerificationEmailSender;
import com.cubinghub.domain.auth.service.UnavailableVerificationEmailSender;
import com.cubinghub.domain.auth.service.VerificationEmailSender;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.util.StringUtils;

import java.util.Properties;

@Configuration
@EnableConfigurationProperties({
        AuthEmailVerificationProperties.class,
        SmtpProperties.class
})
public class AuthEmailVerificationConfig {

    @Bean
    public VerificationEmailSender verificationEmailSender(
            AuthEmailVerificationProperties authEmailVerificationProperties,
            SmtpProperties smtpProperties
    ) {
        if (!StringUtils.hasText(smtpProperties.getHost())) {
            return new UnavailableVerificationEmailSender();
        }

        return new SmtpVerificationEmailSender(
                createJavaMailSender(smtpProperties),
                smtpProperties,
                authEmailVerificationProperties
        );
    }

    private JavaMailSender createJavaMailSender(SmtpProperties smtpProperties) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(smtpProperties.getHost());
        mailSender.setPort(smtpProperties.getPort());
        mailSender.setUsername(smtpProperties.getUsername());
        mailSender.setPassword(smtpProperties.getPassword());

        Properties properties = mailSender.getJavaMailProperties();
        properties.put("mail.smtp.auth", String.valueOf(smtpProperties.isAuth()));
        properties.put("mail.smtp.starttls.enable", String.valueOf(smtpProperties.isStarttlsEnable()));
        properties.put("mail.smtp.connectiontimeout", smtpProperties.getConnectionTimeoutMs());
        properties.put("mail.smtp.timeout", smtpProperties.getTimeoutMs());
        properties.put("mail.smtp.writetimeout", smtpProperties.getWriteTimeoutMs());

        return mailSender;
    }
}
