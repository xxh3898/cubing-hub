package com.cubinghub.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.config.AuthEmailVerificationProperties;
import com.cubinghub.domain.auth.dto.request.EmailVerificationConfirmRequest;
import com.cubinghub.domain.auth.dto.request.EmailVerificationRequest;
import com.cubinghub.domain.auth.dto.request.LoginRequest;
import com.cubinghub.domain.auth.dto.request.SignUpRequest;
import com.cubinghub.domain.auth.dto.response.CurrentUserResponse;
import com.cubinghub.domain.auth.repository.EmailVerificationStore;
import com.cubinghub.domain.auth.repository.RedisBlackListService;
import com.cubinghub.domain.auth.repository.RefreshTokenService;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import java.time.Clock;
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

    @Mock
    private EmailVerificationStore emailVerificationStore;

    @Mock
    private EmailVerificationCodeGenerator emailVerificationCodeGenerator;

    @Mock
    private VerificationEmailSender verificationEmailSender;

    private JwtTokenProvider jwtTokenProvider;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        AuthEmailVerificationProperties authEmailVerificationProperties = new AuthEmailVerificationProperties();
        jwtTokenProvider = new JwtTokenProvider(JWT_SECRET, ACCESS_EXPIRATION, REFRESH_EXPIRATION, FIXED_CLOCK);
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                authenticationManager,
                jwtTokenProvider,
                refreshTokenService,
                redisBlackListService,
                emailVerificationStore,
                emailVerificationCodeGenerator,
                verificationEmailSender,
                authEmailVerificationProperties
        );
    }

    @Test
    @DisplayName("이미 사용 중인 이메일이면 인증번호 요청에 실패한다")
    void should_throw_illegal_argument_exception_when_request_email_verification_with_duplicate_email() {
        EmailVerificationRequest request = new EmailVerificationRequest("duplicate@cubinghub.com");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

        Throwable thrown = catchThrowable(() -> authService.requestEmailVerification(request));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용중인 이메일입니다.");
        verify(emailVerificationCodeGenerator, never()).generate();
    }

    @Test
    @DisplayName("재요청 쿨다운 중이면 인증번호 요청에 실패한다")
    void should_throw_illegal_argument_exception_when_request_email_verification_during_cooldown() {
        EmailVerificationRequest request = new EmailVerificationRequest("member@cubinghub.com");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(emailVerificationStore.isOnCooldown(request.getEmail())).thenReturn(true);

        Throwable thrown = catchThrowable(() -> authService.requestEmailVerification(request));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("인증번호 재요청은 1분 뒤에 가능합니다.");
        verify(emailVerificationCodeGenerator, never()).generate();
    }

    @Test
    @DisplayName("인증번호 요청에 성공하면 Redis에 저장하고 메일을 발송한다")
    void should_store_code_and_send_email_when_email_verification_request_succeeds() {
        EmailVerificationRequest request = new EmailVerificationRequest("member@cubinghub.com");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(emailVerificationStore.isOnCooldown(request.getEmail())).thenReturn(false);
        when(emailVerificationCodeGenerator.generate()).thenReturn("123456");

        authService.requestEmailVerification(request);

        verify(emailVerificationStore).saveCode(request.getEmail(), "123456", 600000L);
        verify(emailVerificationStore).saveCooldown(request.getEmail(), 60000L);
        verify(verificationEmailSender).sendVerificationCode(request.getEmail(), "123456");
    }

    @Test
    @DisplayName("메일 발송에 실패하면 저장한 인증 상태를 롤백한다")
    void should_rollback_email_verification_state_when_email_send_fails() {
        EmailVerificationRequest request = new EmailVerificationRequest("member@cubinghub.com");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(emailVerificationStore.isOnCooldown(request.getEmail())).thenReturn(false);
        when(emailVerificationCodeGenerator.generate()).thenReturn("123456");
        org.mockito.Mockito.doThrow(new IllegalStateException("smtp error"))
                .when(verificationEmailSender)
                .sendVerificationCode(request.getEmail(), "123456");

        Throwable thrown = catchThrowable(() -> authService.requestEmailVerification(request));

        assertThat(thrown)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
        verify(emailVerificationStore).deleteCode(request.getEmail());
        verify(emailVerificationStore).deleteCooldown(request.getEmail());
    }

    @Test
    @DisplayName("인증번호가 일치하면 이메일 인증을 완료한다")
    void should_mark_email_verified_when_email_verification_code_matches() {
        EmailVerificationConfirmRequest request = new EmailVerificationConfirmRequest("member@cubinghub.com", "123456");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(emailVerificationStore.getCode(request.getEmail())).thenReturn("123456");

        authService.confirmEmailVerification(request);

        verify(emailVerificationStore).deleteCode(request.getEmail());
        verify(emailVerificationStore).markVerified(request.getEmail(), 1800000L);
    }

    @Test
    @DisplayName("인증번호가 없으면 이메일 인증에 실패한다")
    void should_throw_illegal_argument_exception_when_email_verification_code_is_missing() {
        EmailVerificationConfirmRequest request = new EmailVerificationConfirmRequest("member@cubinghub.com", "123456");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(emailVerificationStore.getCode(request.getEmail())).thenReturn(null);

        Throwable thrown = catchThrowable(() -> authService.confirmEmailVerification(request));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("인증번호가 만료되었거나 요청되지 않았습니다.");
    }

    @Test
    @DisplayName("인증번호가 일치하지 않으면 이메일 인증에 실패한다")
    void should_throw_illegal_argument_exception_when_email_verification_code_does_not_match() {
        EmailVerificationConfirmRequest request = new EmailVerificationConfirmRequest("member@cubinghub.com", "654321");
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(emailVerificationStore.getCode(request.getEmail())).thenReturn("123456");

        Throwable thrown = catchThrowable(() -> authService.confirmEmailVerification(request));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("인증번호가 일치하지 않습니다.");
    }

    @Test
    @DisplayName("이메일 인증이 없으면 회원가입에 실패한다")
    void should_throw_illegal_argument_exception_when_sign_up_without_verified_email() {
        SignUpRequest request = new SignUpRequest("tester@cubinghub.com", "password123!", "CubeMaster", "3x3x3");
        when(emailVerificationStore.isVerified(request.getEmail())).thenReturn(false);

        Throwable thrown = catchThrowable(() -> authService.signUp(request));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이메일 인증이 필요합니다.");
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("이미 사용 중인 이메일이면 회원가입에 실패한다")
    void should_throw_illegal_argument_exception_when_sign_up_with_duplicate_email() {
        SignUpRequest request = new SignUpRequest("duplicate@cubinghub.com", "password123!", "CubeMaster", "3x3x3");
        when(emailVerificationStore.isVerified(request.getEmail())).thenReturn(true);
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
        when(emailVerificationStore.isVerified(request.getEmail())).thenReturn(true);
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
        when(emailVerificationStore.isVerified(request.getEmail())).thenReturn(true);
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(userRepository.existsByNickname(request.getNickname())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encodedPassword");

        authService.signUp(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(passwordEncoder).encode(request.getPassword());
        verify(userRepository).saveAndFlush(userCaptor.capture());
        verify(emailVerificationStore).clearVerified(request.getEmail());

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
        when(emailVerificationStore.isVerified(request.getEmail())).thenReturn(true);
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(userRepository.existsByNickname(request.getNickname())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encodedPassword");
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        Throwable thrown = catchThrowable(() -> authService.signUp(request));

        assertThat(thrown)
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessage("중복된 이메일 또는 닉네임입니다.");
        verify(emailVerificationStore, never()).clearVerified(request.getEmail());
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
    void should_throw_unauthorized_exception_when_refresh_token_is_reused() {
        String email = "member@cubinghub.com";
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);
        String jti = jwtTokenProvider.getJti(refreshToken);
        when(refreshTokenService.isValid(email, jti, refreshToken)).thenReturn(false);

        Throwable thrown = catchThrowable(() -> authService.refresh(refreshToken));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("비정상적인 접근이 감지되어 모든 인증이 만료되었습니다. 다시 로그인해주세요.");
        verify(refreshTokenService).deleteAllByUser(email);
    }

    @Test
    @DisplayName("유효한 refresh token이면 새 토큰을 발급하고 rotation을 수행한다")
    void should_rotate_tokens_when_refresh_token_is_valid() {
        String email = "member@cubinghub.com";
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);
        String jti = jwtTokenProvider.getJti(refreshToken);
        User user = TestFixtures.createUser(1L, email, "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);

        when(refreshTokenService.isValid(email, jti, refreshToken)).thenReturn(true);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        TokenDto tokenDto = authService.refresh(refreshToken);

        assertThat(tokenDto.getAccessToken()).isNotBlank();
        assertThat(tokenDto.getRefreshToken()).isNotBlank();
        verify(refreshTokenService).delete(email, jti);
        verify(refreshTokenService).save(
                eq(email),
                eq(jwtTokenProvider.getJti(tokenDto.getRefreshToken())),
                eq(tokenDto.getRefreshToken()),
                eq(jwtTokenProvider.getRefreshTokenExpirationMs())
        );
    }

    @Test
    @DisplayName("현재 로그인 사용자를 조회한다")
    void should_return_current_user_when_get_current_user_succeeds() {
        User user = TestFixtures.createUser(1L, "member@cubinghub.com", "Tester", UserRole.ROLE_ADMIN, UserStatus.ACTIVE);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

        CurrentUserResponse response = authService.getCurrentUser(user.getEmail());

        assertThat(response.getUserId()).isEqualTo(1L);
        assertThat(response.getEmail()).isEqualTo(user.getEmail());
        assertThat(response.getNickname()).isEqualTo(user.getNickname());
        assertThat(response.getRole()).isEqualTo(UserRole.ROLE_ADMIN);
    }

    @Test
    @DisplayName("로그아웃 시 refresh token과 access token blacklist를 정리한다")
    void should_delete_refresh_token_and_blacklist_access_token_when_logout_succeeds() {
        String email = "member@cubinghub.com";
        User user = TestFixtures.createUser(1L, email, "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);
        String jti = jwtTokenProvider.getJti(refreshToken);

        authService.logout(refreshToken, accessToken);

        verify(refreshTokenService).delete(email, jti);
        verify(redisBlackListService).setBlackList(eq(accessToken), eq(ACCESS_EXPIRATION));
    }
}
