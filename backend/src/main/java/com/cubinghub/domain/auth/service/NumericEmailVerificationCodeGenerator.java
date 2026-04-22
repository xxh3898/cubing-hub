package com.cubinghub.domain.auth.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class NumericEmailVerificationCodeGenerator implements EmailVerificationCodeGenerator {

    private static final int CODE_BOUND = 1_000_000;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    public String generate() {
        return String.format("%06d", SECURE_RANDOM.nextInt(CODE_BOUND));
    }
}
