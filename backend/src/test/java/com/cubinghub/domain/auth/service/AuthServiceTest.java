package com.cubinghub.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.auth.dto.request.LoginRequest;
import com.cubinghub.domain.auth.dto.request.SignUpRequest;
import com.cubinghub.domain.auth.dto.response.CurrentUserResponse;
import com.cubinghub.domain.auth.repository.RedisBlackListService;
import com.cubinghub.domain.auth.repository.RefreshTokenService;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService 단위 테스트")
class AuthServiceTest {

    private static final String JWT_SECRET = "testSecretKeyForTestingPurposes12345678901234";
    private static final long ACCESS_EXPIRATION = 3600000L;
    private static final long REFRESH_EXPIRATION = 604800000L;
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-04-03T00:00:00Z"),
            ZoneOffset.UTC
    );

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
        jwtTokenProvider = new JwtTokenProvider(JWT_SECRET, ACCESS_EXPIRATION, REFRESH_EXPIRATION, FIXED_CLOCK);
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
    void should_throw_illegal_argument_exception_when_sign_up_with_duplicate_email() {
        SignUpRequest request = new SignUpRequest("duplicate@cubinghub.com", "password123!", "CubeMaster", "3x3x3");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

        Throwable thrown = catchThrowable(() -> authService.signUp(request));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용중인 이메일입니다.");
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("이미 사용 중인 닉네임이면 회원가입에 실패한다")
    void should_throw_illegal_argument_exception_when_sign_up_with_duplicate_nickname() {
        SignUpRequest request = new SignUpRequest("tester@cubinghub.com", "password123!", "CubeMaster", "3x3x3");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(userRepository.existsByNickname(request.getNickname())).thenReturn(true);

        Throwable thrown = catchThrowable(() -> authService.signUp(request));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용중인 닉네임입니다.");
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("회원가입에 성공하면 암호화된 비밀번호와 기본 사용자 상태로 저장한다")
    void should_save_user_with_encoded_password_when_sign_up_succeeds() {
        SignUpRequest request = new SignUpRequest("tester@cubinghub.com", "password123!", "CubeMaster", "3x3x3");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(userRepository.existsByNickname(request.getNickname())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encodedPassword");

        authService.signUp(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(passwordEncoder).encode(request.getPassword());
        verify(userRepository).saveAndFlush(userCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getEmail()).isEqualTo(request.getEmail());
        assertThat(savedUser.getPassword()).isEqualTo("encodedPassword");
        assertThat(savedUser.getNickname()).isEqualTo(request.getNickname());
        assertThat(savedUser.getMainEvent()).isEqualTo(request.getMainEvent());
        assertThat(savedUser.getRole()).isEqualTo(UserRole.ROLE_USER);
        assertThat(savedUser.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    @DisplayName("회원가입 저장 중 무결성 예외가 나면 중복 예외로 변환한다")
    void should_throw_data_integrity_violation_exception_when_sign_up_save_fails() {
        SignUpRequest request = new SignUpRequest("tester@cubinghub.com", "password123!", "CubeMaster", "3x3x3");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(userRepository.existsByNickname(request.getNickname())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encodedPassword");
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        Throwable thrown = catchThrowable(() -> authService.signUp(request));

        assertThat(thrown)
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessage("중복된 이메일 또는 닉네임입니다.");
    }

    @Test
    @DisplayName("인증 실패 시 로그인은 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_login_authentication_fails() {
        LoginRequest request = new LoginRequest("test@cubinghub.com", "wrong-password");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("bad credentials"));

        Throwable thrown = catchThrowable(() -> authService.login(request));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("이메일 또는 비밀번호가 일치하지 않습니다.");
    }

    @Test
    @DisplayName("정상 로그인 시 Access Token과 Refresh Token을 발급하고 Redis에 저장한다")
    void should_issue_tokens_and_store_refresh_token_when_login_succeeds() {
        LoginRequest request = new LoginRequest("test@cubinghub.com", "password123!");
        User user = TestFixtures.createUser(1L, request.getEmail(), "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        UserDetails userDetails = TestFixtures.createUserDetails(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(user));

        TokenDto tokenDto = authService.login(request);

        assertThat(tokenDto.getAccessToken()).isNotBlank();
        assertThat(tokenDto.getRefreshToken()).isNotBlank();
        assertThat(jwtTokenProvider.getEmail(tokenDto.getAccessToken())).isEqualTo(request.getEmail());
        assertThat(jwtTokenProvider.getEmail(tokenDto.getRefreshToken())).isEqualTo(request.getEmail());

        ArgumentCaptor<String> jtiCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> refreshTokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(refreshTokenService).save(
                eq(request.getEmail()),
                jtiCaptor.capture(),
                refreshTokenCaptor.capture(),
                eq(jwtTokenProvider.getRefreshTokenExpirationMs())
        );
        assertThat(jwtTokenProvider.getJti(refreshTokenCaptor.getValue())).isEqualTo(jtiCaptor.getValue());
    }

    @Test
    @DisplayName("인증 성공 후 사용자 조회에 실패하면 로그인은 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_user_is_missing_after_authentication() {
        LoginRequest request = new LoginRequest("missing@cubinghub.com", "password123!");
        User user = TestFixtures.createUser(1L, request.getEmail(), "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        UserDetails userDetails = TestFixtures.createUserDetails(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> authService.login(request));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("이메일 또는 비밀번호가 일치하지 않습니다.");
    }

    @Test
    @DisplayName("비활성 사용자 계정은 로그인에 실패한다")
    void should_throw_illegal_state_exception_when_login_user_is_inactive() {
        LoginRequest request = new LoginRequest("inactive@cubinghub.com", "password123!");
        User user = TestFixtures.createUser(1L, request.getEmail(), "Inactive", UserRole.ROLE_USER, UserStatus.DELETED);
        UserDetails userDetails = TestFixtures.createUserDetails(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(user));

        Throwable thrown = catchThrowable(() -> authService.login(request));

        assertThat(thrown)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("활성화된 계정이 아닙니다.");
    }

    @Test
    @DisplayName("유효하지 않은 refresh token이면 토큰 재발급에 실패한다")
    void should_throw_illegal_argument_exception_when_refresh_token_is_invalid() {
        Throwable thrown = catchThrowable(() -> authService.refresh("invalid.refresh.token"));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("유효하지 않거나 만료된 리프레시 토큰입니다.");
    }

    @Test
    @DisplayName("비정상적인 refresh token 재사용이 감지되면 모든 토큰을 삭제하고 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_refresh_token_reuse_is_detected() {
        String email = "test@cubinghub.com";
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);
        String jti = jwtTokenProvider.getJti(refreshToken);

        when(refreshTokenService.isValid(email, jti, refreshToken)).thenReturn(false);

        Throwable thrown = catchThrowable(() -> authService.refresh(refreshToken));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("비정상적인 접근이 감지되어 모든 인증이 만료되었습니다. 다시 로그인해주세요.");
        verify(refreshTokenService).deleteAllByUser(email);
        verify(userRepository, never()).findByEmail(any());
    }

    @Test
    @DisplayName("비활성 사용자 계정은 토큰 재발급에 실패한다")
    void should_throw_illegal_state_exception_when_refreshing_deleted_user() {
        String email = "inactive@cubinghub.com";
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);
        String jti = jwtTokenProvider.getJti(refreshToken);
        User inactiveUser = TestFixtures.createUser(1L, email, "Inactive", UserRole.ROLE_USER, UserStatus.DELETED);

        when(refreshTokenService.isValid(email, jti, refreshToken)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(inactiveUser));

        Throwable thrown = catchThrowable(() -> authService.refresh(refreshToken));

        assertThat(thrown)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("활성화된 계정이 아닙니다.");
        verify(refreshTokenService, never()).delete(eq(email), any());
    }

    @Test
    @DisplayName("유효한 refresh token이라도 사용자를 찾을 수 없으면 토큰 재발급에 실패한다")
    void should_throw_illegal_argument_exception_when_refresh_user_is_missing() {
        String email = "missing@cubinghub.com";
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);
        String jti = jwtTokenProvider.getJti(refreshToken);

        when(refreshTokenService.isValid(email, jti, refreshToken)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> authService.refresh(refreshToken));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("사용자를 찾을 수 없습니다.");
        verify(refreshTokenService, never()).delete(eq(email), any());
        verify(refreshTokenService, never()).save(eq(email), any(), any(), any(Long.class));
    }

    @Test
    @DisplayName("유효한 refresh token이면 rotation으로 새 토큰을 발급한다")
    void should_rotate_refresh_token_when_refresh_token_is_valid() {
        String email = "tester@cubinghub.com";
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);
        String oldJti = jwtTokenProvider.getJti(refreshToken);
        User user = TestFixtures.createUser(1L, email, "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);

        when(refreshTokenService.isValid(email, oldJti, refreshToken)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        TokenDto tokenDto = authService.refresh(refreshToken);

        assertThat(tokenDto.getAccessToken()).isNotBlank();
        assertThat(tokenDto.getRefreshToken()).isNotBlank();
        assertThat(tokenDto.getRefreshToken()).isNotEqualTo(refreshToken);
        assertThat(jwtTokenProvider.getEmail(tokenDto.getAccessToken())).isEqualTo(email);

        verify(refreshTokenService).delete(email, oldJti);

        ArgumentCaptor<String> newJtiCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> newRefreshTokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(refreshTokenService).save(
                eq(email),
                newJtiCaptor.capture(),
                newRefreshTokenCaptor.capture(),
                eq(jwtTokenProvider.getRefreshTokenExpirationMs())
        );
        assertThat(jwtTokenProvider.getJti(newRefreshTokenCaptor.getValue())).isEqualTo(newJtiCaptor.getValue());
    }

    @Test
    @DisplayName("현재 로그인 사용자 정보를 정상 조회한다")
    void should_return_current_user_response_when_user_exists() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

        CurrentUserResponse response = authService.getCurrentUser(user.getEmail());

        assertThat(response.getUserId()).isEqualTo(user.getId());
        assertThat(response.getEmail()).isEqualTo(user.getEmail());
        assertThat(response.getNickname()).isEqualTo(user.getNickname());
    }

    @Test
    @DisplayName("현재 로그인 사용자 조회 시 사용자가 없으면 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_current_user_is_missing() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> authService.getCurrentUser("missing@cubinghub.com"));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("로그아웃 시 refresh token 삭제와 access token 블랙리스트 등록을 함께 수행한다")
    void should_delete_refresh_token_and_blacklist_access_token_when_logout_succeeds() {
        User user = TestFixtures.createUser(1L, "logout@cubinghub.com", "LogoutUser", UserRole.ROLE_USER, UserStatus.ACTIVE);
        String accessToken = jwtTokenProvider.generateAccessToken(TestFixtures.createUserDetails(user));
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());
        String jti = jwtTokenProvider.getJti(refreshToken);

        authService.logout(refreshToken, accessToken);

        verify(refreshTokenService).delete(user.getEmail(), jti);
        verify(redisBlackListService).setBlackList(accessToken, ACCESS_EXPIRATION);
    }

    @Test
    @DisplayName("refresh token 없이 로그아웃하면 access token만 블랙리스트에 등록한다")
    void should_blacklist_access_token_only_when_logout_refresh_token_is_null() {
        User user = TestFixtures.createUser(1L, "logout-null@cubinghub.com", "LogoutUser", UserRole.ROLE_USER, UserStatus.ACTIVE);
        String accessToken = jwtTokenProvider.generateAccessToken(TestFixtures.createUserDetails(user));

        authService.logout(null, accessToken);

        verify(refreshTokenService, never()).delete(any(), any());
        verify(redisBlackListService).setBlackList(accessToken, ACCESS_EXPIRATION);
    }

    @Test
    @DisplayName("refresh token 파싱에 실패해도 access token 블랙리스트 등록은 계속 수행한다")
    void should_blacklist_access_token_when_refresh_token_parsing_fails_on_logout() {
        User user = TestFixtures.createUser(1L, "logout@cubinghub.com", "LogoutUser", UserRole.ROLE_USER, UserStatus.ACTIVE);
        String accessToken = jwtTokenProvider.generateAccessToken(TestFixtures.createUserDetails(user));

        authService.logout("invalid.refresh.token", accessToken);

        verify(refreshTokenService, never()).delete(any(), any());
        verify(redisBlackListService).setBlackList(accessToken, ACCESS_EXPIRATION);
    }

    @Test
    @DisplayName("만료된 access token이면 블랙리스트 등록을 건너뛴다")
    void should_skip_blacklist_when_access_token_is_expired_on_logout() {
        JwtTokenProvider issuer = new JwtTokenProvider(JWT_SECRET, 1L, REFRESH_EXPIRATION, FIXED_CLOCK);
        String expiredAccessToken = issuer.generateAccessToken(
                TestFixtures.createUserDetails(
                        TestFixtures.createUser(1L, "expired@cubinghub.com", "Expired", UserRole.ROLE_USER, UserStatus.ACTIVE)
                )
        );
        jwtTokenProvider = new JwtTokenProvider(
                JWT_SECRET,
                ACCESS_EXPIRATION,
                REFRESH_EXPIRATION,
                Clock.offset(FIXED_CLOCK, Duration.ofMillis(10))
        );
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                authenticationManager,
                jwtTokenProvider,
                refreshTokenService,
                redisBlackListService
        );

        authService.logout(null, expiredAccessToken);

        verify(redisBlackListService, never()).setBlackList(eq(expiredAccessToken), any(Long.class));
    }
}
