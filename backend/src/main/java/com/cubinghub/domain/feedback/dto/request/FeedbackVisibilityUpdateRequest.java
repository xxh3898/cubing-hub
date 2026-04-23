package com.cubinghub.domain.feedback.dto.request;

import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackVisibilityUpdateRequest {

    @NotNull
    private FeedbackVisibility visibility;
}
