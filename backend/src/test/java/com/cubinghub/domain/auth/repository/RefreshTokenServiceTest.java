package com.cubinghub.domain.auth.repository;

import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService 단위 테스트")
class RefreshTokenServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenService = new RefreshTokenService(redisTemplate);
    }

    @Test
    @DisplayName("삭제할 키가 없으면 사용자별 전체 토큰 삭제는 조용히 종료된다")
    void should_do_nothing_when_delete_all_by_user_finds_empty_keys() {
        when(redisTemplate.keys("refresh:tester@cubinghub.com:*")).thenReturn(Collections.emptySet());

        refreshTokenService.deleteAllByUser("tester@cubinghub.com");

        verify(redisTemplate, never()).delete(anyCollection());
    }

    @Test
    @DisplayName("Redis keys 조회 결과가 null이어도 사용자별 전체 토큰 삭제는 조용히 종료된다")
    void should_do_nothing_when_delete_all_by_user_returns_null_keys() {
        when(redisTemplate.keys("refresh:tester@cubinghub.com:*")).thenReturn(null);

        refreshTokenService.deleteAllByUser("tester@cubinghub.com");

        verify(redisTemplate, never()).delete(anyCollection());
    }

    @Test
    @DisplayName("삭제할 키가 있으면 사용자별 전체 토큰을 삭제한다")
    void should_delete_keys_when_delete_all_by_user_finds_tokens() {
        var keys = java.util.Set.of("refresh:tester@cubinghub.com:jti-1");
        when(redisTemplate.keys("refresh:tester@cubinghub.com:*")).thenReturn(keys);

        refreshTokenService.deleteAllByUser("tester@cubinghub.com");

        verify(redisTemplate).delete(eq(keys));
    }
}
