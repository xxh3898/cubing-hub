package com.cubinghub.domain.record.dto.request;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class RecordSaveRequest {

    @NotNull(message = "EventType is required")
    private EventType eventType;

    @NotNull(message = "Time(ms) is required")
    @Positive(message = "Time must be positive")
    private Integer timeMs;

    @NotNull(message = "Penalty is required")
    private Penalty penalty;

    @NotBlank(message = "Scramble is required")
    private String scramble;
}
