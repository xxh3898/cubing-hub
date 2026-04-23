package com.cubinghub.domain.auth.service;

public class UnavailableVerificationEmailSender implements VerificationEmailSender {

    @Override
    public void sendVerificationCode(String email, String code) {
        throw new IllegalStateException("SMTP 설정이 필요합니다.");
    }

    @Override
    public void sendPasswordResetCode(String email, String code) {
        throw new IllegalStateException("SMTP 설정이 필요합니다.");
    }
}
