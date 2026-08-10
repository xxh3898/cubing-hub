package com.cubinghub.domain.record.entity;

import com.cubinghub.common.BaseTimeEntity;
import com.cubinghub.domain.user.entity.User;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "records", indexes = {
        @Index(name = "idx_record_event_time", columnList = "event_type, time_ms"),
        @Index(name = "idx_record_user_created_at", columnList = "user_id, created_at"),
        @Index(name = "idx_record_user_event_created_at_id", columnList = "user_id, event_type, created_at, id")
}, uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_record_user_client_submission",
                columnNames = {"user_id", "client_submission_id"}
        )
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Record extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_record_user"))
    private User user;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventType eventType;

    @NotNull
    @Positive
    @Column(nullable = false)
    private Integer timeMs;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Penalty penalty;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String scramble;

    @Convert(converter = InputMethodConverter.class)
    @Column(name = "input_method", length = 32)
    private InputMethod inputMethod;

    @Column(name = "client_submission_id", columnDefinition = "CHAR(36)", length = 36)
    private String clientSubmissionId;

    @Column(name = "client_submission_payload_hash", columnDefinition = "BINARY(32)", length = 32)
    private byte[] clientSubmissionPayloadHash;

    @Builder
    public Record(
            User user,
            EventType eventType,
            Integer timeMs,
            Penalty penalty,
            String scramble,
            InputMethod inputMethod,
            String clientSubmissionId,
            byte[] clientSubmissionPayloadHash
    ) {
        this.user = user;
        this.eventType = eventType;
        this.timeMs = timeMs;
        this.penalty = penalty;
        this.scramble = scramble;
        this.inputMethod = inputMethod;
        this.clientSubmissionId = clientSubmissionId;
        this.clientSubmissionPayloadHash = clientSubmissionPayloadHash == null
                ? null
                : clientSubmissionPayloadHash.clone();
    }

    public void updatePenalty(Penalty penalty) {
        this.penalty = penalty;
    }

    public Integer getEffectiveTimeMs() {
        return penalty.applyTo(timeMs);
    }

    public InputMethod getInputMethod() {
        return inputMethod == null ? InputMethod.UNKNOWN : inputMethod;
    }

    public byte[] getClientSubmissionPayloadHash() {
        return clientSubmissionPayloadHash == null ? null : clientSubmissionPayloadHash.clone();
    }
}
