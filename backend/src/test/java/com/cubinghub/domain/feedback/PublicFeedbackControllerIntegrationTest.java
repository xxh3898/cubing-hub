package com.cubinghub.domain.feedback;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
import com.cubinghub.domain.feedback.repository.FeedbackRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("PublicFeedbackController 통합 테스트")
class PublicFeedbackControllerIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("should_return_only_public_answered_feedbacks_when_public_qna_list_is_requested")
    void should_return_only_public_answered_feedbacks_when_public_qna_list_is_requested() throws Exception {
        User submitter = saveUser("qna-user@cubinghub.com", "QnaUser");
        User adminUser = saveAdmin("qna-admin@cubinghub.com", "QnaAdmin");

        Feedback publicFeedback = feedbackRepository.save(Feedback.builder()
                .user(submitter)
                .type(FeedbackType.BUG)
                .title("공개 질문")
                .replyEmail("reply@cubinghub.com")
                .content("공개 질문 내용")
                .build());
        publicFeedback.updateAnswer(adminUser, "공개 답변", Instant.parse("2026-04-23T11:05:20Z"));
        publicFeedback.updateVisibility(FeedbackVisibility.PUBLIC, Instant.parse("2026-04-23T11:10:35Z"));

        Feedback privateFeedback = feedbackRepository.save(Feedback.builder()
                .user(submitter)
                .type(FeedbackType.FEATURE)
                .title("비공개 질문")
                .replyEmail("reply@cubinghub.com")
                .content("비공개 질문 내용")
                .build());
        privateFeedback.updateAnswer(adminUser, "비공개 답변", Instant.parse("2026-04-23T11:15:20Z"));

        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/qna")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("공개 질문 목록을 조회했습니다."))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].title").value("공개 질문"))
                .andExpect(jsonPath("$.data.items[0].questionerLabel").value("사용자"))
                .andExpect(jsonPath("$.data.items[0].answererLabel").value("관리자"));
    }

    @Test
    @DisplayName("should_return_public_feedback_detail_when_public_qna_detail_is_requested")
    void should_return_public_feedback_detail_when_public_qna_detail_is_requested() throws Exception {
        User submitter = saveUser("qna-detail-user@cubinghub.com", "QnaDetailUser");
        User adminUser = saveAdmin("qna-detail-admin@cubinghub.com", "QnaDetailAdmin");

        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .user(submitter)
                .type(FeedbackType.OTHER)
                .title("상세 공개 질문")
                .replyEmail("reply@cubinghub.com")
                .content("상세 공개 질문 내용")
                .build());
        feedback.updateAnswer(adminUser, "상세 공개 답변", Instant.parse("2026-04-23T11:20:10Z"));
        feedback.updateVisibility(FeedbackVisibility.PUBLIC, Instant.parse("2026-04-23T11:25:45Z"));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/qna/{feedbackId}", feedback.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("공개 질문 상세를 조회했습니다."))
                .andExpect(jsonPath("$.data.title").value("상세 공개 질문"))
                .andExpect(jsonPath("$.data.answer").value("상세 공개 답변"))
                .andExpect(jsonPath("$.data.questionerLabel").value("사용자"))
                .andExpect(jsonPath("$.data.answererLabel").value("관리자"));

        Feedback foundFeedback = feedbackRepository.findById(feedback.getId()).orElseThrow();
        assertThat(foundFeedback.getReplyEmail()).isEqualTo("reply@cubinghub.com");
    }

    @Test
    @DisplayName("should_return_not_found_when_private_feedback_detail_is_requested_from_public_qna")
    void should_return_not_found_when_private_feedback_detail_is_requested_from_public_qna() throws Exception {
        User submitter = saveUser("qna-private-user@cubinghub.com", "QnaPrivateUser");

        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .user(submitter)
                .type(FeedbackType.BUG)
                .title("비공개 질문")
                .replyEmail("reply@cubinghub.com")
                .content("비공개 질문 내용")
                .build());
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/qna/{feedbackId}", feedback.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("공개된 질문을 찾을 수 없습니다."));
    }

    private User saveUser(String email, String nickname) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
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
