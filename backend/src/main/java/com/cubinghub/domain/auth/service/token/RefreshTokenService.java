package com.cubinghub.domain.auth.service.token;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String KEY_PREFIX = "refresh:";
    private final StringRedisTemplate redisTemplate;

    private String generateKey(String email, String jti) {
        return KEY_PREFIX + email + ":" + jti;
    }

    public void save(String email, String jti, String refreshToken, long expirationMs) {
        redisTemplate.opsForValue().set(generateKey(email, jti), refreshToken, expirationMs, TimeUnit.MILLISECONDS);
    }

    public String get(String email, String jti) {
        return redisTemplate.opsForValue().get(generateKey(email, jti));
    }

    public boolean isValid(String email, String jti, String refreshToken) {
        return Objects.equals(get(email, jti), refreshToken);
    }

    public void delete(String email, String jti) {
        redisTemplate.delete(generateKey(email, jti));
    }

    public void deleteAllByUser(String email) {
        String pattern = KEY_PREFIX + email + ":*";
        var keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
            log.warn("Refresh Token 전체 기기 삭제 완료 - 사용자: {}", email);
        }
    }
}
