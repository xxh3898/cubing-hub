package com.cubinghub.domain.record.dto.request;

import com.cubinghub.domain.record.entity.Penalty;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class RecordPenaltyUpdateRequest {

    @NotNull(message = "Penalty is required")
    private Penalty penalty;
}
