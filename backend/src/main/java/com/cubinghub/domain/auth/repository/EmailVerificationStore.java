package com.cubinghub.domain.auth.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class EmailVerificationStore {

    private static final String CODE_KEY_PREFIX = "auth:email-verification:code:";
    private static final String COOLDOWN_KEY_PREFIX = "auth:email-verification:cooldown:";
    private static final String VERIFIED_KEY_PREFIX = "auth:email-verification:verified:";

    private final StringRedisTemplate redisTemplate;

    public void saveCode(String email, String code, long expirationMs) {
        redisTemplate.opsForValue().set(codeKey(email), code, expirationMs, TimeUnit.MILLISECONDS);
    }

    public String getCode(String email) {
        return redisTemplate.opsForValue().get(codeKey(email));
    }

    public void deleteCode(String email) {
        redisTemplate.delete(codeKey(email));
    }

    public void saveCooldown(String email, long expirationMs) {
        redisTemplate.opsForValue().set(cooldownKey(email), "true", expirationMs, TimeUnit.MILLISECONDS);
    }

    public boolean isOnCooldown(String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey(email)));
    }

    public void deleteCooldown(String email) {
        redisTemplate.delete(cooldownKey(email));
    }

    public void markVerified(String email, long expirationMs) {
        redisTemplate.opsForValue().set(verifiedKey(email), "true", expirationMs, TimeUnit.MILLISECONDS);
    }

    public boolean isVerified(String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(verifiedKey(email)));
    }

    public void clearVerified(String email) {
        redisTemplate.delete(verifiedKey(email));
    }

    private String codeKey(String email) {
        return CODE_KEY_PREFIX + email;
    }

    private String cooldownKey(String email) {
        return COOLDOWN_KEY_PREFIX + email;
    }

    private String verifiedKey(String email) {
        return VERIFIED_KEY_PREFIX + email;
    }
}
