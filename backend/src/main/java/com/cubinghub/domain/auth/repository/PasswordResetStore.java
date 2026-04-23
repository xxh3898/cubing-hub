package com.cubinghub.domain.auth.repository;

import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PasswordResetStore {

    private static final String CODE_KEY_PREFIX = "auth:password-reset:code:";
    private static final String COOLDOWN_KEY_PREFIX = "auth:password-reset:cooldown:";

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

    private String codeKey(String email) {
        return CODE_KEY_PREFIX + email;
    }

    private String cooldownKey(String email) {
        return COOLDOWN_KEY_PREFIX + email;
    }
}
