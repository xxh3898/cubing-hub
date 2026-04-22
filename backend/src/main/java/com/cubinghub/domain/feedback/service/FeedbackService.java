package com.cubinghub.domain.feedback.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackNotificationStatus;
import com.cubinghub.domain.feedback.repository.FeedbackRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    @Transactional
    public Feedback createFeedback(String email, FeedbackCreateRequest request) {
        return feedbackRepository.save(Feedback.builder()
                .user(findUser(email))
                .type(request.getType())
                .title(request.getTitle())
                .replyEmail(request.getReplyEmail())
                .content(request.getContent())
                .build());
    }

    public Feedback getFeedbackWithUser(Long feedbackId) {
        return feedbackRepository.findWithUserById(feedbackId)
                .orElseThrow(() -> new CustomApiException("피드백을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    public Feedback getFeedbackForRetry(Long feedbackId, String email) {
        User currentUser = findUser(email);
        Feedback feedback = getFeedbackWithUser(feedbackId);

        validateOwnershipOrAdmin(feedback, currentUser);
        validateNotificationRetryAvailable(feedback);
        return feedback;
    }

    @Transactional
    public Feedback markNotificationSuccess(Long feedbackId, LocalDateTime attemptedAt) {
        Feedback feedback = findFeedbackById(feedbackId);
        feedback.markNotificationSuccess(attemptedAt);
        return feedback;
    }

    @Transactional
    public Feedback markNotificationFailure(Long feedbackId, LocalDateTime attemptedAt, String errorMessage) {
        Feedback feedback = findFeedbackById(feedbackId);
        feedback.markNotificationFailure(attemptedAt, errorMessage);
        return feedback;
    }

    private User findUser(String email) {
        if (!StringUtils.hasText(email)) {
            throw new CustomApiException("인증이 필요합니다.", HttpStatus.UNAUTHORIZED);
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));
    }

    private Feedback findFeedbackById(Long feedbackId) {
        return feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new CustomApiException("피드백을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private void validateOwnershipOrAdmin(Feedback feedback, User currentUser) {
        if (currentUser.getRole() == UserRole.ROLE_ADMIN) {
            return;
        }

        if (!feedback.getUser().getId().equals(currentUser.getId())) {
            throw new CustomApiException("피드백 알림 재시도 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
    }

    private void validateNotificationRetryAvailable(Feedback feedback) {
        if (feedback.getNotificationStatus() == FeedbackNotificationStatus.SUCCESS) {
            throw new CustomApiException("이미 Discord 알림 전송을 완료했습니다.", HttpStatus.CONFLICT);
        }
    }
}
