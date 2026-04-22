package com.cubinghub.domain.feedback.entity;

import com.cubinghub.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@Table(name = "feedbacks", indexes = {
        @Index(name = "idx_feedback_user_id", columnList = "user_id"),
        @Index(name = "idx_feedback_type", columnList = "type")
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_feedback_user"))
    private User user;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FeedbackType type;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String title;

    @Email
    @NotBlank
    @Column(name = "reply_email", nullable = false, length = 255)
    private String replyEmail;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "notification_status", nullable = false, length = 20)
    private FeedbackNotificationStatus notificationStatus;

    @NotNull
    @Column(name = "notification_attempt_count", nullable = false)
    private Integer notificationAttemptCount;

    @Column(name = "notification_last_attempt_at")
    private LocalDateTime notificationLastAttemptAt;

    @Column(name = "notification_last_error", length = 500)
    private String notificationLastError;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Feedback(User user, FeedbackType type, String title, String replyEmail, String content) {
        this.user = user;
        this.type = type;
        this.title = title;
        this.replyEmail = replyEmail;
        this.content = content;
        this.notificationStatus = FeedbackNotificationStatus.PENDING;
        this.notificationAttemptCount = 0;
    }

    public void markNotificationSuccess(LocalDateTime attemptedAt) {
        this.notificationStatus = FeedbackNotificationStatus.SUCCESS;
        this.notificationAttemptCount = (this.notificationAttemptCount == null ? 0 : this.notificationAttemptCount) + 1;
        this.notificationLastAttemptAt = attemptedAt;
        this.notificationLastError = null;
    }

    public void markNotificationFailure(LocalDateTime attemptedAt, String errorMessage) {
        this.notificationStatus = FeedbackNotificationStatus.FAILED;
        this.notificationAttemptCount = (this.notificationAttemptCount == null ? 0 : this.notificationAttemptCount) + 1;
        this.notificationLastAttemptAt = attemptedAt;
        this.notificationLastError = abbreviateError(errorMessage);
    }

    public boolean isNotificationRetryAvailable() {
        return this.notificationStatus != FeedbackNotificationStatus.SUCCESS;
    }

    private String abbreviateError(String errorMessage) {
        if (errorMessage == null || errorMessage.length() <= 500) {
            return errorMessage;
        }

        return errorMessage.substring(0, 497) + "...";
    }
}
