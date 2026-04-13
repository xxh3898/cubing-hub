package com.cubinghub.domain.auth.repository;

import com.cubinghub.integration.RedisIntegrationTest;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RefreshTokenService 통합 테스트 (Redis)")
class RefreshTokenServiceIntegrationTest extends RedisIntegrationTest {

    @Autowired
    private RefreshTokenService refreshTokenService;

    private static final String TOKEN = "test.refresh.token";
    private static final long TTL_MS = 60000L; // 테스트용 1분
    private final List<String> cleanupEmails = new ArrayList<>();

    @AfterEach
    void tearDown() {
        cleanupEmails.forEach(email -> deleteKeysByPattern("refresh:" + email + ":*"));
    }

    @Test
    @DisplayName("Refresh Token을 Redis에 저장하고 조회할 수 있다")
    void should_return_stored_token_when_refresh_token_is_saved() {
        String email = newEmail();
        String jti = newJti();

        // when
        refreshTokenService.save(email, jti, TOKEN, TTL_MS);

        // then
        assertThat(refreshTokenService.get(email, jti)).isEqualTo(TOKEN);
    }

    @Test
    @DisplayName("저장된 토큰은 유효성 검증에 성공한다")
    void should_return_true_when_refresh_token_matches_stored_value() {
        String email = newEmail();
        String jti = newJti();

        // given
        refreshTokenService.save(email, jti, TOKEN, TTL_MS);

        // then
        assertThat(refreshTokenService.isValid(email, jti, TOKEN)).isTrue();
    }

    @Test
    @DisplayName("다른 토큰 값으로 유효성 검증을 하면 실패한다")
    void should_return_false_when_refresh_token_does_not_match_stored_value() {
        String email = newEmail();
        String jti = newJti();

        // given
        refreshTokenService.save(email, jti, TOKEN, TTL_MS);

        // then
        assertThat(refreshTokenService.isValid(email, jti, "wrong.token.value")).isFalse();
    }

    @Test
    @DisplayName("존재하지 않는 이메일로 조회하면 null을 반환한다")
    void should_return_null_when_refresh_token_is_requested_for_unknown_email() {
        String email = newEmail();

        // then
        assertThat(refreshTokenService.get("missing-" + email, newJti())).isNull();
    }

    @Test
    @DisplayName("로그아웃 시 Refresh Token이 Redis에서 삭제된다")
    void should_delete_refresh_token_when_logout_is_processed() {
        String email = newEmail();
        String jti = newJti();

        // given
        refreshTokenService.save(email, jti, TOKEN, TTL_MS);
        assertThat(refreshTokenService.get(email, jti)).isNotNull();

        // when
        refreshTokenService.delete(email, jti);

        // then
        assertThat(refreshTokenService.get(email, jti)).isNull();
    }

    @Test
    @DisplayName("삭제된 토큰은 유효성 검증에 실패한다")
    void should_return_false_when_refresh_token_is_validated_after_deletion() {
        String email = newEmail();
        String jti = newJti();

        // given
        refreshTokenService.save(email, jti, TOKEN, TTL_MS);
        refreshTokenService.delete(email, jti);

        // then
        assertThat(refreshTokenService.isValid(email, jti, TOKEN)).isFalse();
    }

    @Test
    @DisplayName("보안 위험 감지 시 해당 사용자의 모든 Refresh Token을 삭제한다")
    void should_delete_all_user_tokens_when_security_risk_is_detected() {
        String email = newEmail();
        String otherEmail = newEmail();

        // given
        refreshTokenService.save(email, "jti-1", "token-1", TTL_MS);
        refreshTokenService.save(email, "jti-2", "token-2", TTL_MS);
        refreshTokenService.save(otherEmail, "jti-3", "token-3", TTL_MS);

        // when
        refreshTokenService.deleteAllByUser(email);

        // then
        assertThat(refreshTokenService.get(email, "jti-1")).isNull();
        assertThat(refreshTokenService.get(email, "jti-2")).isNull();
        assertThat(refreshTokenService.get(otherEmail, "jti-3")).isEqualTo("token-3");
    }

    @Test
    @DisplayName("Refresh Token 저장 시 Redis TTL이 함께 설정된다")
    void should_set_ttl_when_refresh_token_is_saved() {
        String email = newEmail();
        String jti = newJti();
        long ttlMs = 60_000L;

        refreshTokenService.save(email, jti, TOKEN, ttlMs);

        String key = buildKey(email, jti);
        Long ttl = redisTemplate.getExpire(key, TimeUnit.MILLISECONDS);

        assertThat(redisTemplate.hasKey(key)).isTrue();
        assertThat(ttl).isNotNull();
        assertThat(ttl).isPositive().isLessThanOrEqualTo(ttlMs);
    }

    private String newEmail() {
        String email = "refresh-token-test-" + uniqueSuffix() + "@test.com";
        cleanupEmails.add(email);
        return email;
    }

    private String newJti() {
        return "jti-" + uniqueSuffix();
    }

    private String buildKey(String email, String jti) {
        return "refresh:" + email + ":" + jti;
    }
}
