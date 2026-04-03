package com.cubinghub.domain.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.auth.dto.request.LoginRequest;
import com.cubinghub.domain.auth.dto.request.SignUpRequest;
import com.cubinghub.domain.auth.repository.RedisBlackListService;
import com.cubinghub.domain.auth.repository.RefreshTokenService;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService 단위 테스트")
class AuthServiceTest {

    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-04-03T00:00:00Z"),
            ZoneOffset.UTC
    );
    private static final long ACCESS_EXPIRATION = 3600000L;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private RedisBlackListService redisBlackListService;

    private JwtTokenProvider jwtTokenProvider;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = TestFixtures.createJwtTokenProvider(FIXED_CLOCK);
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                authenticationManager,
                jwtTokenProvider,
                refreshTokenService,
                redisBlackListService
        );
    }

    @Test
    @DisplayName("이미 사용 중인 이메일이면 회원가입에 실패한다")
    void signUp_중복이메일_예외() {
        // given
        SignUpRequest request = new SignUpRequest("duplicate@cubinghub.com", "password123!", "CubeMaster", "3x3x3");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

        // when
        Throwable thrown = catchThrowable(() -> authService.signUp(request));

        // then
        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용중인 이메일입니다.");
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("인증 실패 시 로그인은 401 예외를 반환한다")
    void login_인증실패_401예외() {
        // given
        LoginRequest request = new LoginRequest("test@cubinghub.com", "wrong-password");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("bad credentials"));

        // when
        Throwable thrown = catchThrowable(() -> authService.login(request));

        // then
        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("이메일 또는 비밀번호가 일치하지 않습니다.");
    }

    @Test
    @DisplayName("비정상적인 refresh token 재사용이 감지되면 모든 토큰을 삭제하고 401 예외를 반환한다")
    void refresh_토큰재사용감지_전체삭제후_401예외() {
        // given
        String email = "test@cubinghub.com";
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);
        String jti = jwtTokenProvider.getJti(refreshToken);

        when(refreshTokenService.isValid(email, jti, refreshToken)).thenReturn(false);

        // when
        Throwable thrown = catchThrowable(() -> authService.refresh(refreshToken));

        // then
        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("비정상적인 접근이 감지되어 모든 인증이 만료되었습니다. 다시 로그인해주세요.");
        verify(refreshTokenService).deleteAllByUser(email);
        verify(userRepository, never()).findByEmail(any());
    }

    @Test
    @DisplayName("비활성 사용자 계정은 토큰 재발급에 실패한다")
    void refresh_비활성사용자_예외() {
        // given
        String email = "inactive@cubinghub.com";
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);
        String jti = jwtTokenProvider.getJti(refreshToken);
        User inactiveUser = TestFixtures.createUser(1L, email, "Inactive", UserRole.ROLE_USER, UserStatus.DELETED);

        when(refreshTokenService.isValid(email, jti, refreshToken)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(inactiveUser));

        // when
        Throwable thrown = catchThrowable(() -> authService.refresh(refreshToken));

        // then
        assertThat(thrown)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("활성화된 계정이 아닙니다.");
        verify(refreshTokenService, never()).delete(eq(email), any());
    }

    @Test
    @DisplayName("로그아웃 시 refresh token 삭제와 access token 블랙리스트 등록을 함께 수행한다")
    void logout_refreshToken삭제와_블랙리스트등록() {
        // given
        User user = TestFixtures.createUser(1L, "logout@cubinghub.com", "LogoutUser", UserRole.ROLE_USER, UserStatus.ACTIVE);
        String accessToken = jwtTokenProvider.generateAccessToken(TestFixtures.createUserDetails(user));
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());
        String jti = jwtTokenProvider.getJti(refreshToken);

        // when
        authService.logout(refreshToken, accessToken);

        // then
        verify(refreshTokenService).delete(user.getEmail(), jti);
        verify(redisBlackListService).setBlackList(accessToken, ACCESS_EXPIRATION);
    }
}
