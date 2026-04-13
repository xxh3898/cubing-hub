package com.cubinghub.domain.auth;

import com.cubinghub.domain.auth.dto.request.LoginRequest;
import com.cubinghub.domain.auth.dto.request.SignUpRequest;
import com.cubinghub.domain.auth.repository.RefreshTokenService;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.RestDocsBaseTest;
import com.cubinghub.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.restdocs.cookies.CookieDocumentation.cookieWithName;
import static org.springframework.restdocs.cookies.CookieDocumentation.requestCookies;
import static org.springframework.restdocs.cookies.CookieDocumentation.responseCookies;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthDocsTest extends RestDocsBaseTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private final String testEmail = "test@cubinghub.com";
    private final String testPassword = "password123!";

    @Test
    @DisplayName("회원가입에 성공한다")
    void should_create_user_when_signup_request_is_valid() throws Exception {
        SignUpRequest request = new SignUpRequest(testEmail, testPassword, "CubeMaster", "3x3x3");

        ResultActions result = mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.message").value("회원가입이 완료되었습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("auth/signup",
                        requestFields(
                                fieldWithPath("email").description("이메일 (이메일 형식 필수)"),
                                fieldWithPath("password").description("비밀번호 (8자 이상)"),
                                fieldWithPath("nickname").description("닉네임 (2자 이상 50자 이하)"),
                                fieldWithPath("mainEvent").description("주 종목 (선택사항)")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("추가 데이터 없음")
                        )
                ));

        boolean exists = userRepository.existsByEmail(testEmail);
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("로그인에 성공하고 Access Token과 Refresh Token을 반환한다")
    void should_return_tokens_and_store_refresh_token_when_login_succeeds() throws Exception {
        userRepository.save(User.builder()
                .email(testEmail)
                .password(passwordEncoder.encode(testPassword))
                .nickname("TestUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());

        LoginRequest request = new LoginRequest(testEmail, testPassword);

        ResultActions result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("로그인에 성공했습니다."))
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("refresh_token", true))
                .andExpect(cookie().secure("refresh_token", true))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andDo(document("auth/login",
                        requestFields(
                                fieldWithPath("email").description("이메일"),
                                fieldWithPath("password").description("비밀번호")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("토큰 정보"),
                                fieldWithPath("data.accessToken").description("Access Token (만료 1일)"),
                                fieldWithPath("data.tokenType").description("토큰 타입 (고정값 Bearer)")
                        ),
                        responseCookies(
                                cookieWithName("refresh_token").description("Refresh Token (만료 7일, HttpOnly/Secure)")
                        )
                ));

        Cookie refreshCookie = result.andReturn().getResponse().getCookie("refresh_token");
        assertThat(refreshCookie).isNotNull();
        String cookieValue = refreshCookie.getValue();
        String jti = jwtTokenProvider.getJti(cookieValue);
        String savedRefreshToken = refreshTokenService.get(testEmail, jti);
        assertThat(savedRefreshToken).isNotNull();
        assertThat(savedRefreshToken).isEqualTo(cookieValue);
    }

    @Test
    @DisplayName("Refresh Token을 사용하여 토큰 갱신(Rotation)에 성공한다")
    void should_rotate_refresh_token_when_refresh_token_is_valid() throws Exception {
        userRepository.save(User.builder()
                .email(testEmail)
                .password(passwordEncoder.encode(testPassword))
                .nickname("TestUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());

        String initialRefreshToken = jwtTokenProvider.generateRefreshToken(testEmail);
        String initialJti = jwtTokenProvider.getJti(initialRefreshToken);
        refreshTokenService.save(testEmail, initialJti, initialRefreshToken, 1000000);

        ResultActions result = mockMvc.perform(post("/api/auth/refresh")
                .cookie(new Cookie("refresh_token", initialRefreshToken)));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("토큰이 재발급되었습니다."))
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("refresh_token", true))
                .andExpect(cookie().secure("refresh_token", true))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andDo(document("auth/refresh",
                        requestCookies(
                                cookieWithName("refresh_token").description("기존 할당받은 Refresh Token")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("토큰 정보"),
                                fieldWithPath("data.accessToken").description("새로운 Access Token"),
                                fieldWithPath("data.tokenType").description("토큰 타입 (고정값 Bearer)")
                        ),
                        responseCookies(
                                cookieWithName("refresh_token").description("새로운 Refresh Token (Rotation 처리됨)")
                        )
                ));

        Cookie currentRefreshCookie = result.andReturn().getResponse().getCookie("refresh_token");
        assertThat(currentRefreshCookie).isNotNull();
        String currentRefreshToken = currentRefreshCookie.getValue();
        String newJti = jwtTokenProvider.getJti(currentRefreshToken);
        String savedRefreshToken = refreshTokenService.get(testEmail, newJti);
        assertThat(savedRefreshToken).isNotNull();
        assertThat(savedRefreshToken).isNotEqualTo(initialRefreshToken);

        String deletedRefreshToken = refreshTokenService.get(testEmail, initialJti);
        assertThat(deletedRefreshToken).isNull();
    }

    @Test
    @DisplayName("로그아웃을 수행하면 Redis에서 Refresh Token이 삭제된다")
    void should_remove_refresh_token_when_logout_succeeds() throws Exception {
        userRepository.save(User.builder()
                .email(testEmail)
                .password(passwordEncoder.encode(testPassword))
                .nickname("TestUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());

        String mockAccessToken = jwtTokenProvider.generateAccessToken(
                org.springframework.security.core.userdetails.User.builder()
                        .username(testEmail).password("").authorities(UserRole.ROLE_USER.name()).build());
        String initialRefreshToken = jwtTokenProvider.generateRefreshToken(testEmail);
        String jti = jwtTokenProvider.getJti(initialRefreshToken);
        refreshTokenService.save(testEmail, jti, initialRefreshToken, 100000);

        ResultActions result = mockMvc.perform(post("/api/auth/logout")
                .header("Authorization", "Bearer " + mockAccessToken)
                .cookie(new Cookie("refresh_token", initialRefreshToken)));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("로그아웃이 완료되었습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andExpect(cookie().maxAge("refresh_token", 0))
                .andDo(document("auth/logout",
                        requestCookies(
                                cookieWithName("refresh_token").description("삭제할 Refresh Token")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("추가 데이터 없음")
                        ),
                        responseCookies(
                                cookieWithName("refresh_token").description("만료 처리된 Refresh Token 쿠키")
                        )
                ));

        String deletedToken = refreshTokenService.get(testEmail, jti);
        assertThat(deletedToken).isNull();
    }
}
