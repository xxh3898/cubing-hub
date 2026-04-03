package com.cubinghub.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

@DisplayName("JwtTokenProvider 단위 테스트")
class JwtTokenProviderTest {

    // 테스트용 시크릿 키 (최소 256bit = 32자 이상)
    private static final String SECRET = "testSecretKeyForTestingPurposes12345678901234";
    private static final long ACCESS_EXPIRATION = 3600000L;   // 1시간
    private static final long REFRESH_EXPIRATION = 604800000L; // 7일
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-04-03T00:00:00Z"),
            ZoneOffset.UTC
    );

    private JwtTokenProvider jwtTokenProvider;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(SECRET, ACCESS_EXPIRATION, REFRESH_EXPIRATION, FIXED_CLOCK);

        userDetails = User.builder()
                .username("test@test.com")
                .password("encodedPassword")
                .authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")))
                .build();
    }

    @Test
    @DisplayName("Access Token 생성 후 이메일을 정상적으로 추출할 수 있다")
    void accessToken_생성_이메일_추출() {
        // when
        String token = jwtTokenProvider.generateAccessToken(userDetails);

        // then
        assertThat(token).isNotNull();
        assertThat(jwtTokenProvider.getEmail(token)).isEqualTo("test@test.com");
    }

    @Test
    @DisplayName("Access Token에서 권한(Role)을 정상적으로 추출할 수 있다")
    void accessToken_권한_추출() {
        // when
        String token = jwtTokenProvider.generateAccessToken(userDetails);
        List<GrantedAuthority> authorities = jwtTokenProvider.getAuthorities(token);

        // then
        assertThat(authorities).hasSize(1);
        assertThat(authorities.get(0).toString()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("유효한 Access Token은 검증에 성공한다")
    void 유효한_accessToken_검증_성공() {
        // when
        String token = jwtTokenProvider.generateAccessToken(userDetails);

        // then
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("만료된 토큰은 검증에 실패한다")
    void 만료된_토큰_검증_실패() {
        // given
        JwtTokenProvider issuer = new JwtTokenProvider(SECRET, 1L, REFRESH_EXPIRATION, FIXED_CLOCK);
        String token = issuer.generateAccessToken(userDetails);
        JwtTokenProvider validator = new JwtTokenProvider(
                SECRET,
                ACCESS_EXPIRATION,
                REFRESH_EXPIRATION,
                Clock.offset(FIXED_CLOCK, Duration.ofMillis(10))
        );

        // then
        assertThat(validator.validateToken(token)).isFalse();
    }

    @Test
    @DisplayName("변조된 토큰은 검증에 실패한다")
    void 변조된_토큰_검증_실패() {
        // given
        String token = jwtTokenProvider.generateAccessToken(userDetails);
        String tamperedToken = token + "tampered";

        // then
        assertThat(jwtTokenProvider.validateToken(tamperedToken)).isFalse();
    }

    @Test
    @DisplayName("빈 문자열 토큰은 검증에 실패한다")
    void 빈_토큰_검증_실패() {
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }

    @Test
    @DisplayName("Refresh Token 생성 후 이메일을 정상적으로 추출할 수 있다")
    void refreshToken_생성_이메일_추출() {
        // when
        String refreshToken = jwtTokenProvider.generateRefreshToken("test@test.com");

        // then
        assertThat(refreshToken).isNotNull();
        assertThat(jwtTokenProvider.getEmail(refreshToken)).isEqualTo("test@test.com");
    }

    @Test
    @DisplayName("Refresh Token 만료 시간을 올바르게 반환한다")
    void refreshToken_만료시간_반환() {
        assertThat(jwtTokenProvider.getRefreshTokenExpirationMs()).isEqualTo(REFRESH_EXPIRATION);
    }

    @Test
    @DisplayName("토큰의 남은 만료 시간을 고정된 시계 기준으로 계산한다")
    void 토큰_남은_만료시간_계산() {
        // when
        String token = jwtTokenProvider.generateAccessToken(userDetails);

        // then
        assertThat(jwtTokenProvider.getRemainingExpiration(token)).isEqualTo(ACCESS_EXPIRATION);
    }
}
