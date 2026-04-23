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
        @Index(name = "idx_record_user_created_at", columnList = "user_id, created_at")
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

    @Builder
    public Record(User user, EventType eventType, Integer timeMs, Penalty penalty, String scramble) {
        this.user = user;
        this.eventType = eventType;
        this.timeMs = timeMs;
        this.penalty = penalty;
        this.scramble = scramble;
    }

    public void updatePenalty(Penalty penalty) {
        this.penalty = penalty;
    }

    public Integer getEffectiveTimeMs() {
        return penalty.applyTo(timeMs);
    }
}
