package com.cubinghub.domain.feedback.dto.response;

import java.util.List;
import lombok.Getter;

@Getter
public class AdminFeedbackPageResponse {

    private final List<AdminFeedbackListItemResponse> items;
    private final Integer page;
    private final Integer size;
    private final Long totalElements;
    private final Integer totalPages;
    private final boolean hasNext;
    private final boolean hasPrevious;

    public AdminFeedbackPageResponse(
            List<AdminFeedbackListItemResponse> items,
            Integer page,
            Integer size,
            Long totalElements,
            Integer totalPages,
            boolean hasNext,
            boolean hasPrevious
    ) {
        this.items = items;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.hasNext = hasNext;
        this.hasPrevious = hasPrevious;
    }
}
