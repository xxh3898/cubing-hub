package com.cubinghub.domain.record;

import com.cubinghub.common.BaseTimeEntity;
import com.cubinghub.domain.user.User;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Builder
@AllArgsConstructor
@Table(name = "user_pbs", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_event", columnNames = {"user_id", "event_type"})
}, indexes = {
        @Index(name = "idx_event_best_time", columnList = "event_type, best_time_ms"),
        @Index(name = "idx_user_pb_record_id", columnList = "record_id")
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPB extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_user_pb_user"))
    private User user;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventType eventType;

    @NotNull
    @Positive
    @Column(nullable = false)
    private Integer bestTimeMs;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "record_id", nullable = false, foreignKey = @ForeignKey(name = "fk_user_pb_record"))
    @NotNull
    private Record record;


    public void updateBestTime(Integer bestTimeMs, Record record) {
        this.bestTimeMs = bestTimeMs;
        this.record = record;
    }
}
