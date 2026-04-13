package com.cubinghub.domain.auth;

import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.RestDocsBaseTest;
import com.cubinghub.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.headers.HeaderDocumentation.requestHeaders;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserContextDocsTest extends RestDocsBaseTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private final String testEmail = "test@cubinghub.com";
    private final String testPassword = "password123!";

    @Test
    @DisplayName("현재 로그인 사용자 컨텍스트를 조회한다")
    void should_return_current_user_context_when_access_token_is_valid() throws Exception {
        User savedUser = userRepository.save(User.builder()
                .email(testEmail)
                .password(passwordEncoder.encode(testPassword))
                .nickname("TestUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());

        String accessToken = jwtTokenProvider.generateAccessToken(
                org.springframework.security.core.userdetails.User.builder()
                        .username(testEmail)
                        .password("")
                        .authorities(UserRole.ROLE_USER.name())
                        .build()
        );

        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("현재 로그인 사용자를 조회했습니다."))
                .andExpect(jsonPath("$.data.userId").value(savedUser.getId()))
                .andExpect(jsonPath("$.data.email").value(testEmail))
                .andExpect(jsonPath("$.data.nickname").value("TestUser"))
                .andDo(document("auth/me",
                        requestHeaders(
                                headerWithName("Authorization").description("Access Token을 담은 Bearer 인증 헤더")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("현재 로그인 사용자 컨텍스트"),
                                fieldWithPath("data.userId").type(JsonFieldType.NUMBER).description("현재 로그인 사용자 ID"),
                                fieldWithPath("data.email").type(JsonFieldType.STRING).description("현재 로그인 사용자 이메일"),
                                fieldWithPath("data.nickname").type(JsonFieldType.STRING).description("현재 로그인 사용자 닉네임")
                        )
                ));
    }
}
