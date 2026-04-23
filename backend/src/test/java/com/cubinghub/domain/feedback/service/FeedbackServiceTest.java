package com.cubinghub.domain.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.repository.FeedbackRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.support.TestFixtures;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("FeedbackService 단위 테스트")
class FeedbackServiceTest {

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private UserRepository userRepository;

    private FeedbackService feedbackService;

    @BeforeEach
    void setUp() {
        feedbackService = new FeedbackService(feedbackRepository, userRepository);
    }

    @Test
    @DisplayName("인증 이메일이 없으면 401 예외를 던진다")
    void should_throw_unauthorized_exception_when_email_is_missing() {
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.BUG, "버그 제보", "reply@cubinghub.com", "상세 내용");

        Throwable thrown = catchThrowable(() -> feedbackService.createFeedback(null, request));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("인증이 필요합니다.");
    }

    @Test
    @DisplayName("로그인 사용자의 피드백 생성은 사용자 연관과 함께 저장한다")
    void should_save_feedback_with_default_notification_state_when_email_exists() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.FEATURE, "기능 제안", "reply@cubinghub.com", "상세 내용");
        AtomicReference<Feedback> savedFeedbackRef = new AtomicReference<>();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(invocation -> {
            Feedback feedback = invocation.getArgument(0);
            savedFeedbackRef.set(feedback);
            ReflectionTestUtils.setField(feedback, "id", 2L);
            return feedback;
        });

        Feedback savedFeedback = feedbackService.createFeedback(user.getEmail(), request);

        assertThat(savedFeedback.getId()).isEqualTo(2L);
        assertThat(savedFeedbackRef.get()).isNotNull();
        assertThat(savedFeedbackRef.get().getUser()).isEqualTo(user);
        assertThat(savedFeedbackRef.get().getType()).isEqualTo(FeedbackType.FEATURE);
        assertThat(savedFeedbackRef.get().getReplyEmail()).isEqualTo("reply@cubinghub.com");
        assertThat(savedFeedbackRef.get().getNotificationStatus()).isEqualTo(FeedbackNotificationStatus.PENDING);
        assertThat(savedFeedbackRef.get().getNotificationAttemptCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("인증 이메일이 있지만 사용자가 없으면 401 예외를 던진다")
    void should_throw_unauthorized_exception_when_authenticated_user_does_not_exist() {
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.OTHER, "제목", "reply@cubinghub.com", "내용");
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> feedbackService.createFeedback("missing@cubinghub.com", request));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("사용자를 찾을 수 없습니다.");
    }

}
