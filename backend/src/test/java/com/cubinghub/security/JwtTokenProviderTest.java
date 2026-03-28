package com.cubinghub.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JwtTokenProvider 단위 테스트")
class JwtTokenProviderTest {

    // 테스트용 시크릿 키 (최소 256bit = 32자 이상)
    private static final String SECRET = "testSecretKeyForTestingPurposes12345678901234";
    private static final long ACCESS_EXPIRATION = 3600000L;   // 1시간
    private static final long REFRESH_EXPIRATION = 604800000L; // 7일

    private JwtTokenProvider jwtTokenProvider;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(SECRET, ACCESS_EXPIRATION, REFRESH_EXPIRATION);

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
        // given: 즉시 만료되는 토큰 생성
        JwtTokenProvider shortLivedProvider = new JwtTokenProvider(SECRET, 1L, REFRESH_EXPIRATION);
        String token = shortLivedProvider.generateAccessToken(userDetails);

        // 1ms 대기 후 검증
        try { Thread.sleep(5); } catch (InterruptedException ignored) {}

        // then
        assertThat(shortLivedProvider.validateToken(token)).isFalse();
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
}
