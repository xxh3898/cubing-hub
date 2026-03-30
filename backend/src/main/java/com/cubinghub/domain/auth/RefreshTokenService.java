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
 * Key 전략: "refresh:{email}:{jti}" -> refreshToken 값
 * TTL은 JwtTokenProvider의 refreshTokenExpirationMs 값으로 설정
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String KEY_PREFIX = "refresh:";

    private final StringRedisTemplate redisTemplate;

    private String generateKey(String email, String jti) {
        return KEY_PREFIX + email + ":" + jti;
    }

    // Refresh Token 저장 (TTL: ms 단위)
    public void save(String email, String jti, @org.springframework.lang.NonNull String refreshToken, long expirationMs) {
        String key = generateKey(email, jti);
        redisTemplate.opsForValue().set(key, refreshToken, expirationMs, TimeUnit.MILLISECONDS);
        log.debug("Refresh Token 저장 완료 - 사용자: {}, 기기(jti): {}", email, jti);
    }

    // 저장된 Refresh Token 조회
    public String get(String email, String jti) {
        return redisTemplate.opsForValue().get(generateKey(email, jti));
    }

    // Refresh Token 유효성 검증 (Redis에 저장된 값과 일치 여부 확인)
    public boolean isValid(String email, String jti, String refreshToken) {
        String storedToken = get(email, jti);
        return Objects.equals(storedToken, refreshToken);
    }

    // 로그아웃 시 특정 기기의 Refresh Token 삭제
    public void delete(String email, String jti) {
        redisTemplate.delete(generateKey(email, jti));
        log.debug("Refresh Token 삭제(로그아웃/갱신) 완료 - 사용자: {}, 기기(jti): {}", email, jti);
    }

    // 보안 위험 감지 시 해당 사용자의 모든 기기(Refresh Token 패밀리) 삭제
    public void deleteAllByUser(String email) {
        String pattern = KEY_PREFIX + email + ":*";
        var keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
            log.warn("Refresh Token 전체 기기 삭제 (보안 위협 방어) 완료 - 사용자: {}", email);
        }
    }
}
