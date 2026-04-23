package com.cubinghub.domain.feedback;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.headers.HeaderDocumentation.requestHeaders;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.patch;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
import com.cubinghub.domain.feedback.notification.DiscordFeedbackNotifier;
import com.cubinghub.domain.feedback.repository.FeedbackRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.RestDocsIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;

class FeedbackManagementDocsTest extends RestDocsIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private EntityManager entityManager;

    @MockBean
    private DiscordFeedbackNotifier discordFeedbackNotifier;

    @Test
    @DisplayName("관리자는 피드백 목록을 필터와 함께 조회할 수 있다")
    void should_get_admin_feedback_list_when_admin_requests_filtered_feedbacks() throws Exception {
        User submitter = saveUser("docs-feedback-user@cubinghub.com", "DocsFeedbackUser", UserRole.ROLE_USER);
        User adminUser = saveUser("docs-feedback-admin@cubinghub.com", "DocsFeedbackAdmin", UserRole.ROLE_ADMIN);
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
        Feedback feedback = saveFeedback(submitter, "문서화용 피드백");
        feedback.updateAnswer(adminUser, "관리자 답변", LocalDateTime.of(2026, 4, 23, 12, 5, 30));
        feedback.updateVisibility(FeedbackVisibility.PUBLIC, LocalDateTime.of(2026, 4, 23, 12, 10, 20));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/admin/feedbacks")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("answered", "true")
                        .param("visibility", "PUBLIC")
                        .param("page", "1")
                        .param("size", "8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andDo(document("feedback/admin/list",
                        requestHeaders(
                                headerWithName("Authorization").description("관리자 Access Token을 담은 Bearer 인증 헤더")
                        ),
                        queryParameters(
                                parameterWithName("answered").optional().description("답변 여부 필터"),
                                parameterWithName("visibility").optional().description("공개 여부 필터 (`PRIVATE`, `PUBLIC`)"),
                                parameterWithName("page").optional().description("조회할 페이지 번호"),
                                parameterWithName("size").optional().description("페이지당 항목 수")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("관리자 피드백 페이지"),
                                fieldWithPath("data.items").type(JsonFieldType.ARRAY).description("피드백 목록"),
                                fieldWithPath("data.items[].id").type(JsonFieldType.NUMBER).description("피드백 ID"),
                                fieldWithPath("data.items[].type").type(JsonFieldType.STRING).description("피드백 종류"),
                                fieldWithPath("data.items[].title").type(JsonFieldType.STRING).description("피드백 제목"),
                                fieldWithPath("data.items[].content").type(JsonFieldType.STRING).description("피드백 본문"),
                                fieldWithPath("data.items[].answer").type(JsonFieldType.STRING).description("관리자 답변").optional(),
                                fieldWithPath("data.items[].submitterNickname").type(JsonFieldType.STRING).description("제출자 닉네임"),
                                fieldWithPath("data.items[].notificationStatus").type(JsonFieldType.STRING).description("Discord 운영 알림 상태"),
                                fieldWithPath("data.items[].visibility").type(JsonFieldType.STRING).description("공개 여부"),
                                fieldWithPath("data.items[].answered").type(JsonFieldType.BOOLEAN).description("답변 완료 여부"),
                                fieldWithPath("data.items[].createdAt").type(JsonFieldType.STRING).description("제출 시각"),
                                fieldWithPath("data.items[].answeredAt").type(JsonFieldType.STRING).description("답변 시각").optional(),
                                fieldWithPath("data.page").type(JsonFieldType.NUMBER).description("현재 페이지"),
                                fieldWithPath("data.size").type(JsonFieldType.NUMBER).description("페이지 크기"),
                                fieldWithPath("data.totalElements").type(JsonFieldType.NUMBER).description("전체 피드백 수"),
                                fieldWithPath("data.totalPages").type(JsonFieldType.NUMBER).description("전체 페이지 수"),
                                fieldWithPath("data.hasNext").type(JsonFieldType.BOOLEAN).description("다음 페이지 존재 여부"),
                                fieldWithPath("data.hasPrevious").type(JsonFieldType.BOOLEAN).description("이전 페이지 존재 여부")
                        )
                ));
    }

    @Test
    @DisplayName("관리자는 피드백 상세를 조회할 수 있다")
    void should_get_admin_feedback_detail_when_admin_requests_feedback_detail() throws Exception {
        User submitter = saveUser("docs-feedback-detail-user@cubinghub.com", "DocsFeedbackDetailUser", UserRole.ROLE_USER);
        User adminUser = saveUser("docs-feedback-detail-admin@cubinghub.com", "DocsFeedbackDetailAdmin", UserRole.ROLE_ADMIN);
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
        Feedback feedback = saveFeedback(submitter, "상세 문서화 피드백");
        feedback.updateAnswer(adminUser, "상세 답변", LocalDateTime.of(2026, 4, 23, 12, 12, 10));
        feedback.updateVisibility(FeedbackVisibility.PRIVATE, LocalDateTime.of(2026, 4, 23, 12, 13, 55));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/admin/feedbacks/{feedbackId}", feedback.getId())
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andDo(document("feedback/admin/detail",
                        requestHeaders(
                                headerWithName("Authorization").description("관리자 Access Token을 담은 Bearer 인증 헤더")
                        ),
                        pathParameters(
                                parameterWithName("feedbackId").description("조회할 피드백 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("관리자 피드백 상세"),
                                fieldWithPath("data.id").type(JsonFieldType.NUMBER).description("피드백 ID"),
                                fieldWithPath("data.type").type(JsonFieldType.STRING).description("피드백 종류"),
                                fieldWithPath("data.title").type(JsonFieldType.STRING).description("피드백 제목"),
                                fieldWithPath("data.content").type(JsonFieldType.STRING).description("피드백 본문"),
                                fieldWithPath("data.replyEmail").type(JsonFieldType.STRING).description("회신 이메일 snapshot"),
                                fieldWithPath("data.submitterNickname").type(JsonFieldType.STRING).description("제출자 닉네임"),
                                fieldWithPath("data.notificationStatus").type(JsonFieldType.STRING).description("Discord 운영 알림 상태"),
                                fieldWithPath("data.notificationAttemptCount").type(JsonFieldType.NUMBER).description("Discord 운영 알림 시도 횟수"),
                                fieldWithPath("data.notificationRetryAvailable").type(JsonFieldType.BOOLEAN).description("Discord 운영 알림 재시도 가능 여부"),
                                fieldWithPath("data.visibility").type(JsonFieldType.STRING).description("공개 여부"),
                                fieldWithPath("data.answer").type(JsonFieldType.STRING).description("관리자 답변").optional(),
                                fieldWithPath("data.answered").type(JsonFieldType.BOOLEAN).description("답변 완료 여부"),
                                fieldWithPath("data.createdAt").type(JsonFieldType.STRING).description("제출 시각"),
                                fieldWithPath("data.answeredAt").type(JsonFieldType.STRING).description("답변 시각").optional(),
                                fieldWithPath("data.publishedAt").type(JsonFieldType.STRING).description("공개 시각").optional()
                        )
                ));
    }

    @Test
    @DisplayName("관리자는 피드백 답변을 저장할 수 있다")
    void should_update_feedback_answer_when_admin_submits_answer_request() throws Exception {
        User submitter = saveUser("docs-feedback-answer-user@cubinghub.com", "DocsFeedbackAnswerUser", UserRole.ROLE_USER);
        User adminUser = saveUser("docs-feedback-answer-admin@cubinghub.com", "DocsFeedbackAnswerAdmin", UserRole.ROLE_ADMIN);
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
        Feedback feedback = saveFeedback(submitter, "답변 문서화 피드백");
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(patch("/api/admin/feedbacks/{feedbackId}/answer", feedback.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("answer", "관리자 답변입니다."))))
                .andExpect(status().isOk())
                .andDo(document("feedback/admin/answer",
                        requestHeaders(
                                headerWithName("Authorization").description("관리자 Access Token을 담은 Bearer 인증 헤더")
                        ),
                        pathParameters(
                                parameterWithName("feedbackId").description("답변할 피드백 ID")
                        ),
                        requestFields(
                                fieldWithPath("answer").type(JsonFieldType.STRING).description("관리자 답변 내용")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("업데이트된 관리자 피드백 상세"),
                                fieldWithPath("data.id").type(JsonFieldType.NUMBER).description("피드백 ID"),
                                fieldWithPath("data.type").type(JsonFieldType.STRING).description("피드백 종류"),
                                fieldWithPath("data.title").type(JsonFieldType.STRING).description("피드백 제목"),
                                fieldWithPath("data.content").type(JsonFieldType.STRING).description("피드백 본문"),
                                fieldWithPath("data.replyEmail").type(JsonFieldType.STRING).description("회신 이메일 snapshot"),
                                fieldWithPath("data.submitterNickname").type(JsonFieldType.STRING).description("제출자 닉네임"),
                                fieldWithPath("data.notificationStatus").type(JsonFieldType.STRING).description("Discord 운영 알림 상태"),
                                fieldWithPath("data.notificationAttemptCount").type(JsonFieldType.NUMBER).description("Discord 운영 알림 시도 횟수"),
                                fieldWithPath("data.notificationRetryAvailable").type(JsonFieldType.BOOLEAN).description("Discord 운영 알림 재시도 가능 여부"),
                                fieldWithPath("data.visibility").type(JsonFieldType.STRING).description("공개 여부"),
                                fieldWithPath("data.answer").type(JsonFieldType.STRING).description("관리자 답변"),
                                fieldWithPath("data.answered").type(JsonFieldType.BOOLEAN).description("답변 완료 여부"),
                                fieldWithPath("data.createdAt").type(JsonFieldType.STRING).description("제출 시각"),
                                fieldWithPath("data.answeredAt").type(JsonFieldType.STRING).description("답변 시각"),
                                fieldWithPath("data.publishedAt").type(JsonFieldType.NULL).description("공개 시각")
                        )
                ));
    }

    @Test
    @DisplayName("관리자는 피드백 공개 상태를 변경할 수 있다")
    void should_update_feedback_visibility_when_admin_submits_visibility_request() throws Exception {
        User submitter = saveUser("docs-feedback-visibility-user@cubinghub.com", "DocsFeedbackVisibilityUser", UserRole.ROLE_USER);
        User adminUser = saveUser("docs-feedback-visibility-admin@cubinghub.com", "DocsFeedbackVisibilityAdmin", UserRole.ROLE_ADMIN);
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
        Feedback feedback = saveFeedback(submitter, "공개 문서화 피드백");
        feedback.updateAnswer(adminUser, "공개 답변", LocalDateTime.of(2026, 4, 23, 12, 20, 10));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(patch("/api/admin/feedbacks/{feedbackId}/visibility", feedback.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("visibility", "PUBLIC"))))
                .andExpect(status().isOk())
                .andDo(document("feedback/admin/visibility",
                        requestHeaders(
                                headerWithName("Authorization").description("관리자 Access Token을 담은 Bearer 인증 헤더")
                        ),
                        pathParameters(
                                parameterWithName("feedbackId").description("공개 상태를 변경할 피드백 ID")
                        ),
                        requestFields(
                                fieldWithPath("visibility").type(JsonFieldType.STRING).description("변경할 공개 상태 (`PRIVATE`, `PUBLIC`)")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("업데이트된 관리자 피드백 상세"),
                                fieldWithPath("data.id").type(JsonFieldType.NUMBER).description("피드백 ID"),
                                fieldWithPath("data.type").type(JsonFieldType.STRING).description("피드백 종류"),
                                fieldWithPath("data.title").type(JsonFieldType.STRING).description("피드백 제목"),
                                fieldWithPath("data.content").type(JsonFieldType.STRING).description("피드백 본문"),
                                fieldWithPath("data.replyEmail").type(JsonFieldType.STRING).description("회신 이메일 snapshot"),
                                fieldWithPath("data.submitterNickname").type(JsonFieldType.STRING).description("제출자 닉네임"),
                                fieldWithPath("data.notificationStatus").type(JsonFieldType.STRING).description("Discord 운영 알림 상태"),
                                fieldWithPath("data.notificationAttemptCount").type(JsonFieldType.NUMBER).description("Discord 운영 알림 시도 횟수"),
                                fieldWithPath("data.notificationRetryAvailable").type(JsonFieldType.BOOLEAN).description("Discord 운영 알림 재시도 가능 여부"),
                                fieldWithPath("data.visibility").type(JsonFieldType.STRING).description("공개 여부"),
                                fieldWithPath("data.answer").type(JsonFieldType.STRING).description("관리자 답변"),
                                fieldWithPath("data.answered").type(JsonFieldType.BOOLEAN).description("답변 완료 여부"),
                                fieldWithPath("data.createdAt").type(JsonFieldType.STRING).description("제출 시각"),
                                fieldWithPath("data.answeredAt").type(JsonFieldType.STRING).description("답변 시각"),
                                fieldWithPath("data.publishedAt").type(JsonFieldType.STRING).description("공개 시각")
                        )
                ));
    }

    @Test
    @DisplayName("사용자는 공개 질문 목록을 조회할 수 있다")
    void should_get_public_qna_list_when_public_feedback_exists() throws Exception {
        User submitter = saveUser("docs-public-qna-user@cubinghub.com", "DocsPublicQnaUser", UserRole.ROLE_USER);
        User adminUser = saveUser("docs-public-qna-admin@cubinghub.com", "DocsPublicQnaAdmin", UserRole.ROLE_ADMIN);
        Feedback feedback = saveFeedback(submitter, "공개 질문");
        feedback.updateAnswer(adminUser, "공개 답변", LocalDateTime.of(2026, 4, 23, 12, 22, 30));
        feedback.updateVisibility(FeedbackVisibility.PUBLIC, LocalDateTime.of(2026, 4, 23, 12, 24, 45));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/qna")
                        .param("page", "1")
                        .param("size", "8"))
                .andExpect(status().isOk())
                .andDo(document("qna/list",
                        queryParameters(
                                parameterWithName("page").optional().description("조회할 페이지 번호"),
                                parameterWithName("size").optional().description("페이지당 항목 수")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("공개 질문 페이지"),
                                fieldWithPath("data.items").type(JsonFieldType.ARRAY).description("공개 질문 목록"),
                                fieldWithPath("data.items[].id").type(JsonFieldType.NUMBER).description("피드백 ID"),
                                fieldWithPath("data.items[].type").type(JsonFieldType.STRING).description("피드백 종류"),
                                fieldWithPath("data.items[].title").type(JsonFieldType.STRING).description("질문 제목"),
                                fieldWithPath("data.items[].content").type(JsonFieldType.STRING).description("질문 본문"),
                                fieldWithPath("data.items[].answer").type(JsonFieldType.STRING).description("관리자 답변"),
                                fieldWithPath("data.items[].questionerLabel").type(JsonFieldType.STRING).description("질문자 표시 라벨"),
                                fieldWithPath("data.items[].answererLabel").type(JsonFieldType.STRING).description("답변자 표시 라벨"),
                                fieldWithPath("data.items[].createdAt").type(JsonFieldType.STRING).description("질문 작성 시각"),
                                fieldWithPath("data.items[].answeredAt").type(JsonFieldType.STRING).description("답변 시각"),
                                fieldWithPath("data.items[].publishedAt").type(JsonFieldType.STRING).description("공개 시각"),
                                fieldWithPath("data.page").type(JsonFieldType.NUMBER).description("현재 페이지"),
                                fieldWithPath("data.size").type(JsonFieldType.NUMBER).description("페이지 크기"),
                                fieldWithPath("data.totalElements").type(JsonFieldType.NUMBER).description("전체 질문 수"),
                                fieldWithPath("data.totalPages").type(JsonFieldType.NUMBER).description("전체 페이지 수"),
                                fieldWithPath("data.hasNext").type(JsonFieldType.BOOLEAN).description("다음 페이지 존재 여부"),
                                fieldWithPath("data.hasPrevious").type(JsonFieldType.BOOLEAN).description("이전 페이지 존재 여부")
                        )
                ));
    }

    @Test
    @DisplayName("사용자는 공개 질문 상세를 조회할 수 있다")
    void should_get_public_qna_detail_when_public_feedback_exists() throws Exception {
        User submitter = saveUser("docs-public-qna-detail-user@cubinghub.com", "DocsPublicQnaDetailUser", UserRole.ROLE_USER);
        User adminUser = saveUser("docs-public-qna-detail-admin@cubinghub.com", "DocsPublicQnaDetailAdmin", UserRole.ROLE_ADMIN);
        Feedback feedback = saveFeedback(submitter, "공개 질문 상세");
        feedback.updateAnswer(adminUser, "공개 질문 상세 답변", LocalDateTime.of(2026, 4, 23, 12, 30, 20));
        feedback.updateVisibility(FeedbackVisibility.PUBLIC, LocalDateTime.of(2026, 4, 23, 12, 31, 55));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/qna/{feedbackId}", feedback.getId()))
                .andExpect(status().isOk())
                .andDo(document("qna/detail",
                        pathParameters(
                                parameterWithName("feedbackId").description("조회할 공개 질문 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("공개 질문 상세"),
                                fieldWithPath("data.id").type(JsonFieldType.NUMBER).description("피드백 ID"),
                                fieldWithPath("data.type").type(JsonFieldType.STRING).description("피드백 종류"),
                                fieldWithPath("data.title").type(JsonFieldType.STRING).description("질문 제목"),
                                fieldWithPath("data.content").type(JsonFieldType.STRING).description("질문 본문"),
                                fieldWithPath("data.answer").type(JsonFieldType.STRING).description("관리자 답변"),
                                fieldWithPath("data.questionerLabel").type(JsonFieldType.STRING).description("질문자 표시 라벨"),
                                fieldWithPath("data.answererLabel").type(JsonFieldType.STRING).description("답변자 표시 라벨"),
                                fieldWithPath("data.createdAt").type(JsonFieldType.STRING).description("질문 작성 시각"),
                                fieldWithPath("data.answeredAt").type(JsonFieldType.STRING).description("답변 시각"),
                                fieldWithPath("data.publishedAt").type(JsonFieldType.STRING).description("공개 시각")
                        )
                ));
    }

    private User saveUser(String email, String nickname, UserRole role) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(role)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
    }

    private Feedback saveFeedback(User submitter, String title) {
        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .user(submitter)
                .type(FeedbackType.BUG)
                .title(title)
                .replyEmail("reply@cubinghub.com")
                .content(title + " 본문")
                .build());
        feedback.markNotificationSuccess(LocalDateTime.of(2026, 4, 23, 12, 0, 10));
        return feedback;
    }
}
