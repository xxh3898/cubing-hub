package com.cubinghub.domain.feedback;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.headers.HeaderDocumentation.requestHeaders;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.notification.DiscordFeedbackNotifier;
import com.cubinghub.domain.feedback.notification.FeedbackNotificationAttemptResult;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.RestDocsIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;

class FeedbackDocsTest extends RestDocsIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private DiscordFeedbackNotifier discordFeedbackNotifier;

    @Test
    @DisplayName("로그인 사용자는 피드백을 생성할 수 있다")
    void should_create_feedback_when_request_is_valid() throws Exception {
        User savedUser = userRepository.save(User.builder()
                .email("feedback-docs@cubinghub.com")
                .password("password")
                .nickname("FeedbackDocsUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, savedUser);
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.BUG, "버그 제보", "reply@cubinghub.com", "상세 내용");
        when(discordFeedbackNotifier.send(any(Feedback.class)))
                .thenReturn(FeedbackNotificationAttemptResult.success(Instant.parse("2026-04-22T21:15:10Z")));

        mockMvc.perform(post("/api/feedbacks")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.message").value("피드백이 접수되었습니다. 감사합니다!"))
                .andDo(document("feedback/create",
                        requestHeaders(
                                headerWithName("Authorization").description("Access Token을 담은 Bearer 인증 헤더")
                        ),
                        requestFields(
                                fieldWithPath("type").description("피드백 종류 (`BUG`, `FEATURE`, `UX`, `OTHER`)"),
                                fieldWithPath("title").description("피드백 제목"),
                                fieldWithPath("replyEmail").description("회신 받을 이메일 주소"),
                                fieldWithPath("content").description("피드백 상세 내용")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("생성된 피드백 정보"),
                                fieldWithPath("data.id").type(JsonFieldType.NUMBER).description("생성된 피드백 ID")
                        )
                ));
    }

    @Test
    @DisplayName("유효하지 않은 피드백 생성 요청이면 400을 반환한다")
    void should_return_bad_request_when_feedback_request_is_invalid() throws Exception {
        User savedUser = userRepository.save(User.builder()
                .email("feedback-invalid@cubinghub.com")
                .password("password")
                .nickname("FeedbackInvalidUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, savedUser);
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.BUG, "제목", "invalid-email", "상세 내용");

        mockMvc.perform(post("/api/feedbacks")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("feedback/create/bad-request",
                        requestHeaders(
                                headerWithName("Authorization").description("Access Token을 담은 Bearer 인증 헤더")
                        ),
                        requestFields(
                                fieldWithPath("type").description("피드백 종류 (`BUG`, `FEATURE`, `UX`, `OTHER`)"),
                                fieldWithPath("title").description("피드백 제목"),
                                fieldWithPath("replyEmail").description("회신 받을 이메일 주소"),
                                fieldWithPath("content").description("피드백 상세 내용")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
    }

    @Test
    @DisplayName("Authorization 헤더 없이 피드백 생성을 요청하면 401을 반환한다")
    void should_return_unauthorized_when_authorization_header_is_missing() throws Exception {
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.BUG, "버그 제보", "reply@cubinghub.com", "상세 내용");

        mockMvc.perform(post("/api/feedbacks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("feedback/create/unauthorized",
                        requestFields(
                                fieldWithPath("type").description("피드백 종류 (`BUG`, `FEATURE`, `UX`, `OTHER`)"),
                                fieldWithPath("title").description("피드백 제목"),
                                fieldWithPath("replyEmail").description("회신 받을 이메일 주소"),
                                fieldWithPath("content").description("피드백 상세 내용")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
    }

}
