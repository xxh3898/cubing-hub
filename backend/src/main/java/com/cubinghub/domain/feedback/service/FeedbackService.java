package com.cubinghub.domain.feedback.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.feedback.dto.response.AdminFeedbackDetailResponse;
import com.cubinghub.domain.feedback.dto.response.AdminFeedbackListItemResponse;
import com.cubinghub.domain.feedback.dto.response.AdminFeedbackPageResponse;
import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.dto.response.PublicFeedbackDetailResponse;
import com.cubinghub.domain.feedback.dto.response.PublicFeedbackListItemResponse;
import com.cubinghub.domain.feedback.dto.response.PublicFeedbackPageResponse;
import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
import com.cubinghub.domain.feedback.repository.FeedbackRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.repository.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
    private final Clock clock;

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

    @Transactional
    public Feedback markNotificationSuccess(Long feedbackId, Instant attemptedAt) {
        Feedback feedback = findFeedbackById(feedbackId);
        feedback.markNotificationSuccess(attemptedAt);
        return feedback;
    }

    @Transactional
    public Feedback markNotificationFailure(Long feedbackId, Instant attemptedAt, String errorMessage) {
        Feedback feedback = findFeedbackById(feedbackId);
        feedback.markNotificationFailure(attemptedAt, errorMessage);
        return feedback;
    }

    public AdminFeedbackPageResponse getAdminFeedbacks(Boolean answered, FeedbackVisibility visibility, Integer page, Integer size) {
        validatePageRequest(page, size);

        PageRequest pageRequest = PageRequest.of(page - 1, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        Page<Feedback> feedbackPage = findAdminFeedbackPage(answered, visibility, pageRequest);
        List<AdminFeedbackListItemResponse> items = feedbackPage.getContent().stream()
                .map(AdminFeedbackListItemResponse::from)
                .toList();

        return new AdminFeedbackPageResponse(
                items,
                page,
                size,
                feedbackPage.getTotalElements(),
                feedbackPage.getTotalPages(),
                feedbackPage.hasNext(),
                feedbackPage.hasPrevious()
        );
    }

    public AdminFeedbackDetailResponse getAdminFeedbackDetail(Long feedbackId) {
        return AdminFeedbackDetailResponse.from(getFeedbackWithUser(feedbackId));
    }

    @Transactional
    public AdminFeedbackDetailResponse updateAnswer(Long feedbackId, String adminEmail, String answer) {
        User adminUser = findAdminUser(adminEmail);
        Feedback feedback = getFeedbackWithUser(feedbackId);
        feedback.updateAnswer(adminUser, answer, Instant.now(clock));
        return AdminFeedbackDetailResponse.from(feedback);
    }

    @Transactional
    public AdminFeedbackDetailResponse updateVisibility(Long feedbackId, String adminEmail, FeedbackVisibility visibility) {
        findAdminUser(adminEmail);
        Feedback feedback = getFeedbackWithUser(feedbackId);

        if (visibility == FeedbackVisibility.PUBLIC && !feedback.isAnswered()) {
            throw new IllegalStateException("답변이 등록된 피드백만 공개할 수 있습니다.");
        }

        feedback.updateVisibility(visibility, Instant.now(clock));
        return AdminFeedbackDetailResponse.from(feedback);
    }

    public PublicFeedbackPageResponse getPublicFeedbacks(Integer page, Integer size) {
        validatePageRequest(page, size);

        PageRequest pageRequest = PageRequest.of(page - 1, size, Sort.by(Sort.Order.desc("publishedAt"), Sort.Order.desc("id")));
        Page<Feedback> feedbackPage = feedbackRepository.findByVisibilityAndAnswerIsNotNull(FeedbackVisibility.PUBLIC, pageRequest);
        List<PublicFeedbackListItemResponse> items = feedbackPage.getContent().stream()
                .map(PublicFeedbackListItemResponse::from)
                .toList();

        return new PublicFeedbackPageResponse(
                items,
                page,
                size,
                feedbackPage.getTotalElements(),
                feedbackPage.getTotalPages(),
                feedbackPage.hasNext(),
                feedbackPage.hasPrevious()
        );
    }

    public PublicFeedbackDetailResponse getPublicFeedbackDetail(Long feedbackId) {
        Feedback feedback = findPublicFeedbackById(feedbackId);
        return PublicFeedbackDetailResponse.from(feedback);
    }

    private User findUser(String email) {
        if (!StringUtils.hasText(email)) {
            throw new CustomApiException("인증이 필요합니다.", HttpStatus.UNAUTHORIZED);
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));
    }

    private User findAdminUser(String email) {
        User user = findUser(email);

        if (user.getRole() != UserRole.ROLE_ADMIN) {
            throw new CustomApiException("접근 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }

        return user;
    }

    private Feedback findFeedbackById(Long feedbackId) {
        return feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new CustomApiException("피드백을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private Feedback findPublicFeedbackById(Long feedbackId) {
        Feedback feedback = findFeedbackById(feedbackId);

        if (feedback.getVisibility() != FeedbackVisibility.PUBLIC || !feedback.isAnswered()) {
            throw new CustomApiException("공개된 질문을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
        }

        return feedback;
    }

    private void validatePageRequest(Integer page, Integer size) {
        if (page < 1) {
            throw new IllegalArgumentException("잘못된 페이지 번호입니다.");
        }

        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
        }
    }

    private Page<Feedback> findAdminFeedbackPage(Boolean answered, FeedbackVisibility visibility, PageRequest pageRequest) {
        if (answered == null && visibility == null) {
            return feedbackRepository.findAllBy(pageRequest);
        }

        if (answered == null) {
            return feedbackRepository.findByVisibility(visibility, pageRequest);
        }

        if (visibility == null) {
            return answered
                    ? feedbackRepository.findByAnswerIsNotNull(pageRequest)
                    : feedbackRepository.findByAnswerIsNull(pageRequest);
        }

        return answered
                ? feedbackRepository.findByAnswerIsNotNullAndVisibility(visibility, pageRequest)
                : feedbackRepository.findByAnswerIsNullAndVisibility(visibility, pageRequest);
    }
}
