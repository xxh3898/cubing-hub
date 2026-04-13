package com.cubinghub.domain.auth.repository;

import com.cubinghub.integration.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RefreshTokenService 통합 테스트 (Redis)")
class RefreshTokenServiceIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private RefreshTokenService refreshTokenService;

    private static final String EMAIL = "test@test.com";
    private static final String JTI = "test-jti-uuid";
    private static final String TOKEN = "test.refresh.token";
    private static final long TTL_MS = 60000L; // 테스트용 1분

    @Test
    @DisplayName("Refresh Token을 Redis에 저장하고 조회할 수 있다")
    void should_return_stored_token_when_refresh_token_is_saved() {
        // when
        refreshTokenService.save(EMAIL, JTI, TOKEN, TTL_MS);

        // then
        assertThat(refreshTokenService.get(EMAIL, JTI)).isEqualTo(TOKEN);
    }

    @Test
    @DisplayName("저장된 토큰은 유효성 검증에 성공한다")
    void should_return_true_when_refresh_token_matches_stored_value() {
        // given
        refreshTokenService.save(EMAIL, JTI, TOKEN, TTL_MS);

        // then
        assertThat(refreshTokenService.isValid(EMAIL, JTI, TOKEN)).isTrue();
    }

    @Test
    @DisplayName("다른 토큰 값으로 유효성 검증을 하면 실패한다")
    void should_return_false_when_refresh_token_does_not_match_stored_value() {
        // given
        refreshTokenService.save(EMAIL, JTI, TOKEN, TTL_MS);

        // then
        assertThat(refreshTokenService.isValid(EMAIL, JTI, "wrong.token.value")).isFalse();
    }

    @Test
    @DisplayName("존재하지 않는 이메일로 조회하면 null을 반환한다")
    void should_return_null_when_refresh_token_is_requested_for_unknown_email() {
        // then
        assertThat(refreshTokenService.get("notexist@test.com", JTI)).isNull();
    }

    @Test
    @DisplayName("로그아웃 시 Refresh Token이 Redis에서 삭제된다")
    void should_delete_refresh_token_when_logout_is_processed() {
        // given
        refreshTokenService.save(EMAIL, JTI, TOKEN, TTL_MS);
        assertThat(refreshTokenService.get(EMAIL, JTI)).isNotNull();

        // when
        refreshTokenService.delete(EMAIL, JTI);

        // then
        assertThat(refreshTokenService.get(EMAIL, JTI)).isNull();
    }

    @Test
    @DisplayName("삭제된 토큰은 유효성 검증에 실패한다")
    void should_return_false_when_refresh_token_is_validated_after_deletion() {
        // given
        refreshTokenService.save(EMAIL, JTI, TOKEN, TTL_MS);
        refreshTokenService.delete(EMAIL, JTI);

        // then
        assertThat(refreshTokenService.isValid(EMAIL, JTI, TOKEN)).isFalse();
    }

    @Test
    @DisplayName("보안 위험 감지 시 해당 사용자의 모든 Refresh Token을 삭제한다")
    void should_delete_all_user_tokens_when_security_risk_is_detected() {
        // given
        refreshTokenService.save(EMAIL, "jti-1", "token-1", TTL_MS);
        refreshTokenService.save(EMAIL, "jti-2", "token-2", TTL_MS);
        refreshTokenService.save("other@test.com", "jti-3", "token-3", TTL_MS);

        // when
        refreshTokenService.deleteAllByUser(EMAIL);

        // then
        assertThat(refreshTokenService.get(EMAIL, "jti-1")).isNull();
        assertThat(refreshTokenService.get(EMAIL, "jti-2")).isNull();
        assertThat(refreshTokenService.get("other@test.com", "jti-3")).isEqualTo("token-3");
    }
}
