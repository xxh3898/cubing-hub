package com.cubinghub.domain.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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

    @Test
    @DisplayName("관리자 필터가 없으면 전체 관리자 피드백 목록 조회를 위임한다")
    void should_delegate_to_find_all_by_when_admin_filters_are_not_provided() {
        when(feedbackRepository.findAllBy(PageRequest.of(0, 10, org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Order.desc("createdAt"),
                org.springframework.data.domain.Sort.Order.desc("id")
        )))).thenReturn(new PageImpl<>(java.util.List.of()));

        feedbackService.getAdminFeedbacks(null, null, 1, 10);

        verify(feedbackRepository).findAllBy(PageRequest.of(0, 10, org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Order.desc("createdAt"),
                org.springframework.data.domain.Sort.Order.desc("id")
        )));
    }

    @Test
    @DisplayName("visibility만 있으면 visibility 조건 관리자 피드백 목록 조회를 위임한다")
    void should_delegate_to_find_by_visibility_when_only_visibility_filter_is_provided() {
        when(feedbackRepository.findByVisibility(eq(FeedbackVisibility.PUBLIC), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(java.util.List.of()));

        feedbackService.getAdminFeedbacks(null, FeedbackVisibility.PUBLIC, 1, 10);

        verify(feedbackRepository).findByVisibility(eq(FeedbackVisibility.PUBLIC), any(PageRequest.class));
    }

    @Test
    @DisplayName("answered만 있으면 answered 조건 관리자 피드백 목록 조회를 위임한다")
    void should_delegate_to_answered_filter_when_only_answered_filter_is_provided() {
        when(feedbackRepository.findByAnswerIsNotNull(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(java.util.List.of()));

        feedbackService.getAdminFeedbacks(true, null, 1, 10);

        verify(feedbackRepository).findByAnswerIsNotNull(any(PageRequest.class));
    }

    @Test
    @DisplayName("answered와 visibility가 모두 있으면 조합 조건 관리자 피드백 목록 조회를 위임한다")
    void should_delegate_to_answered_and_visibility_filter_when_both_filters_are_provided() {
        when(feedbackRepository.findByAnswerIsNullAndVisibility(eq(FeedbackVisibility.PRIVATE), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(java.util.List.of()));

        feedbackService.getAdminFeedbacks(false, FeedbackVisibility.PRIVATE, 1, 10);

        verify(feedbackRepository).findByAnswerIsNullAndVisibility(eq(FeedbackVisibility.PRIVATE), any(PageRequest.class));
    }

    @Test
    @DisplayName("page size가 허용 범위를 벗어나면 공개 피드백 목록 조회는 실패한다")
    void should_throw_illegal_argument_exception_when_public_feedback_page_size_is_invalid() {
        Throwable thrown = catchThrowable(() -> feedbackService.getPublicFeedbacks(1, 101));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
    }

    @Test
    @DisplayName("page가 1보다 작으면 공개 피드백 목록 조회는 실패한다")
    void should_throw_illegal_argument_exception_when_public_feedback_page_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> feedbackService.getPublicFeedbacks(0, 10));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("잘못된 페이지 번호입니다.");
    }

    @Test
    @DisplayName("size가 1보다 작으면 공개 피드백 목록 조회는 실패한다")
    void should_throw_illegal_argument_exception_when_public_feedback_page_size_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> feedbackService.getPublicFeedbacks(1, 0));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
    }

    @Test
    @DisplayName("답변되지 않은 공개 피드백 상세 조회는 404 예외를 던진다")
    void should_throw_not_found_exception_when_public_feedback_is_unanswered() {
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.BUG)
                .title("질문")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();
        feedback.updateVisibility(FeedbackVisibility.PUBLIC, java.time.LocalDateTime.now());
        when(feedbackRepository.findById(3L)).thenReturn(Optional.of(feedback));

        Throwable thrown = catchThrowable(() -> feedbackService.getPublicFeedbackDetail(3L));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("공개된 질문을 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("관리자가 아니면 답변 저장은 403 예외를 던진다")
    void should_throw_forbidden_exception_when_non_admin_updates_feedback_answer() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

        Throwable thrown = catchThrowable(() -> feedbackService.updateAnswer(1L, user.getEmail(), "답변"));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("접근 권한이 없습니다.");
    }

    @Test
    @DisplayName("관리자는 PRIVATE visibility로 피드백 공개 상태를 변경할 수 있다")
    void should_update_visibility_when_admin_sets_feedback_to_private() {
        User admin = TestFixtures.createUser(9L, "admin@cubinghub.com", "Admin", UserRole.ROLE_ADMIN, UserStatus.ACTIVE);
        Feedback feedback = Feedback.builder()
                .user(TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE))
                .type(FeedbackType.BUG)
                .title("질문")
                .replyEmail("reply@cubinghub.com")
                .content("내용")
                .build();
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(feedbackRepository.findWithUserById(1L)).thenReturn(Optional.of(feedback));

        assertThat(feedbackService.updateVisibility(1L, admin.getEmail(), FeedbackVisibility.PRIVATE).getVisibility())
                .isEqualTo(FeedbackVisibility.PRIVATE);
    }

    @Test
    @DisplayName("answered만 false이면 미답변 관리자 피드백 목록 조회를 위임한다")
    void should_delegate_to_unanswered_filter_when_only_answered_false_is_provided() {
        when(feedbackRepository.findByAnswerIsNull(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(java.util.List.of()));

        feedbackService.getAdminFeedbacks(false, null, 1, 10);

        verify(feedbackRepository).findByAnswerIsNull(any(PageRequest.class));
    }

    @Test
    @DisplayName("존재하지 않는 피드백 알림 성공 처리 요청은 404 예외를 던진다")
    void should_throw_not_found_exception_when_feedback_is_missing_for_notification_success() {
        when(feedbackRepository.findById(7L)).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() ->
                feedbackService.markNotificationSuccess(7L, java.time.LocalDateTime.of(2026, 4, 24, 14, 0, 0))
        );

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("피드백을 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("존재하지 않는 관리자 피드백 상세 조회는 404 예외를 던진다")
    void should_throw_not_found_exception_when_admin_feedback_detail_is_missing() {
        when(feedbackRepository.findWithUserById(99L)).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> feedbackService.getAdminFeedbackDetail(99L));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("피드백을 찾을 수 없습니다.");
    }

}
