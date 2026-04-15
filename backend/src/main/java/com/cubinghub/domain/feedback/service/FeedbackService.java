package com.cubinghub.domain.feedback.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.feedback.dto.request.FeedbackCreateRequest;
import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.repository.FeedbackRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    public Long createFeedback(String email, FeedbackCreateRequest request) {
        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .user(findUser(email))
                .type(request.getType())
                .title(request.getTitle())
                .replyEmail(request.getReplyEmail())
                .content(request.getContent())
                .build());

        return feedback.getId();
    }

    private User findUser(String email) {
        if (!StringUtils.hasText(email)) {
            throw new CustomApiException("인증이 필요합니다.", HttpStatus.UNAUTHORIZED);
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));
    }
}
