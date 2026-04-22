package com.cubinghub.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "auth.email-verification")
public class AuthEmailVerificationProperties {

    private long codeExpirationMs = 600000L;
    private long resendCooldownMs = 60000L;
    private long verifiedExpirationMs = 1800000L;
    private String subject = "Cubing Hub 이메일 인증";
}
