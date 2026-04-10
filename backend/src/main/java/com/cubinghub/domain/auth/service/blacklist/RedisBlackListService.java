package com.cubinghub.domain.auth.service.blacklist;

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

    public void setBlackList(String accessToken, long expirationMs) {
        if (expirationMs > 0) {
            redisTemplate.opsForValue().set(KEY_PREFIX + accessToken, "logout", expirationMs, TimeUnit.MILLISECONDS);
        }
    }

    public boolean isBlackListed(String accessToken) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + accessToken));
    }
}
