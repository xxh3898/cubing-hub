package com.cubinghub.domain.feedback.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.dto.response.FeedbackSubmissionResponse;
import com.cubinghub.domain.feedback.entity.FeedbackType;
import com.cubinghub.domain.feedback.service.FeedbackNotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

@ExtendWith(MockitoExtension.class)
@DisplayName("FeedbackController 단위 테스트")
class FeedbackControllerTest {

    @Mock
    private FeedbackNotificationService feedbackNotificationService;

    @Test
    @DisplayName("인증 사용자가 피드백을 생성하면 username을 서비스에 전달한다")
    void should_pass_authenticated_username_when_user_details_exist() {
        FeedbackController controller = new FeedbackController(feedbackNotificationService);
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.BUG, "제목", "reply@cubinghub.com", "내용");
        UserDetails userDetails = User.withUsername("user@cubinghub.com").password("password").authorities("ROLE_USER").build();
        when(feedbackNotificationService.createFeedbackAndNotify("user@cubinghub.com", request))
                .thenReturn(new FeedbackSubmissionResponse(1L));

        ResponseEntity<ApiResponse<FeedbackSubmissionResponse>> response = controller.createFeedback(userDetails, request);

        verify(feedbackNotificationService).createFeedbackAndNotify("user@cubinghub.com", request);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).hasToString("/api/feedbacks/1");
        assertThat(response.getBody().getMessage()).isEqualTo("피드백이 접수되었습니다. 감사합니다!");
    }

    @Test
    @DisplayName("principal이 없으면 null username으로 서비스에 전달한다")
    void should_pass_null_username_when_user_details_are_missing() {
        FeedbackController controller = new FeedbackController(feedbackNotificationService);
        FeedbackCreateRequest request = new FeedbackCreateRequest(FeedbackType.FEATURE, "제목", "reply@cubinghub.com", "내용");
        when(feedbackNotificationService.createFeedbackAndNotify(null, request))
                .thenReturn(new FeedbackSubmissionResponse(2L));

        ResponseEntity<ApiResponse<FeedbackSubmissionResponse>> response = controller.createFeedback(null, request);

        verify(feedbackNotificationService).createFeedbackAndNotify(null, request);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getData().getId()).isEqualTo(2L);
        assertThat(response.getBody().getMessage()).isEqualTo("피드백이 접수되었습니다. 감사합니다!");
    }
}
