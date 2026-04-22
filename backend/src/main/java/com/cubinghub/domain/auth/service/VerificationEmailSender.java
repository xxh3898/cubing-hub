package com.cubinghub.domain.auth.service;

public interface VerificationEmailSender {

    void sendVerificationCode(String email, String code);
}
