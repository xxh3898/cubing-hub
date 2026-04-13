package com.cubinghub.domain.auth;

import com.cubinghub.domain.auth.dto.request.LoginRequest;
import com.cubinghub.domain.auth.dto.request.SignUpRequest;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.RestDocsIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import static org.hamcrest.Matchers.nullValue;
import java.util.UUID;
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

class AuthDocsTest extends RestDocsIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String TEST_PASSWORD = "password123!";

    @Test
    @DisplayName("회원가입에 성공한다")
    void should_create_user_when_signup_request_is_valid() throws Exception {
        SignUpRequest request = new SignUpRequest(newEmail("signup"), TEST_PASSWORD, newNickname("CubeMaster"), "3x3x3");

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
    }

    @Test
    @DisplayName("로그인에 성공하고 Access Token과 Refresh Token을 반환한다")
    void should_return_tokens_when_login_succeeds() throws Exception {
        String email = newEmail("login");
        saveActiveUser(email, newNickname("TestUser"));

        LoginRequest request = new LoginRequest(email, TEST_PASSWORD);

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
    }

    @Test
    @DisplayName("이메일 또는 비밀번호가 일치하지 않으면 로그인은 401을 반환한다")
    void should_return_unauthorized_when_login_credentials_are_invalid() throws Exception {
        String email = newEmail("login-fail");
        saveActiveUser(email, newNickname("TestUser"));

        ResultActions result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(email, "wrong-password"))));

        result.andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("이메일 또는 비밀번호가 일치하지 않습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("auth/login/unauthorized",
                        requestFields(
                                fieldWithPath("email").description("이메일"),
                                fieldWithPath("password").description("비밀번호")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
    }

    @Test
    @DisplayName("Refresh Token을 사용하여 토큰 갱신(Rotation)에 성공한다")
    void should_rotate_refresh_token_when_refresh_token_is_valid() throws Exception {
        String email = newEmail("refresh");
        saveActiveUser(email, newNickname("TestUser"));
        AuthSession session = login(email, TEST_PASSWORD);

        ResultActions result = mockMvc.perform(post("/api/auth/refresh")
                .cookie(session.refreshCookie()));

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
    }

    @Test
    @DisplayName("Refresh Token 쿠키 없이 토큰 재발급을 요청하면 400을 반환한다")
    void should_return_bad_request_when_refresh_cookie_is_missing() throws Exception {
        ResultActions result = mockMvc.perform(post("/api/auth/refresh"));

        result.andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("refresh_token 쿠키가 필요합니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("auth/refresh/bad-request-missing-cookie",
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
    }

    @Test
    @DisplayName("유효하지 않은 Refresh Token으로 토큰 재발급을 요청하면 400을 반환한다")
    void should_return_bad_request_when_refresh_token_is_invalid() throws Exception {
        ResultActions result = mockMvc.perform(post("/api/auth/refresh")
                .cookie(new Cookie("refresh_token", "invalid.refresh.token")));

        result.andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("유효하지 않거나 만료된 리프레시 토큰입니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("auth/refresh/bad-request-invalid-token",
                        requestCookies(
                                cookieWithName("refresh_token").description("유효하지 않거나 만료된 Refresh Token")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
    }

    @Test
    @DisplayName("회전된 이전 Refresh Token을 재사용하면 401을 반환한다")
    void should_return_unauthorized_when_rotated_refresh_token_is_reused() throws Exception {
        String email = newEmail("refresh-reuse");
        saveActiveUser(email, newNickname("TestUser"));
        AuthSession session = login(email, TEST_PASSWORD);

        Cookie rotatedRefreshCookie = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(session.refreshCookie()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("refresh_token");
        if (rotatedRefreshCookie == null) {
            throw new IllegalStateException("rotated refresh_token cookie missing");
        }

        ResultActions result = mockMvc.perform(post("/api/auth/refresh")
                .cookie(session.refreshCookie()));

        result.andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("비정상적인 접근이 감지되어 모든 인증이 만료되었습니다. 다시 로그인해주세요."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("auth/refresh/unauthorized-token-reuse",
                        requestCookies(
                                cookieWithName("refresh_token").description("Rotation 이후 재사용이 감지된 이전 Refresh Token")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
    }

    @Test
    @DisplayName("로그아웃을 수행하면 Refresh Token 쿠키를 만료시킨다")
    void should_expire_refresh_token_cookie_when_logout_succeeds() throws Exception {
        String email = newEmail("logout");
        saveActiveUser(email, newNickname("TestUser"));
        AuthSession session = login(email, TEST_PASSWORD);

        ResultActions result = mockMvc.perform(post("/api/auth/logout")
                .header("Authorization", "Bearer " + session.accessToken())
                .cookie(session.refreshCookie()));

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
    }

    private void saveActiveUser(String email, String nickname) {
        userRepository.save(User.builder()
                .email(email)
                .password(passwordEncoder.encode(TEST_PASSWORD))
                .nickname(nickname)
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());
    }

    private AuthSession login(String email, String password) throws Exception {
        ResultActions result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(email, password))));

        String accessToken = objectMapper.readTree(result.andReturn().getResponse().getContentAsString())
                .path("data")
                .path("accessToken")
                .asText();
        Cookie refreshCookie = result.andReturn().getResponse().getCookie("refresh_token");
        if (refreshCookie == null) {
            throw new IllegalStateException("refresh_token cookie missing");
        }

        return new AuthSession(accessToken, refreshCookie);
    }

    private String newEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "@cubinghub.com";
    }

    private String newNickname(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private record AuthSession(String accessToken, Cookie refreshCookie) {
    }
}
