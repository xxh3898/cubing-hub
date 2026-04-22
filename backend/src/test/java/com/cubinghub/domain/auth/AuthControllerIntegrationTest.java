package com.cubinghub.domain.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.auth.dto.request.EmailVerificationConfirmRequest;
import com.cubinghub.domain.auth.dto.request.EmailVerificationRequest;
import com.cubinghub.domain.auth.dto.request.LoginRequest;
import com.cubinghub.domain.auth.dto.request.SignUpRequest;
import com.cubinghub.domain.auth.repository.EmailVerificationStore;
import com.cubinghub.domain.auth.repository.RefreshTokenService;
import com.cubinghub.domain.auth.service.VerificationEmailSender;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@AutoConfigureMockMvc
@DisplayName("AuthController 통합 테스트")
class AuthControllerIntegrationTest extends JpaIntegrationTest {

    private static final String TEST_PASSWORD = "password123!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private EmailVerificationStore emailVerificationStore;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @MockBean
    private VerificationEmailSender verificationEmailSender;

    private final List<String> cleanupEmails = new ArrayList<>();

    @AfterEach
    void tearDown() {
        cleanupEmails.forEach(this::deleteAuthState);
    }

    @Test
    @DisplayName("인증번호 요청 성공 시 Redis에 인증 코드를 저장한다")
    void should_store_verification_code_when_email_verification_is_requested() throws Exception {
        String email = newEmail("verify-request");

        mockMvc.perform(post("/api/auth/email-verification/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new EmailVerificationRequest(email))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("인증번호를 이메일로 전송했습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));

        String storedCode = emailVerificationStore.getCode(email);
        assertThat(storedCode).matches("\\d{6}");
        assertThat(emailVerificationStore.isOnCooldown(email)).isTrue();
        verify(verificationEmailSender).sendVerificationCode(email, storedCode);
    }

    @Test
    @DisplayName("재요청 쿨다운 중이면 인증번호 요청은 400을 반환한다")
    void should_return_bad_request_when_email_verification_is_requested_during_cooldown() throws Exception {
        String email = newEmail("verify-cooldown");

        mockMvc.perform(post("/api/auth/email-verification/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new EmailVerificationRequest(email))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/email-verification/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new EmailVerificationRequest(email))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("인증번호 재요청은 1분 뒤에 가능합니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));
    }

    @Test
    @DisplayName("인증번호 확인 성공 시 이메일 인증을 완료한다")
    void should_mark_email_verified_when_email_verification_is_confirmed() throws Exception {
        String email = newEmail("verify-confirm");
        String code = requestVerificationCode(email);

        mockMvc.perform(post("/api/auth/email-verification/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new EmailVerificationConfirmRequest(email, code))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("이메일 인증이 완료되었습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));

        assertThat(emailVerificationStore.getCode(email)).isNull();
        assertThat(emailVerificationStore.isVerified(email)).isTrue();
    }

    @Test
    @DisplayName("잘못된 인증번호를 보내면 400을 반환한다")
    void should_return_bad_request_when_email_verification_code_is_invalid() throws Exception {
        String email = newEmail("verify-invalid");
        requestVerificationCode(email);

        mockMvc.perform(post("/api/auth/email-verification/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new EmailVerificationConfirmRequest(email, "000000"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("인증번호가 일치하지 않습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));
    }

    @Test
    @DisplayName("이메일 인증 없이 회원가입을 요청하면 400을 반환한다")
    void should_return_bad_request_when_signup_is_requested_without_email_verification() throws Exception {
        String email = newEmail("signup-unverified");
        SignUpRequest request = new SignUpRequest(email, TEST_PASSWORD, newNickname("CubeMaster"), "WCA_333");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("이메일 인증이 필요합니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));
    }

    @Test
    @DisplayName("회원가입 성공 시 사용자를 저장한다")
    void should_create_user_when_signup_request_is_valid() throws Exception {
        String email = newEmail("signup");
        markEmailVerified(email);
        SignUpRequest request = new SignUpRequest(email, TEST_PASSWORD, newNickname("CubeMaster"), "WCA_333");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.message").value("회원가입이 완료되었습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));

        assertThat(userRepository.findByEmail(email)).isPresent();
        assertThat(emailVerificationStore.isVerified(email)).isFalse();
    }

    @Test
    @DisplayName("로그인 성공 시 Refresh Token을 Redis에 저장한다")
    void should_store_refresh_token_when_login_succeeds() throws Exception {
        String email = newEmail("login");
        saveActiveUser(email, newNickname("Tester"));

        AuthSession session = login(email, TEST_PASSWORD);

        assertThat(refreshTokenService.get(email, jwtTokenProvider.getJti(session.refreshToken())))
                .isEqualTo(session.refreshToken());
    }

    @Test
    @DisplayName("이메일 또는 비밀번호가 일치하지 않으면 로그인은 401을 반환한다")
    void should_return_unauthorized_when_login_credentials_are_invalid() throws Exception {
        String email = newEmail("login-fail");
        saveActiveUser(email, newNickname("Tester"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("이메일 또는 비밀번호가 일치하지 않습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()));
    }

    @Test
    @DisplayName("토큰 재발급 성공 시 기존 Refresh Token을 삭제하고 새 토큰을 저장한다")
    void should_rotate_refresh_token_when_refresh_request_succeeds() throws Exception {
        String email = newEmail("refresh");
        saveActiveUser(email, newNickname("Tester"));
        AuthSession initialSession = login(email, TEST_PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(initialSession.refreshCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("토큰이 재발급되었습니다."))
                .andExpect(cookie().exists("refresh_token"))
                .andReturn();

        Cookie currentRefreshCookie = result.getResponse().getCookie("refresh_token");
        assertThat(currentRefreshCookie).isNotNull();

        String newRefreshToken = currentRefreshCookie.getValue();
        String oldJti = jwtTokenProvider.getJti(initialSession.refreshToken());
        String newJti = jwtTokenProvider.getJti(newRefreshToken);

        assertThat(refreshTokenService.get(email, oldJti)).isNull();
        assertThat(refreshTokenService.get(email, newJti)).isEqualTo(newRefreshToken);
    }

    @Test
    @DisplayName("로그아웃 성공 시 Redis에서 Refresh Token을 삭제한다")
    void should_delete_refresh_token_when_logout_succeeds() throws Exception {
        String email = newEmail("logout");
        saveActiveUser(email, newNickname("Tester"));
        AuthSession session = login(email, TEST_PASSWORD);

        mockMvc.perform(post("/api/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + session.accessToken())
                        .cookie(session.refreshCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("로그아웃이 완료되었습니다."))
                .andExpect(cookie().maxAge("refresh_token", 0));

        assertThat(refreshTokenService.get(email, jwtTokenProvider.getJti(session.refreshToken()))).isNull();
    }

    @Test
    @DisplayName("Refresh Token 쿠키 없이 재발급 요청을 보내면 400을 반환한다")
    void should_return_bad_request_when_refresh_cookie_is_missing() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("refresh_token 쿠키가 필요합니다."));
    }

    @Test
    @DisplayName("유효하지 않은 Refresh Token 쿠키로 재발급 요청을 보내면 400을 반환한다")
    void should_return_bad_request_when_refresh_cookie_is_malformed() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refresh_token", "invalid.refresh.token")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("유효하지 않거나 만료된 리프레시 토큰입니다.")));
    }

    @Test
    @DisplayName("회전된 이전 Refresh Token을 재사용하면 401을 반환하고 해당 사용자의 모든 Refresh Token을 삭제한다")
    void should_return_unauthorized_and_delete_all_refresh_tokens_when_rotated_refresh_token_is_reused() throws Exception {
        String email = newEmail("refresh-reuse");
        saveActiveUser(email, newNickname("Tester"));
        AuthSession initialSession = login(email, TEST_PASSWORD);

        MvcResult rotationResult = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(initialSession.refreshCookie()))
                .andExpect(status().isOk())
                .andReturn();

        Cookie rotatedRefreshCookie = rotationResult.getResponse().getCookie("refresh_token");
        assertThat(rotatedRefreshCookie).isNotNull();
        assertThat(refreshTokenService.get(email, jwtTokenProvider.getJti(rotatedRefreshCookie.getValue())))
                .isEqualTo(rotatedRefreshCookie.getValue());

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(initialSession.refreshCookie()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("비정상적인 접근이 감지되어 모든 인증이 만료되었습니다. 다시 로그인해주세요."))
                .andExpect(jsonPath("$.data").value(nullValue()));

        assertThat(redisTemplate.keys("refresh:" + email + ":*")).isNullOrEmpty();
    }

    @Test
    @DisplayName("Refresh Token 쿠키 없이 로그아웃을 요청해도 정상 응답을 반환한다")
    void should_return_ok_when_logout_is_requested_without_refresh_cookie() throws Exception {
        String email = newEmail("logout-no-cookie");
        User user = saveActiveUser(email, newNickname("Tester"));

        mockMvc.perform(post("/api/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + TestFixtures.generateAccessToken(jwtTokenProvider, user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("로그아웃이 완료되었습니다."))
                .andExpect(cookie().maxAge("refresh_token", 0));
    }

    @Test
    @DisplayName("Authorization 헤더 없이 로그아웃을 요청해도 정상 응답을 반환한다")
    void should_return_ok_when_logout_is_requested_without_authorization_header() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("로그아웃이 완료되었습니다."))
                .andExpect(cookie().maxAge("refresh_token", 0));
    }

    @Test
    @DisplayName("Bearer 접두사가 없는 Authorization 헤더로 로그아웃을 요청해도 정상 응답을 반환한다")
    void should_return_ok_when_logout_authorization_header_has_no_bearer_prefix() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "invalid.token.value"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("로그아웃이 완료되었습니다."))
                .andExpect(cookie().maxAge("refresh_token", 0));
    }

    @Test
    @DisplayName("세션 복구 쿠키 정리 요청은 refresh_token 쿠키를 만료시킨다")
    void should_expire_refresh_token_cookie_when_clear_refresh_cookie_is_requested() throws Exception {
        mockMvc.perform(post("/api/session/clear-refresh-cookie"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("refresh_token 쿠키를 정리했습니다."))
                .andExpect(cookie().maxAge("refresh_token", 0))
                .andExpect(cookie().path("refresh_token", "/api/auth"));
    }

    private String requestVerificationCode(String email) throws Exception {
        mockMvc.perform(post("/api/auth/email-verification/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new EmailVerificationRequest(email))))
                .andExpect(status().isOk());
        return emailVerificationStore.getCode(email);
    }

    private void markEmailVerified(String email) {
        emailVerificationStore.markVerified(email, 1800000L);
    }

    private User saveActiveUser(String email, String nickname) {
        return userRepository.save(User.builder()
                .email(email)
                .password(passwordEncoder.encode(TEST_PASSWORD))
                .nickname(nickname)
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());
    }

    private AuthSession login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("accessToken")
                .asText();
        Cookie refreshCookie = result.getResponse().getCookie("refresh_token");
        if (refreshCookie == null) {
            throw new IllegalStateException("refresh_token cookie missing");
        }

        return new AuthSession(accessToken, refreshCookie.getValue(), refreshCookie);
    }

    private String newEmail(String prefix) {
        String email = prefix + "-" + uniqueSuffix() + "@test.com";
        cleanupEmails.add(email);
        return email;
    }

    private String newNickname(String prefix) {
        return prefix + "-" + uniqueSuffix();
    }

    private String uniqueSuffix() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private void deleteAuthState(String email) {
        deleteByPattern("refresh:" + email + ":*");
        deleteByPattern("auth:email-verification:*:" + email);
        userRepository.findByEmail(email).ifPresent(userRepository::delete);
    }

    private void deleteByPattern(String pattern) {
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }

    private record AuthSession(String accessToken, String refreshToken, Cookie refreshCookie) {
    }
}
