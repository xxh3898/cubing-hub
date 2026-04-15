package com.cubinghub.domain.auth.repository;

import static org.mockito.Mockito.anyLong;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
@DisplayName("RedisBlackListService 단위 테스트")
class RedisBlackListServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private RedisBlackListService redisBlackListService;

    @BeforeEach
    void setUp() {
        redisBlackListService = new RedisBlackListService(redisTemplate);
    }

    @Test
    @DisplayName("잔여 만료 시간이 양수면 access token을 blacklist에 저장한다")
    void should_store_blacklist_entry_when_expiration_is_positive() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        redisBlackListService.setBlackList("access-token", 1_000L);

        verify(valueOperations).set("blacklist:access-token", "logout", 1_000L, java.util.concurrent.TimeUnit.MILLISECONDS);
    }

    @Test
    @DisplayName("잔여 만료 시간이 0 이하이면 access token을 blacklist에 저장하지 않는다")
    void should_skip_blacklist_entry_when_expiration_is_not_positive() {
        redisBlackListService.setBlackList("access-token", 0L);

        verify(valueOperations, never()).set(anyString(), anyString(), anyLong(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("blacklist key가 존재하면 로그아웃된 토큰으로 판단한다")
    void should_return_true_when_blacklist_key_exists() {
        when(redisTemplate.hasKey("blacklist:access-token")).thenReturn(true);

        org.assertj.core.api.Assertions.assertThat(redisBlackListService.isBlackListed("access-token")).isTrue();
    }
}
