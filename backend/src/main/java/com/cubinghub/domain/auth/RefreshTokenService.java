package com.cubinghub.domain.auth;

import java.util.Objects;
import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Redis 기반 Refresh Token 관리 서비스.
 *
 * Key 전략: "refresh:{email}" -> refreshToken 값
 * TTL은 JwtTokenProvider의 refreshTokenExpirationMs 값으로 설정
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String KEY_PREFIX = "refresh:";

    private final StringRedisTemplate redisTemplate;

    // Refresh Token 저장 (TTL: ms 단위)
    public void save(String email, @org.springframework.lang.NonNull String refreshToken, long expirationMs) {
        String key = KEY_PREFIX + email;
        redisTemplate.opsForValue().set(key, refreshToken, expirationMs, TimeUnit.MILLISECONDS);
        log.debug("Refresh Token 저장 완료 - 사용자: {}", email);
    }

    // 저장된 Refresh Token 조회
    public String get(String email) {
        return redisTemplate.opsForValue().get(KEY_PREFIX + email);
    }

    // Refresh Token 유효성 검증 (Redis에 저장된 값과 일치 여부 확인)
    public boolean isValid(String email, String refreshToken) {
        String storedToken = get(email);
        return Objects.equals(storedToken, refreshToken);
    }

    // 로그아웃 시 Refresh Token 삭제 (Blacklist 전략)
    public void delete(String email) {
        redisTemplate.delete(KEY_PREFIX + email);
        log.debug("Refresh Token 삭제(로그아웃) 완료 - 사용자: {}", email);
    }
}
