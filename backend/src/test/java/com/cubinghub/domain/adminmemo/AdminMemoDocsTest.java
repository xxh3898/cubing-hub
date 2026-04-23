package com.cubinghub.domain.adminmemo;

import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.headers.HeaderDocumentation.requestHeaders;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.patch;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.adminmemo.entity.AdminMemo;
import com.cubinghub.domain.adminmemo.repository.AdminMemoRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.RestDocsIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;

class AdminMemoDocsTest extends RestDocsIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AdminMemoRepository adminMemoRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("관리자는 메모 목록을 조회할 수 있다")
    void should_get_admin_memo_list_when_admin_requests_memos() throws Exception {
        User adminUser = saveAdmin("docs-memo-admin@cubinghub.com", "DocsMemoAdmin");
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
        adminMemoRepository.save(AdminMemo.builder()
                .question("메모 질문")
                .answer("메모 답변")
                .build());
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/admin/memos")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("page", "1")
                        .param("size", "8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andDo(document("admin-memo/list",
                        requestHeaders(
                                headerWithName("Authorization").description("관리자 Access Token을 담은 Bearer 인증 헤더")
                        ),
                        queryParameters(
                                parameterWithName("page").optional().description("조회할 페이지 번호"),
                                parameterWithName("size").optional().description("페이지당 항목 수")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("관리자 메모 페이지"),
                                fieldWithPath("data.items").type(JsonFieldType.ARRAY).description("메모 목록"),
                                fieldWithPath("data.items[].id").type(JsonFieldType.NUMBER).description("메모 ID"),
                                fieldWithPath("data.items[].question").type(JsonFieldType.STRING).description("질문"),
                                fieldWithPath("data.items[].answer").type(JsonFieldType.STRING).description("답변").optional(),
                                fieldWithPath("data.items[].answerStatus").type(JsonFieldType.STRING).description("답변 상태"),
                                fieldWithPath("data.items[].createdAt").type(JsonFieldType.STRING).description("생성 시각"),
                                fieldWithPath("data.items[].updatedAt").type(JsonFieldType.STRING).description("수정 시각"),
                                fieldWithPath("data.items[].answeredAt").type(JsonFieldType.STRING).description("답변 시각").optional(),
                                fieldWithPath("data.page").type(JsonFieldType.NUMBER).description("현재 페이지"),
                                fieldWithPath("data.size").type(JsonFieldType.NUMBER).description("페이지 크기"),
                                fieldWithPath("data.totalElements").type(JsonFieldType.NUMBER).description("전체 메모 수"),
                                fieldWithPath("data.totalPages").type(JsonFieldType.NUMBER).description("전체 페이지 수"),
                                fieldWithPath("data.hasNext").type(JsonFieldType.BOOLEAN).description("다음 페이지 존재 여부"),
                                fieldWithPath("data.hasPrevious").type(JsonFieldType.BOOLEAN).description("이전 페이지 존재 여부")
                        )
                ));
    }

    @Test
    @DisplayName("관리자는 메모를 생성할 수 있다")
    void should_create_admin_memo_when_admin_submits_valid_request() throws Exception {
        User adminUser = saveAdmin("docs-memo-create-admin@cubinghub.com", "DocsMemoCreateAdmin");
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);

        mockMvc.perform(post("/api/admin/memos")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "question", "지금 무슨 작업을 하고 있나요?",
                                "answer", "관리자 Q&A 기능을 구현하고 있습니다."
                        ))))
                .andExpect(status().isCreated())
                .andDo(document("admin-memo/create",
                        requestHeaders(
                                headerWithName("Authorization").description("관리자 Access Token을 담은 Bearer 인증 헤더")
                        ),
                        requestFields(
                                fieldWithPath("question").type(JsonFieldType.STRING).description("메모 질문"),
                                fieldWithPath("answer").type(JsonFieldType.STRING).description("메모 답변").optional()
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("생성된 메모 정보"),
                                fieldWithPath("data.id").type(JsonFieldType.NUMBER).description("생성된 메모 ID")
                        )
                ));
    }

    @Test
    @DisplayName("관리자는 메모 상세를 조회할 수 있다")
    void should_get_admin_memo_detail_when_admin_requests_memo_detail() throws Exception {
        User adminUser = saveAdmin("docs-memo-detail-admin@cubinghub.com", "DocsMemoDetailAdmin");
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
        AdminMemo memo = adminMemoRepository.save(AdminMemo.builder()
                .question("상세 메모 질문")
                .answer("상세 메모 답변")
                .build());
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/admin/memos/{memoId}", memo.getId())
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andDo(document("admin-memo/detail",
                        requestHeaders(
                                headerWithName("Authorization").description("관리자 Access Token을 담은 Bearer 인증 헤더")
                        ),
                        pathParameters(
                                parameterWithName("memoId").description("조회할 메모 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("관리자 메모 상세"),
                                fieldWithPath("data.id").type(JsonFieldType.NUMBER).description("메모 ID"),
                                fieldWithPath("data.question").type(JsonFieldType.STRING).description("메모 질문"),
                                fieldWithPath("data.answer").type(JsonFieldType.STRING).description("메모 답변").optional(),
                                fieldWithPath("data.answerStatus").type(JsonFieldType.STRING).description("답변 상태"),
                                fieldWithPath("data.createdAt").type(JsonFieldType.STRING).description("생성 시각"),
                                fieldWithPath("data.updatedAt").type(JsonFieldType.STRING).description("수정 시각"),
                                fieldWithPath("data.answeredAt").type(JsonFieldType.STRING).description("답변 시각").optional()
                        )
                ));
    }

    @Test
    @DisplayName("관리자는 메모를 수정할 수 있다")
    void should_update_admin_memo_when_admin_submits_valid_update_request() throws Exception {
        User adminUser = saveAdmin("docs-memo-update-admin@cubinghub.com", "DocsMemoUpdateAdmin");
        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
        AdminMemo memo = adminMemoRepository.save(AdminMemo.builder()
                .question("수정 전 질문")
                .answer(null)
                .build());
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(patch("/api/admin/memos/{memoId}", memo.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "question", "수정 후 질문",
                                "answer", "수정 후 답변"
                        ))))
                .andExpect(status().isOk())
                .andDo(document("admin-memo/update",
                        requestHeaders(
                                headerWithName("Authorization").description("관리자 Access Token을 담은 Bearer 인증 헤더")
                        ),
                        pathParameters(
                                parameterWithName("memoId").description("수정할 메모 ID")
                        ),
                        requestFields(
                                fieldWithPath("question").type(JsonFieldType.STRING).description("수정할 메모 질문"),
                                fieldWithPath("answer").type(JsonFieldType.STRING).description("수정할 메모 답변").optional()
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("업데이트된 관리자 메모 상세"),
                                fieldWithPath("data.id").type(JsonFieldType.NUMBER).description("메모 ID"),
                                fieldWithPath("data.question").type(JsonFieldType.STRING).description("메모 질문"),
                                fieldWithPath("data.answer").type(JsonFieldType.STRING).description("메모 답변").optional(),
                                fieldWithPath("data.answerStatus").type(JsonFieldType.STRING).description("답변 상태"),
                                fieldWithPath("data.createdAt").type(JsonFieldType.STRING).description("생성 시각"),
                                fieldWithPath("data.updatedAt").type(JsonFieldType.STRING).description("수정 시각"),
                                fieldWithPath("data.answeredAt").type(JsonFieldType.STRING).description("답변 시각").optional()
                        )
                ));
    }

    private User saveAdmin(String email, String nickname) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(UserRole.ROLE_ADMIN)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
    }
}
