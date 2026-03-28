package com.cubinghub.domain.auth;

import com.cubinghub.integration.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RefreshTokenService 통합 테스트 (Redis)")
class RefreshTokenServiceTest extends BaseIntegrationTest {

    @Autowired
    private RefreshTokenService refreshTokenService;

    private static final String EMAIL = "test@test.com";
    private static final String TOKEN = "test.refresh.token";
    private static final long TTL_MS = 60000L; // 테스트용 1분

    @Test
    @Transactional(readOnly = true)
    @DisplayName("Refresh Token을 Redis에 저장하고 조회할 수 있다")
    void refreshToken_저장_조회() {
        // when
        refreshTokenService.save(EMAIL, TOKEN, TTL_MS);

        // then
        assertThat(refreshTokenService.get(EMAIL)).isEqualTo(TOKEN);
    }

    @Test
    @DisplayName("저장된 토큰은 유효성 검증에 성공한다")
    void 저장된_토큰_유효성_검증_성공() {
        // given
        refreshTokenService.save(EMAIL, TOKEN, TTL_MS);

        // then
        assertThat(refreshTokenService.isValid(EMAIL, TOKEN)).isTrue();
    }

    @Test
    @DisplayName("다른 토큰 값으로 유효성 검증을 하면 실패한다")
    void 다른_토큰_유효성_검증_실패() {
        // given
        refreshTokenService.save(EMAIL, TOKEN, TTL_MS);

        // then
        assertThat(refreshTokenService.isValid(EMAIL, "wrong.token.value")).isFalse();
    }

    @Test
    @DisplayName("존재하지 않는 이메일로 조회하면 null을 반환한다")
    void 존재하지_않는_이메일_조회_null반환() {
        // then
        assertThat(refreshTokenService.get("notexist@test.com")).isNull();
    }

    @Test
    @DisplayName("로그아웃 시 Refresh Token이 Redis에서 삭제된다")
    void 로그아웃_시_토큰_삭제() {
        // given
        refreshTokenService.save(EMAIL, TOKEN, TTL_MS);
        assertThat(refreshTokenService.get(EMAIL)).isNotNull();

        // when
        refreshTokenService.delete(EMAIL);

        // then
        assertThat(refreshTokenService.get(EMAIL)).isNull();
    }

    @Test
    @DisplayName("삭제된 토큰은 유효성 검증에 실패한다")
    void 삭제된_토큰_유효성_검증_실패() {
        // given
        refreshTokenService.save(EMAIL, TOKEN, TTL_MS);
        refreshTokenService.delete(EMAIL);

        // then
        assertThat(refreshTokenService.isValid(EMAIL, TOKEN)).isFalse();
    }
}
