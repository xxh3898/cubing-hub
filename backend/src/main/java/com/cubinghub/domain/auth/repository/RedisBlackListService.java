package com.cubinghub.domain.auth.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisBlackListService {

    private static final String KEY_PREFIX = "blacklist:";
    private final StringRedisTemplate redisTemplate;

    /**
     * 로그아웃된 Access Token을 Blacklist에 등록합니다.
     * @param accessToken Blacklist에 추가할 토큰
     * @param expirationMs 남은 유효 시간(ms) - 토큰 만료 이후에는 자동으로 삭제하기 위함
     */
    public void setBlackList(String accessToken, long expirationMs) {
        String key = KEY_PREFIX + accessToken;
        if (expirationMs > 0) {
            redisTemplate.opsForValue().set(key, "logout", expirationMs, TimeUnit.MILLISECONDS);
            log.debug("Access Token Blacklist 등록 완료 - 잔여 시간: {}ms", expirationMs);
        }
    }

    /**
     * 전달받은 Access Token이 Blacklist에 존재하는지 확인합니다.
     * @param accessToken 검사할 토큰
     * @return Blacklist 존재 여부
     */
    public boolean isBlackListed(String accessToken) {
        String key = KEY_PREFIX + accessToken;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}
