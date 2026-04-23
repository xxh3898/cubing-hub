package com.cubinghub.domain.adminmemo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.adminmemo.entity.AdminMemo;
import com.cubinghub.domain.adminmemo.repository.AdminMemoRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("AdminMemoController 통합 테스트")
class AdminMemoControllerIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

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

    private String adminAccessToken;
    private String userAccessToken;

    @BeforeEach
    void setUp() {
        User adminUser = saveUser("memo-admin@cubinghub.com", "MemoAdmin", UserRole.ROLE_ADMIN);
        User normalUser = saveUser("memo-user@cubinghub.com", "MemoUser", UserRole.ROLE_USER);
        adminAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
        userAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, normalUser);
    }

    @Test
    @DisplayName("should_create_admin_memo_when_admin_submits_valid_request")
    void should_create_admin_memo_when_admin_submits_valid_request() throws Exception {
        mockMvc.perform(post("/api/admin/memos")
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "question", "지금 어떤 기능을 개발 중인가요?",
                                "answer", "관리자 페이지와 Q&A 공개 화면을 개발 중입니다."
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("관리자 메모를 생성했습니다."))
                .andExpect(jsonPath("$.data.id").exists());

        entityManager.flush();
        entityManager.clear();

        assertThat(adminMemoRepository.findAll()).hasSize(1);
        AdminMemo memo = adminMemoRepository.findAll().get(0);
        assertThat(memo.getQuestion()).isEqualTo("지금 어떤 기능을 개발 중인가요?");
        assertThat(memo.getAnswer()).isEqualTo("관리자 페이지와 Q&A 공개 화면을 개발 중입니다.");
    }

    @Test
    @DisplayName("should_return_admin_memos_sorted_by_updated_at_desc_when_admin_requests_list")
    void should_return_admin_memos_sorted_by_updated_at_desc_when_admin_requests_list() throws Exception {
        AdminMemo olderMemo = adminMemoRepository.save(AdminMemo.builder()
                .question("첫 번째 질문")
                .answer(null)
                .build());
        AdminMemo newerMemo = adminMemoRepository.save(AdminMemo.builder()
                .question("두 번째 질문")
                .answer("두 번째 답변")
                .build());
        olderMemo.update("첫 번째 질문", "나중에 수정된 답변");
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/admin/memos")
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("관리자 메모 목록을 조회했습니다."))
                .andExpect(jsonPath("$.data.items[0].question").value("첫 번째 질문"))
                .andExpect(jsonPath("$.data.items[1].question").value("두 번째 질문"));
    }

    @Test
    @DisplayName("should_update_admin_memo_when_admin_submits_valid_request")
    void should_update_admin_memo_when_admin_submits_valid_request() throws Exception {
        AdminMemo memo = adminMemoRepository.save(AdminMemo.builder()
                .question("업데이트 전 질문")
                .answer(null)
                .build());

        mockMvc.perform(patch("/api/admin/memos/{memoId}", memo.getId())
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "question", "업데이트 후 질문",
                                "answer", "업데이트 후 답변"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("관리자 메모를 수정했습니다."))
                .andExpect(jsonPath("$.data.question").value("업데이트 후 질문"))
                .andExpect(jsonPath("$.data.answer").value("업데이트 후 답변"))
                .andExpect(jsonPath("$.data.answerStatus").value("ANSWERED"));
    }

    @Test
    @DisplayName("should_return_bad_request_when_admin_memo_question_is_blank")
    void should_return_bad_request_when_admin_memo_question_is_blank() throws Exception {
        mockMvc.perform(post("/api/admin/memos")
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "question", "",
                                "answer", "답변"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("잘못된 입력값입니다: 질문은 필수입니다."));
    }

    @Test
    @DisplayName("should_delete_admin_memo_when_admin_requests_deletion")
    void should_delete_admin_memo_when_admin_requests_deletion() throws Exception {
        AdminMemo memo = adminMemoRepository.save(AdminMemo.builder()
                .question("삭제 대상 질문")
                .answer("삭제 대상 답변")
                .build());

        mockMvc.perform(delete("/api/admin/memos/{memoId}", memo.getId())
                        .header("Authorization", "Bearer " + adminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("관리자 메모를 삭제했습니다."));

        entityManager.flush();
        entityManager.clear();

        assertThat(adminMemoRepository.findById(memo.getId())).isEmpty();
    }

    @Test
    @DisplayName("should_return_forbidden_when_non_admin_requests_admin_memo_endpoint")
    void should_return_forbidden_when_non_admin_requests_admin_memo_endpoint() throws Exception {
        mockMvc.perform(get("/api/admin/memos")
                        .header("Authorization", "Bearer " + userAccessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("접근 권한이 없습니다."));
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
}
